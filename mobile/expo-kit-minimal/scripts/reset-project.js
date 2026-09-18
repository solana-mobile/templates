#!/usr/bin/env node

/**
 * Reset the project to a minimal starting point.
 *
 * Keeps everything that wires up the SDK — the crypto polyfills, the wallet seam, the providers and
 * the app config — and deletes the demo built on top of it: the account screens, the network
 * switcher and its read queries, the formatting helpers and the tests that cover them.
 *
 * The switcher goes because `WalletProvider` takes a single cluster, so the reset app holds one
 * in `constants/app-config.ts` instead of a list to pick from.
 *
 * Usage:
 *   npm run reset-project           # lists what it will delete, then asks
 *   npm run reset-project -- --yes  # skip the prompt
 */

const fs = require('node:fs/promises')
const path = require('node:path')
const readline = require('node:readline')

/**
 * The project is the directory this script lives in, never `process.cwd()`.
 *
 * Deriving it from the working directory would aim the deletions at wherever the caller happens to
 * stand — `node mobile/expo-kit-minimal/scripts/reset-project.js` from a repository root would take
 * out that repository's own README and scripts.
 */
const root = path.join(__dirname, '..')

/**
 * Demo code, relative to the project root. Directories are deleted whole.
 *
 * `features` no longer goes entirely — only its demo halves do. `features/account` is the demo
 * screens, and `features/network` is the demo switcher, which goes because `WalletProvider` takes
 * a single cluster and the app config holds one after the reset. `features/wallet` survives: it
 * is platform wiring, not demo code — the same seam the providers below plug into — and the reset
 * app's web build depends on it, so deleting it would strip web support along with the demo.
 *
 * `components` goes whole and is rebuilt from `writtenPaths` below, rather than naming the
 * demo's own components here. Everything in it exists to serve the demo screens except the providers,
 * which the reset writes anyway — so deleting the directory keeps this list correct as the demo grows
 * instead of leaving a new component behind importing something that is gone.
 *
 * `e2e` goes because it drives the demo screens: it presses Connect and Sign Message and asserts on
 * their labels, none of which survive the reset.
 *
 * `scripts` holds this file, so it goes last.
 */
const deletedPaths = ['components', 'e2e', 'features/account', 'features/network', 'test', 'utils', 'scripts']

/**
 * Files the reset writes, overwriting the demo versions where they exist.
 *
 * Listed here so the confirmation can tell them apart from the deletions — a file that comes back
 * with different contents is not the same thing as one that is gone.
 */
const writtenPaths = [
  'constants/app-config.ts',
  'components/app-providers.tsx',
  'components/app-providers.test.tsx',
  'app/index.tsx',
  'README.md',
]

/**
 * Dependencies only the demo features imported.
 *
 * The wallet dependencies — `@wallet-ui/core`, `@wallet-ui/react`, `@solana/react` — are absent on
 * purpose: the surviving seam uses them, and the reset app's own `ci` still runs `web:build`.
 */
const demoDependencies = ['@solana-program/memo']

/** Lockfile to package manager, for when the script is run directly instead of through a script. */
const lockfiles = {
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
  'package-lock.json': 'npm',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
}

function appConfigContent({ cluster, creator, identity }) {
  return `import { ${creator}, SolanaCluster } from '@wallet-ui/core'
import type { AppIdentity } from '@/features/wallet/wallet-types'

export class AppConfig {
  static cluster: SolanaCluster = ${cluster}
  static identity: AppIdentity = ${identity}
}
`
}

const appProvidersContent = `import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { WalletProvider } from '@/features/wallet/wallet-provider'
import { AppConfig } from '@/constants/app-config'

const queryClient = new QueryClient()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider cluster={AppConfig.cluster} identity={AppConfig.identity}>
        {children}
      </WalletProvider>
    </QueryClientProvider>
  )
}
`

const appProvidersTestContent = `import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { describe, expect, it } from 'vitest'
import { AppProviders } from '@/components/app-providers'

describe('AppProviders', () => {
  it('renders its children', async () => {
    const screen = await render(
      <AppProviders>
        <Text>ready</Text>
      </AppProviders>,
    )

    expect(screen.getByText('ready')).toBeTruthy()
  })
})
`

const indexContent = `import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppConfig } from '@/constants/app-config'
import { appStyles } from '@/constants/app-styles'

export default function HomeScreen() {
  // Anywhere below \`AppProviders\`, \`useWallet()\` from '@/features/wallet/use-wallet' gives you
  // the connected account, the RPC client and the sign and send methods — on Android and on web.
  return (
    <SafeAreaView style={appStyles.screen}>
      <View style={appStyles.stack}>
        <Text style={appStyles.title}>{AppConfig.identity.name}</Text>
        <Text>Edit app/index.tsx to start building.</Text>
      </View>
    </SafeAreaView>
  )
}
`

function readmeContent({ name, pm }) {
  return `# ${name}

An [Expo](https://expo.dev) app wired up for Solana on Android and on the web. All wallet access
goes through the seam in \`features/wallet/\`: Mobile Wallet Adapter on Android, wallet-standard
browser wallets on web.

## Getting started

\`\`\`bash
${pm} install
${pm} run android  # needs an Android device or emulator with a wallet app installed
${pm} run web      # needs a browser with a Solana wallet extension
\`\`\`

## What is wired up

- \`index.js\` installs the crypto polyfill on native, then hands off to \`expo-router\`.
- \`constants/app-config.ts\` holds the cluster the app talks to and the identity wallets show on
  approval. Change the cluster there to point somewhere else.
- \`components/app-providers.tsx\` sets up React Query and the seam's \`WalletProvider\`.
- \`features/wallet/\` is the platform seam: \`use-wallet\` and \`wallet-provider\` each have a
  \`.native\` variant backed by Mobile Wallet Adapter and a \`.web\` variant backed by
  wallet-standard wallets, and app code only ever imports the shared facade.
- \`app/index.tsx\` is the home screen — empty, ready for your own code.

## Using the wallet

\`useWallet()\` works anywhere below \`AppProviders\`, on both platforms:

\`\`\`tsx
import { useWallet } from '@/features/wallet/use-wallet'

const { account, chain, client, connect, disconnect, sendTransactions, signIn, signMessages } = useWallet()
\`\`\`

\`account\` is \`undefined\` until a wallet is connected, and \`client.rpc\` is a
[\`@solana/kit\`](https://www.npmjs.com/package/@solana/kit) RPC client pointed at the cluster from
\`app-config.ts\`.

Every call that touches the wallet — \`connect\`, \`signIn\`, \`signMessages\`, \`sendTransactions\` —
asks the user to approve: it launches the wallet app on Android and prompts the browser extension
on web, and rejects if they decline.

## Scripts

\`\`\`bash
${pm} run dev        # start the dev server
${pm} run android    # build and run on a device or emulator
${pm} run web        # start the dev server for the browser
${pm} run web:build  # export the static web build to dist/
${pm} run test       # run the test suite
${pm} run ci         # type check, lint, format check, test, prebuild, web export
\`\`\`
`
}

async function main() {
  const pkg = await readProject()

  if (!pkg) {
    return
  }

  const present = []
  for (const target of deletedPaths) {
    if (await exists(path.join(root, target))) {
      present.push(target)
    }
  }

  if (present.length === 0) {
    console.log('Nothing to do — this project has already been reset.')
    return
  }

  if (!(await confirm(present))) {
    console.log('Nothing was deleted.')
    return
  }

  console.log()

  for (const target of present) {
    await fs.rm(path.join(root, target), { force: true, recursive: true })
    console.log(`❌ ${target} deleted.`)
  }

  const pm = await detectPackageManager()

  await writePackageJson(pkg)

  await write('constants/app-config.ts', appConfigContent(await readNetwork(pkg)))
  await write('components/app-providers.tsx', appProvidersContent)
  await write('components/app-providers.test.tsx', appProvidersTestContent)
  await write('app/index.tsx', indexContent)
  await write('README.md', readmeContent({ name: pkg.name ?? path.basename(root), pm }))

  console.log(`
✅ Reset complete. Next:

  1. Run \`${pm} install\` so the dependencies match the trimmed package.json.
  2. Edit app/index.tsx to build your first screen.
  3. Reach for the wallet with \`useWallet()\` from '@/features/wallet/use-wallet',
     and change the cluster in constants/app-config.ts.
`)
}

async function write(target, contents) {
  const file = path.join(root, target)

  // `components` is deleted above, so its directory has to come back before anything lands in it.
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, contents)
  console.log(`📄 ${target} written.`)
}

/**
 * The single cluster the reset app talks to, and the identity wallets show on approval.
 *
 * Both are carried over from the app config the template shipped, so a project that already pointed
 * at another cluster or renamed itself keeps that. The first of the configured networks wins — with
 * the switcher gone there is one cluster, and the provider selected the first network anyway.
 */
async function readNetwork(pkg) {
  const fallback = {
    cluster: `createSolanaDevnet({ url: 'https://api.devnet.solana.com' })`,
    creator: 'createSolanaDevnet',
    identity: `{ name: '${pkg.name ?? path.basename(root)}' }`,
  }

  let source
  try {
    source = await fs.readFile(path.join(root, 'constants/app-config.ts'), 'utf8')
  } catch {
    console.log('ℹ️  No constants/app-config.ts to read, writing a devnet config.')
    return fallback
  }

  const cluster = /(create(Solana\w+)\(\{[^}]*\}\))/.exec(source)
  const identity = /static identity:\s*AppIdentity\s*=\s*(\{[^}]*\})/.exec(source)

  if (!cluster || !identity) {
    console.log('ℹ️  constants/app-config.ts was not in its original shape, writing a devnet config.')
    return fallback
  }

  return { cluster: cluster[1], creator: `create${cluster[2]}`, identity: identity[1] }
}

/**
 * Read the package.json this script belongs to, and refuse to touch anything unless that project
 * asked for a reset by declaring the script. A copy of this file dropped into an unrelated project
 * should delete nothing.
 */
async function readProject() {
  const file = path.join(root, 'package.json')
  let pkg

  try {
    pkg = JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    console.error(`No readable package.json in ${root}. This script only resets the project it ships with.`)
    process.exitCode = 1
    return null
  }

  if (!pkg.scripts?.['reset-project']) {
    console.error(
      `${file} does not declare a "reset-project" script, so this is not the project this script resets. Nothing was deleted.`,
    )
    process.exitCode = 1
    return null
  }

  return pkg
}

/** Show the project and what is about to happen, then ask. Deleting is irreversible, so silence is a no. */
async function confirm(targets) {
  console.log(`\nProject: ${root}\n\nDeleted:`)
  for (const target of targets) {
    console.log(`  ${target}`)
  }

  console.log('\nWritten:')
  for (const target of writtenPaths) {
    console.log(`  ${target}`)
  }

  console.log(
    '\nKept: the crypto polyfills, the app styles, the layout, the Expo config and the wallet seam' +
      '\nin features/wallet. The app config keeps its identity and its first network, which becomes' +
      '\nthe single cluster the app talks to.\n',
  )

  if (process.argv.slice(2).includes('--yes')) {
    return true
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  try {
    // A closed stdin — a CI job, a pipe that ended — resolves to an empty answer, which is a no.
    const answer = await new Promise((resolve) => {
      rl.question('Reset this project? (y/N): ', resolve)
      rl.once('close', () => resolve(''))
    })

    return answer.trim().toLowerCase().startsWith('y')
  } finally {
    rl.close()
  }
}

/** Drop the demo dependencies and the script entries that now point at files that are gone. */
async function writePackageJson(pkg) {
  delete pkg.scripts['reset-project']
  delete pkg.scripts['e2e']

  for (const dependency of demoDependencies) {
    if (pkg.dependencies?.[dependency]) {
      delete pkg.dependencies[dependency]
      console.log(`📦 ${dependency} removed from dependencies.`)
    }
  }

  await fs.writeFile(path.join(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
  console.log('📄 package.json updated.')
}

/**
 * The package manager to name in the instructions we leave behind.
 *
 * `npm_config_user_agent` is set by every manager when it runs a script, so it is right whenever the
 * reset went through `<pm> run reset-project`. A direct `node scripts/reset-project.js` has no user
 * agent, so fall back to whichever lockfile the project has.
 */
async function detectPackageManager() {
  const [fromUserAgent] = (process.env.npm_config_user_agent ?? '').split('/')

  if (['bun', 'npm', 'pnpm', 'yarn'].includes(fromUserAgent)) {
    return fromUserAgent
  }

  for (const [lockfile, pm] of Object.entries(lockfiles)) {
    if (await exists(path.join(root, lockfile))) {
      return pm
    }
  }

  return 'npm'
}

async function exists(target) {
  try {
    await fs.stat(target)
    return true
  } catch {
    return false
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
