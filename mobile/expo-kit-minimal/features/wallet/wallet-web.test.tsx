import { act, fireEvent, render } from '@testing-library/react-native'
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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
  switchAccount: undefined as ((account: FakeAccount | undefined) => void) | undefined,
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
    // Real wallets can switch the selected account underneath the app
    // (`standard:change` events); the mock exposes the setter so tests can
    // drive the same transition.
    useEffect(() => {
      kit.switchAccount = setAccount
      return () => {
        kit.switchAccount = undefined
      }
    }, [])
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
    kit.switchAccount = undefined
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

  it('rejects connect when the wallet declines authorization', async () => {
    kit.wallets = [
      makeWallet({
        impl: {
          connect: vi.fn(async () => {
            throw new Error('The user rejected the request.')
          }),
        },
      }),
    ]
    const { screen, seen } = await renderWallet()

    let outcome: Promise<WalletAccount | Error> | undefined
    await act(async () => {
      outcome = seen()!
        .connect()
        .then(
          (account) => account,
          (error: Error) => error,
        )
    })

    const settled = await outcome!
    expect(settled).toBeInstanceOf(Error)
    expect((settled as Error).message).toMatch(/rejected/i)
    expect(seen()?.account).toBeUndefined()
    // The failed attempt dismisses the picker rather than leaving it open.
    expect(screen.queryByText('Connect a wallet')).toBeNull()
  })

  it('ignores a wallet response that resolves after the picker is cancelled', async () => {
    let resolveConnect!: (value: { accounts: FakeAccount[] }) => void
    kit.wallets = [
      makeWallet({
        impl: {
          connect: vi.fn(
            () =>
              new Promise<{ accounts: FakeAccount[] }>((resolve) => {
                resolveConnect = resolve
              }),
          ),
        },
        name: 'Slow Wallet',
      }),
    ]
    const { screen, seen } = await renderWallet()

    let outcome: Promise<WalletAccount | Error> | undefined
    await act(async () => {
      outcome = seen()!
        .connect()
        .then(
          (account) => account,
          (error: Error) => error,
        )
    })

    // The single wallet auto-connects; its request is still in flight.
    expect(await screen.findByText('Connect a wallet')).toBeTruthy()
    expect(kit.connectCalls).toEqual(['Slow Wallet'])

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /cancel/i }))
    })
    const settled = await outcome!
    expect(settled).toBeInstanceOf(Error)
    expect((settled as Error).message).toMatch(/cancelled/i)

    // The wallet's late approval must not connect the app.
    await act(async () => {
      resolveConnect({ accounts: [makeAccount()] })
    })
    expect(seen()?.account).toBeUndefined()
  })

  it('rejects connect when the wallet returns no account that can sign on this cluster', async () => {
    kit.wallets = [
      makeWallet({
        accounts: [
          makeAccount({ features: ['solana:signMessage'], label: 'Limited Account' }),
          makeAccount({ chains: ['solana:mainnet'], label: 'Wrong Chain Account' }),
        ],
      }),
    ]
    const { screen, seen } = await renderWallet()

    let outcome: Promise<WalletAccount | Error> | undefined
    await act(async () => {
      outcome = seen()!
        .connect()
        .then(
          (account) => account,
          (error: Error) => error,
        )
    })

    const settled = await outcome!
    expect(settled).toBeInstanceOf(Error)
    expect((settled as Error).message).toMatch(/no account that can sign and send transactions/i)
    // Rejected at selection: nothing mounts the account-bound hooks.
    expect(seen()?.account).toBeUndefined()
    expect(screen.getByText('inside the wallet')).toBeTruthy()
  })

  it('excludes wallets that do not support the active cluster', async () => {
    kit.wallets = [makeWallet({ chains: ['solana:mainnet'], name: 'Mainnet Only' })]
    const { seen } = await renderWallet()

    await expect(seen()!.connect()).rejects.toThrow(/install a solana wallet/i)
  })

  it('keeps the app alive with helpful errors when the wallet switches to an incompatible account', async () => {
    kit.wallets = [makeWallet()]
    const { screen, seen } = await renderWallet()
    await connectWallet(seen)
    expect(seen()?.account?.address).toBe(ADDRESS)

    // `standard:change` can surface an account that cannot sign on this
    // cluster; mounting the account-bound hooks for it would throw at render.
    await act(async () => {
      kit.switchAccount?.(makeAccount({ features: ['solana:signMessage'], label: 'Switched Account' }))
    })

    expect(screen.getByText('inside the wallet')).toBeTruthy()
    expect(seen()?.account?.address).toBe(ADDRESS)
    await expect(seen()!.sendTransactions([])).rejects.toThrow(/cannot sign and send transactions/i)
    await expect(seen()!.signMessages(new Uint8Array())).rejects.toThrow(/cannot sign messages/i)
    await expect(seen()!.signIn({})).rejects.toThrow(/does not support sign in with solana/i)
  })

  it('propagates a declined connect to a sign-in requested while disconnected', async () => {
    kit.wallets = [
      makeWallet({
        impl: {
          connect: vi.fn(async () => {
            throw new Error('The user rejected the request.')
          }),
        },
      }),
    ]
    const { seen } = await renderWallet()

    let outcome: Promise<Awaited<ReturnType<UseWalletReturn['signIn']>> | Error> | undefined
    await act(async () => {
      outcome = seen()!
        .signIn({ chainId: 'solana:devnet' })
        .then(
          (output) => output,
          (error: Error) => error,
        )
    })

    const settled = await outcome!
    expect(settled).toBeInstanceOf(Error)
    expect((settled as Error).message).toMatch(/rejected/i)
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
    // MWA parity: a signed payload is the signed message bytes with the
    // signature appended — the same shape the native side vends.
    const concat = (m: Uint8Array) => new Uint8Array([...m, ...SIGNATURE])
    expect(signed).toEqual(concat(message))
    expect(fakeAccount.impl.signMessage).toHaveBeenCalledWith({ account: fakeAccount, message })

    const batch = [new TextEncoder().encode('one'), new TextEncoder().encode('two')]
    let signedBatch: Uint8Array[] | undefined
    await act(async () => {
      signedBatch = await seen()!.signMessages(batch)
    })
    expect(signedBatch).toEqual([concat(batch[0]), concat(batch[1])])
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

  it('keeps the app subtree mounted across connect and disconnect', async () => {
    kit.wallets = [makeWallet()]
    let mounts = 0
    let unmounts = 0
    // A probe under the provider's children: if connecting or disconnecting
    // swapped the provider branch above it, this component would remount and
    // everything beneath the provider — navigator included — would lose
    // state. It must mount exactly once.
    function Probe() {
      useEffect(() => {
        mounts += 1
        return () => {
          unmounts += 1
        }
      }, [])
      return <Text>probe</Text>
    }
    const { Reader, seen } = readWallet()
    await render(
      <WalletProvider cluster={DEVNET} identity={IDENTITY}>
        <Reader />
        <Probe />
      </WalletProvider>,
    )
    expect(mounts).toBe(1)

    await connectWallet(seen)
    expect(seen()?.account?.address).toBe(ADDRESS)
    expect(mounts).toBe(1)
    expect(unmounts).toBe(0)

    await act(async () => {
      await seen()!.disconnect()
    })
    expect(seen()?.account).toBeUndefined()
    expect(mounts).toBe(1)
    expect(unmounts).toBe(0)
  })

  it('rejects a pending connect when the provider unmounts', async () => {
    kit.wallets = [
      makeWallet({
        impl: { connect: vi.fn(() => new Promise<{ accounts: FakeAccount[] }>(() => {})) },
        name: 'Stuck Wallet',
      }),
    ]
    const { screen, seen } = await renderWallet()

    let outcome: Promise<WalletAccount | Error> | undefined
    await act(async () => {
      outcome = seen()!
        .connect()
        .then(
          (account) => account,
          (error: Error) => error,
        )
    })
    // The single wallet auto-connects; its request never resolves.
    expect(kit.connectCalls).toEqual(['Stuck Wallet'])

    await act(async () => {
      screen.unmount()
    })

    const settled = await outcome!
    expect(settled).toBeInstanceOf(Error)
    expect((settled as Error).message).toMatch(/unmounted/i)
  })

  it('rejects a pending sign-in when the provider unmounts', async () => {
    kit.wallets = [
      makeWallet({
        impl: { connect: vi.fn(() => new Promise<{ accounts: FakeAccount[] }>(() => {})) },
        name: 'Stuck Wallet',
      }),
    ]
    const { screen, seen } = await renderWallet()

    let outcome: Promise<Awaited<ReturnType<UseWalletReturn['signIn']>> | Error> | undefined
    await act(async () => {
      outcome = seen()!
        .signIn({ chainId: 'solana:devnet' })
        .then(
          (output) => output,
          (error: Error) => error,
        )
    })
    expect(kit.connectCalls).toEqual(['Stuck Wallet'])

    await act(async () => {
      screen.unmount()
    })

    const settled = await outcome!
    expect(settled).toBeInstanceOf(Error)
    expect((settled as Error).message).toMatch(/unmounted/i)
  })

  it('rejects a second disconnected sign-in while the first is still connecting', async () => {
    const fakeAccount = makeAccount()
    kit.wallets = [makeWallet({ accounts: [fakeAccount], name: 'Alpha Wallet' }), makeWallet({ name: 'Beta Wallet' })]
    const { screen, seen } = await renderWallet()

    type SignInResult = Awaited<ReturnType<UseWalletReturn['signIn']>>
    let first: Promise<SignInResult | Error> | undefined
    let second: Promise<SignInResult | Error> | undefined
    await act(async () => {
      first = seen()!
        .signIn({ chainId: 'solana:devnet' })
        .then(
          (output) => output,
          (error: Error) => error,
        )
      second = seen()!
        .signIn({ chainId: 'solana:devnet' })
        .then(
          (output) => output,
          (error: Error) => error,
        )
    })

    // The second caller is refused outright — never queued over the first
    // in a way that would orphan the first's deferred.
    const secondSettled = await second!
    expect(secondSettled).toBeInstanceOf(Error)
    expect((secondSettled as Error).message).toMatch(/already in progress/i)

    // The first still owns the connect: it drove the picker open and is
    // fulfilled against the account it selected.
    expect(await screen.findByText('Connect a wallet')).toBeTruthy()
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: /alpha wallet/i }))
    })

    const firstSettled = await first!
    expect(firstSettled).not.toBeInstanceOf(Error)
    expect((firstSettled as SignInResult).account.address).toBe(ADDRESS)
    expect((firstSettled as SignInResult).signature).toBe(SIGNATURE)
  })

  it('rejects a deferred sign-in when the picker is cancelled', async () => {
    kit.wallets = [makeWallet({ name: 'Alpha Wallet' }), makeWallet({ name: 'Beta Wallet' })]
    const { screen, seen } = await renderWallet()

    type SignInResult = Awaited<ReturnType<UseWalletReturn['signIn']>>
    let outcome: Promise<SignInResult | Error> | undefined
    await act(async () => {
      outcome = seen()!
        .signIn({ chainId: 'solana:devnet' })
        .then(
          (output) => output,
          (error: Error) => error,
        )
    })
    expect(await screen.findByText('Connect a wallet')).toBeTruthy()

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: /cancel/i }))
    })

    const settled = await outcome!
    expect(settled).toBeInstanceOf(Error)
    expect((settled as Error).message).toMatch(/cancelled/i)
    expect(seen()?.account).toBeUndefined()
  })

  it('rejects a deferred sign-in and closes the picker when disconnect is called mid-connect', async () => {
    kit.wallets = [makeWallet({ name: 'Alpha Wallet' }), makeWallet({ name: 'Beta Wallet' })]
    const { screen, seen } = await renderWallet()

    type SignInResult = Awaited<ReturnType<UseWalletReturn['signIn']>>
    let outcome: Promise<SignInResult | Error> | undefined
    await act(async () => {
      outcome = seen()!
        .signIn({ chainId: 'solana:devnet' })
        .then(
          (output) => output,
          (error: Error) => error,
        )
    })
    expect(await screen.findByText('Connect a wallet')).toBeTruthy()

    await act(async () => {
      await seen()!.disconnect()
    })

    const settled = await outcome!
    expect(settled).toBeInstanceOf(Error)
    expect((settled as Error).message).toMatch(/disconnected/i)
    // The in-flight connect attempt is torn down with it.
    expect(screen.queryByText('Connect a wallet')).toBeNull()
  })

  it('reconnects to the same account after a disconnect', async () => {
    const fakeAccount = makeAccount()
    kit.wallets = [makeWallet({ accounts: [fakeAccount] })]
    const { seen } = await renderWallet()

    await connectWallet(seen)
    expect(seen()?.account?.address).toBe(ADDRESS)
    await act(async () => {
      await seen()!.disconnect()
    })
    expect(seen()?.account).toBeUndefined()

    // The second connect withdraws then republishes the connected ops; the
    // seam must vend a working account again, not the stale null.
    await connectWallet(seen)
    expect(seen()?.account?.address).toBe(ADDRESS)
    let signed: Uint8Array | undefined
    await act(async () => {
      signed = await seen()!.signMessages(new TextEncoder().encode('again'))
    })
    expect(signed).toBeDefined()
  })

  it('keeps the app subtree mounted when the wallet switches accounts', async () => {
    kit.wallets = [makeWallet()]
    let mounts = 0
    function Probe() {
      useEffect(() => {
        mounts += 1
      }, [])
      return null
    }
    const { Reader, seen } = readWallet()
    await render(
      <WalletProvider cluster={DEVNET} identity={IDENTITY}>
        <Reader />
        <Probe />
      </WalletProvider>,
    )
    await connectWallet(seen)
    expect(mounts).toBe(1)

    await act(async () => {
      kit.switchAccount?.(makeAccount({ label: 'Second Account' }))
    })

    expect(mounts).toBe(1)
    expect(seen()?.account?.label).toBe('Second Account')
    // The republished ops sign with the new account.
    let signed: Uint8Array | undefined
    await act(async () => {
      signed = await seen()!.signMessages(new TextEncoder().encode('hi'))
    })
    expect(signed).toBeDefined()
  })

  it('fulfills a sign-in invoked through a reference captured before the connected ops published', async () => {
    const fakeAccount = makeAccount()
    kit.wallets = [makeWallet({ accounts: [fakeAccount] })]
    // Record every vended context value: the render between "account set"
    // and "ops published" still serves the disconnected contract, and the
    // last disconnected entry is that render's value.
    const values: UseWalletReturn[] = []
    function Recorder() {
      values.push(useWallet())
      return null
    }
    await render(
      <WalletProvider cluster={DEVNET} identity={IDENTITY}>
        <Recorder />
      </WalletProvider>,
    )
    let connectPromise: Promise<WalletAccount> | undefined
    await act(async () => {
      connectPromise = values.at(-1)!.connect()
    })
    await connectPromise!
    expect(values.at(-1)?.account?.address).toBe(ADDRESS)

    const gapValue = [...values].reverse().find((v) => v.account === undefined)!
    // Calling the captured signIn now lands a deferred request while the
    // connected bridge is already mounted — it must still be drained on
    // the commit the request itself schedules.
    let signInPromise: Promise<Awaited<ReturnType<UseWalletReturn['signIn']>>> | undefined
    await act(async () => {
      signInPromise = gapValue.signIn({ chainId: 'solana:devnet' })
    })
    const output = await signInPromise!
    expect(output.account.address).toBe(ADDRESS)
    expect(output.signature).toBe(SIGNATURE)
  })

  it('rejects a sign-in in flight at the wallet when the provider unmounts', async () => {
    const fakeAccount = makeAccount()
    fakeAccount.impl.signIn = vi.fn(() => new Promise<never>(() => {}))
    kit.wallets = [makeWallet({ accounts: [fakeAccount] })]
    const { screen, seen } = await renderWallet()

    type SignInResult = Awaited<ReturnType<UseWalletReturn['signIn']>>
    let outcome: Promise<SignInResult | Error> | undefined
    await act(async () => {
      outcome = seen()!
        .signIn({ chainId: 'solana:devnet' })
        .then(
          (output) => output,
          (error: Error) => error,
        )
    })
    // Connected; the request was handed to a wallet that never answers.
    expect(seen()?.account?.address).toBe(ADDRESS)

    await act(async () => {
      screen.unmount()
    })

    const settled = await outcome!
    expect(settled).toBeInstanceOf(Error)
    expect((settled as Error).message).toMatch(/unmounted/i)
  })

  it('rejects a sign-in in flight at the wallet when disconnect is called', async () => {
    const fakeAccount = makeAccount()
    fakeAccount.impl.signIn = vi.fn(() => new Promise<never>(() => {}))
    kit.wallets = [makeWallet({ accounts: [fakeAccount] })]
    const { seen } = await renderWallet()

    type SignInResult = Awaited<ReturnType<UseWalletReturn['signIn']>>
    let outcome: Promise<SignInResult | Error> | undefined
    await act(async () => {
      outcome = seen()!
        .signIn({ chainId: 'solana:devnet' })
        .then(
          (output) => output,
          (error: Error) => error,
        )
    })
    expect(seen()?.account?.address).toBe(ADDRESS)

    await act(async () => {
      await seen()!.disconnect()
    })

    const settled = await outcome!
    expect(settled).toBeInstanceOf(Error)
    expect((settled as Error).message).toMatch(/disconnected/i)
  })
})
