import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..', '..')
const pkgName = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const basePkgName = `${pkgName}-base`
const reactPkgName = `${pkgName}-react`
const basePkgDir = resolve(root, 'packages', basePkgName)
const reactPkgDir = resolve(root, 'packages', reactPkgName)
const lockfilePath = resolve(root, 'bun.lock')

// The install below adds the throwaway packages to the lockfile, and removing their directories
// afterwards does not take them back out. Restore the lockfile so a test run leaves no trace.
const lockfile = existsSync(lockfilePath)
  ? readFileSync(lockfilePath, 'utf8')
  : null

function cleanup() {
  rmSync(basePkgDir, { recursive: true, force: true })
  rmSync(reactPkgDir, { recursive: true, force: true })

  if (lockfile !== null) {
    writeFileSync(lockfilePath, lockfile)
  }
}

function runGenerator(type: 'base' | 'react-ui', name: string) {
  console.log(`Generator smoke test ${type} package: ${name}`)
  const result = Bun.spawnSync({
    cmd: ['bun', 'turbo', 'gen', 'pkg', '--args', type, name],
    cwd: root,
    env: {
      ...process.env,
      TURBO_GEN_SKIP_INSTALL: '1',
    },
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (result.exitCode !== 0) {
    throw new Error(
      `${type} generator failed with exit code ${result.exitCode}`,
    )
  }
}

function verifyFiles(pkgDir: string, files: string[]) {
  for (const file of files) {
    const filePath = resolve(pkgDir, file)
    if (!existsSync(filePath)) {
      throw new Error(`Expected file missing: ${filePath}`)
    }
  }
}

try {
  cleanup()

  runGenerator('base', basePkgName)
  verifyFiles(basePkgDir, ['package.json', 'src/index.ts', 'tsconfig.json'])

  runGenerator('react-ui', reactPkgName)
  verifyFiles(reactPkgDir, [
    'package.json',
    'src/hello.tsx',
    'src/index.tsx',
    'tsconfig.json',
  ])

  const installResult = Bun.spawnSync({
    cmd: ['bun', 'install'],
    cwd: root,
    env: {
      ...process.env,
    },
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (installResult.exitCode !== 0) {
    throw new Error(
      `bun install failed with exit code ${installResult.exitCode}`,
    )
  }

  console.log('Generator smoke test passed.')
} finally {
  cleanup()
}
