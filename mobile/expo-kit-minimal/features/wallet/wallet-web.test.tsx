import { act, fireEvent, render } from '@testing-library/react-native'
import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from 'react'
import { Text } from 'react-native'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSolanaDevnet } from '@wallet-ui/core'
import { useWallet } from '@/features/wallet/use-wallet.web'
import { WalletProvider } from '@/features/wallet/wallet-provider.web'
import type { UseWalletReturn, WalletAccount } from '@/features/wallet/wallet-types'

// This file must stay self-contained — it must not import from the `test/`
// helpers directory. `reset-project` deletes `test/` but keeps
// `features/wallet/`, so a helper import from there would dangle in the reset
// app's suite.
//
// The `.web` modules are imported by their explicit filenames, which sidesteps
// platform resolution — the suite runs with `platform: 'android'` and would
// otherwise resolve the `.native` variants.

const DEVNET = createSolanaDevnet({ url: 'https://api.devnet.solana.com' })
const IDENTITY = { name: 'stub-app', uri: 'https://example.com' }
const ADDRESS = 'GsbwXfJraMomNxBcjK9jJ3YuPBQTd7pTvbwEfJvvZoP1'
const OTHER_ADDRESS = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
const SIGNATURE = new Uint8Array(64).fill(7)
const SIGNED_MESSAGE = new TextEncoder().encode('a sign-in message')

const REQUIRED_FEATURES = ['solana:signAndSendTransaction', 'solana:signMessage']

// Fakes shaped like the wallet-standard handles `@wallet-ui/react` produces:
// `features` is the name list the seam inspects, `impl` carries the behavior
// the mocked hooks delegate to.
interface FakeAccount {
  address: string
  chains: string[]
  features: string[]
  impl: {
    signIn?: (
      input: Record<string, unknown>,
    ) => Promise<{ account: FakeAccount; signature: Uint8Array; signedMessage: Uint8Array }>
    signMessage: (input: {
      account: FakeAccount
      message: Uint8Array
    }) => Promise<{ signature: Uint8Array; signedMessage: Uint8Array }>
  }
  label: string
  publicKey: Uint8Array
}

interface FakeWallet {
  accounts: FakeAccount[]
  chains: string[]
  features: string[]
  impl: { connect: () => Promise<{ accounts: FakeAccount[] }> }
  name: string
  version: string
}

function makeAccount(overrides: Partial<FakeAccount> = {}): FakeAccount {
  const account: FakeAccount = {
    address: ADDRESS,
    chains: ['solana:devnet'],
    features: [...REQUIRED_FEATURES, 'solana:signIn'],
    impl: {
      signIn: vi.fn(async () => ({ account, signature: SIGNATURE, signedMessage: SIGNED_MESSAGE })),
      signMessage: vi.fn(async ({ message }) => ({ signature: SIGNATURE, signedMessage: message })),
    },
    label: 'Test Account',
    publicKey: new Uint8Array(32),
    ...overrides,
  }
  return account
}

function makeWallet(overrides: Partial<FakeWallet> = {}): FakeWallet {
  const wallet: FakeWallet = {
    accounts: overrides.accounts ?? [makeAccount()],
    chains: ['solana:devnet'],
    features: [...REQUIRED_FEATURES, 'solana:signIn', 'standard:connect', 'standard:disconnect'],
    impl: { connect: vi.fn(async () => ({ accounts: wallet.accounts })) },
    name: 'Test Wallet',
    version: '1.0.0',
    ...overrides,
  }
  return wallet
}

const kit = vi.hoisted(() => ({
  connectCalls: [] as string[],
  wallets: [] as FakeWallet[],
}))

// The mocks sit at the two packages the web seam imports. The
// `@wallet-ui/react` mock mirrors the real module's data flow closely enough to
// exercise the seam: `WalletUi` owns the selected account in React state,
// `useWalletUi` reads it, and `useConnect` delegates to the wallet's connect
// feature. The `@solana/react` mock carries the account-bound hooks, which
// THROW AT RENDER when the account lacks the feature — exactly the behavior the
// seam defends against (feature-filtered picker, `solana:signIn` mounted
// behind a component branch).
vi.mock('@wallet-ui/react', () => {
  const MockWalletUiContext = createContext<{
    account?: FakeAccount
    connect: (account: FakeAccount) => void
    disconnect: () => void
    wallets: FakeWallet[]
  } | null>(null)

  function WalletUi({ children }: { children?: ReactNode }) {
    const [account, setAccount] = useState<FakeAccount | undefined>(undefined)
    const value = useMemo(
      () => ({
        account,
        connect: (next: FakeAccount) => setAccount(next),
        disconnect: () => setAccount(undefined),
        wallets: kit.wallets,
      }),
      [account],
    )
    return createElement(MockWalletUiContext.Provider, { value }, children)
  }

  return {
    createWalletUiConfig: (config: unknown) => config,
    useConnect: (wallet: FakeWallet) => [
      false,
      async () => {
        kit.connectCalls.push(wallet.name)
        const { accounts } = await wallet.impl.connect()
        return accounts
      },
    ],
    useWalletUi: () => {
      const context = useContext(MockWalletUiContext)
      if (!context) {
        throw new Error('useWalletUi must be used within WalletUi')
      }
      return context
    },
    WalletUi,
  }
})

vi.mock('@solana/react', () => {
  // Mirrors the real hooks, which throw at render time when the bound account
  // does not implement the feature — the failure mode the seam is built around.
  function requireFeature(account: FakeAccount, feature: string) {
    if (!account.features.includes(feature)) {
      throw new Error(`Wallet account does not support the '${feature}' feature`)
    }
  }

  return {
    useSignIn: (account: FakeAccount) => {
      requireFeature(account, 'solana:signIn')
      return async (input?: Record<string, unknown>) => account.impl.signIn!(input ?? {})
    },
    useSignMessage: (account: FakeAccount) => {
      requireFeature(account, 'solana:signMessage')
      return async (input: { message: Uint8Array }) => account.impl.signMessage({ account, message: input.message })
    },
    useWalletAccountTransactionSendingSigner: (account: FakeAccount) => {
      requireFeature(account, 'solana:signAndSendTransaction')
      return { address: account.address }
    },
  }
})

function readWallet() {
  let seen: UseWalletReturn | undefined
  function Reader() {
    seen = useWallet()
    return null
  }
  return { Reader, seen: () => seen }
}

async function renderWallet() {
  const { Reader, seen } = readWallet()
  const screen = await render(
    <WalletProvider cluster={DEVNET} identity={IDENTITY}>
      <Reader />
      <Text>inside the wallet</Text>
    </WalletProvider>,
  )
  return { screen, seen }
}

// connect() resolves only after React re-renders (picker → selection →
// ConnectedBridge), so it must be STARTED inside `act` — letting act's flush
// drive the state updates — and awaited outside it. Awaiting the promise inside
// `act` deadlocks: the callback never settles, so the queued updates that would
// resolve it never flush.
async function connectWallet(seen: () => UseWalletReturn | undefined): Promise<WalletAccount> {
  let connectPromise: Promise<WalletAccount> | undefined
  await act(async () => {
    connectPromise = seen()!.connect()
  })
  return connectPromise!
}

describe('wallet seam (web)', () => {
  beforeEach(() => {
    kit.connectCalls = []
    kit.wallets = []
  })

  it('renders children and reports a disconnected wallet', async () => {
    const { screen, seen } = await renderWallet()

    expect(screen.getByText('inside the wallet')).toBeTruthy()
    const wallet = seen()
    expect(wallet?.account).toBeUndefined()
    expect(wallet?.chain).toBe('solana:devnet')
    expect(wallet?.identity).toBe(IDENTITY)
    expect(wallet?.client.rpc).toBeDefined()
    expect(wallet?.client.rpcSubscriptions).toBeDefined()
  })

  it('rejects signing actions with a connect-first message while disconnected', async () => {
    const { seen } = await renderWallet()

    // `signIn` is deliberately absent: the account screen renders it in the
    // disconnected branch as the connect path, so it must not throw here.
    await expect(seen()!.sendTransactions([])).rejects.toThrow(/connect a wallet/i)
    await expect(seen()!.signMessages(new Uint8Array())).rejects.toThrow(/connect a wallet/i)
  })

  it('rejects connect when no compatible wallet is registered', async () => {
    kit.wallets = [
      makeWallet({
        features: ['solana:signAndSendTransaction', 'standard:connect'],
        name: 'Partial Wallet',
      }),
    ]
    const { seen } = await renderWallet()

    await expect(seen()!.connect()).rejects.toThrow(/install a solana wallet/i)
  })

  it('connects automatically when exactly one compatible wallet is registered', async () => {
    kit.wallets = [makeWallet({ name: 'Only Wallet' })]
    const { seen } = await renderWallet()

    const account = await connectWallet(seen)

    expect(account.address).toBe(ADDRESS)
    expect(account.label).toBe('Test Account')
    expect(seen()?.account?.address).toBe(ADDRESS)
    expect(kit.connectCalls).toEqual(['Only Wallet'])
  })

  it('lists compatible wallets in the picker and connects on selection', async () => {
    kit.wallets = [
      makeWallet({ accounts: [makeAccount({ address: ADDRESS })], name: 'Alpha Wallet' }),
      makeWallet({ accounts: [makeAccount({ address: OTHER_ADDRESS })], name: 'Beta Wallet' }),
      makeWallet({ features: ['standard:connect'], name: 'Partial Wallet' }),
    ]
    const { screen, seen } = await renderWallet()

    let connectPromise: Promise<WalletAccount> | undefined
    await act(async () => {
      connectPromise = seen()!.connect()
    })

    // The picker is app-rendered: its rows are React Native components in the
    // tree, and wallets lacking a required feature are not listed. RN Button
    // uppercases its title, so names match case-insensitively.
    expect(await screen.findByText('Connect a wallet')).toBeTruthy()
    expect(screen.getByRole('button', { name: /alpha wallet/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /beta wallet/i })).toBeTruthy()
    expect(screen.queryByText(/partial wallet/i)).toBeNull()
    // With more than one wallet nothing auto-connects.
    expect(kit.connectCalls).toEqual([])

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: /beta wallet/i }))
    })

    const account = await connectPromise!
    expect(account.address).toBe(OTHER_ADDRESS)
    expect(kit.connectCalls).toEqual(['Beta Wallet'])
    expect(seen()?.account?.address).toBe(OTHER_ADDRESS)
  })

  it('rejects connect when the picker is cancelled', async () => {
    kit.wallets = [makeWallet({ name: 'Alpha Wallet' }), makeWallet({ name: 'Beta Wallet' })]
    const { screen, seen } = await renderWallet()

    let connectPromise: Promise<WalletAccount> | undefined
    await act(async () => {
      connectPromise = seen()!.connect()
    })
    expect(await screen.findByText('Connect a wallet')).toBeTruthy()

    // Attach the rejection handler before pressing cancel — the rejection must
    // not float unhandled.
    const rejection = connectPromise!.then(
      () => null,
      (error: Error) => error,
    )
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: /cancel/i }))
    })

    const error = await rejection
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toMatch(/cancelled/i)
    expect(seen()?.account).toBeUndefined()
  })

  it('signs a single message and a batch with the connected account', async () => {
    const fakeAccount = makeAccount()
    kit.wallets = [makeWallet({ accounts: [fakeAccount] })]
    const { seen } = await renderWallet()
    await connectWallet(seen)

    const message = new TextEncoder().encode('hello web')
    let signed: Uint8Array | undefined
    await act(async () => {
      signed = await seen()!.signMessages(message)
    })
    expect(signed).toBe(SIGNATURE)
    expect(fakeAccount.impl.signMessage).toHaveBeenCalledWith({ account: fakeAccount, message })

    const batch = [new TextEncoder().encode('one'), new TextEncoder().encode('two')]
    let signedBatch: Uint8Array[] | undefined
    await act(async () => {
      signedBatch = await seen()!.signMessages(batch)
    })
    expect(signedBatch).toEqual([SIGNATURE, SIGNATURE])
  })

  it('signs in with the connected account', async () => {
    const fakeAccount = makeAccount()
    kit.wallets = [makeWallet({ accounts: [fakeAccount] })]
    const { seen } = await renderWallet()
    await connectWallet(seen)

    let output: Awaited<ReturnType<UseWalletReturn['signIn']>> | undefined
    await act(async () => {
      output = await seen()!.signIn({ chainId: 'solana:devnet', uri: 'https://example.com' })
    })

    expect(output?.account.address).toBe(ADDRESS)
    expect(output?.signature).toBe(SIGNATURE)
    expect(output?.signedMessage).toBe(SIGNED_MESSAGE)
    expect(fakeAccount.impl.signIn).toHaveBeenCalledWith({ chainId: 'solana:devnet', uri: 'https://example.com' })
  })

  it('defers a sign-in requested while disconnected through connect', async () => {
    const fakeAccount = makeAccount()
    kit.wallets = [makeWallet({ accounts: [fakeAccount] })]
    const { seen } = await renderWallet()

    // Disconnected sign-in is the connect path: it must connect first and then
    // fulfill the sign-in against the connected account. Started inside `act`,
    // awaited outside — same reason as connectWallet above.
    let signInPromise: Promise<Awaited<ReturnType<UseWalletReturn['signIn']>>> | undefined
    await act(async () => {
      signInPromise = seen()!.signIn({ chainId: 'solana:devnet' })
    })
    const output = await signInPromise!

    expect(seen()?.account?.address).toBe(ADDRESS)
    expect(output?.account.address).toBe(ADDRESS)
    expect(output?.signature).toBe(SIGNATURE)
    expect(fakeAccount.impl.signIn).toHaveBeenCalledWith({ chainId: 'solana:devnet' })
  })

  it('reports unsupported sign-in instead of crashing on a wallet without solana:signIn', async () => {
    const fakeAccount = makeAccount({ features: [...REQUIRED_FEATURES] })
    kit.wallets = [
      makeWallet({
        accounts: [fakeAccount],
        features: [...REQUIRED_FEATURES, 'standard:connect', 'standard:disconnect'],
      }),
    ]
    const { screen, seen } = await renderWallet()
    await connectWallet(seen)

    // The connect and the rest of the seam still work; only sign-in reports.
    expect(seen()?.account?.address).toBe(ADDRESS)
    expect(screen.getByText('inside the wallet')).toBeTruthy()

    let error: unknown
    await act(async () => {
      error = await seen()!
        .signIn({})
        .catch((e: Error) => e)
    })
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/does not support sign in with solana/i)
  })

  it('disconnects back to the disconnected context', async () => {
    kit.wallets = [makeWallet()]
    const { seen } = await renderWallet()
    await connectWallet(seen)
    expect(seen()?.account?.address).toBe(ADDRESS)

    await act(async () => {
      await seen()!.disconnect()
    })

    expect(seen()?.account).toBeUndefined()
    await expect(seen()!.sendTransactions([])).rejects.toThrow(/connect a wallet/i)
  })
})
