// Real-package counterpart to wallet-web.test.tsx: registers a live
// wallet-standard wallet and drives the seam through the actual
// `@wallet-ui/react`/`@solana/react` hooks rather than mocks — the
// coverage that catches registry and hook-contract drift a mock cannot.
// Must stay self-contained (no `test/` imports): `reset-project` deletes
// `test/` but keeps `features/wallet/`.
import { act, cleanup, render } from '@testing-library/react-native'
import { useEffect } from 'react'
import { getWallets } from '@wallet-standard/app'
import { createSolanaDevnet, createSolanaTestnet } from '@wallet-ui/core'
import { afterEach, expect, it, vi } from 'vitest'
import { WalletProvider } from './wallet-provider.web'
import { useWallet } from './use-wallet.web'
import type { UseWalletReturn } from './wallet-types'

vi.hoisted(() => {
  Object.assign(window, {
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true
    },
  })
})

const DEVNET = createSolanaDevnet()
const TESTNET = createSolanaTestnet()
const account = {
  address: 'GsbwXfJraMomNxBcjK9jJ3YuPBQTd7pTvbwEfJvvZoP1',
  publicKey: new Uint8Array(32),
  chains: ['solana:devnet'],
  features: ['solana:signMessage', 'solana:signAndSendTransaction', 'solana:signIn'],
}
let unregister: (() => void) | undefined
let seen: UseWalletReturn
function Reader() {
  seen = useWallet()
  return null
}
function register(connectImpl?: () => Promise<{ accounts: (typeof account)[] }>) {
  const listeners = new Set<(event: unknown) => void>()
  let accounts: (typeof account)[] = []
  const connect = vi.fn(
    connectImpl ??
      (async () => {
        accounts = [account]
        for (const listener of listeners) listener({ accounts })
        return { accounts }
      }),
  )
  const wallet = {
    version: '1.0.0',
    name: 'Real hooks review wallet',
    icon: 'data:image/png;base64,AA==',
    chains: ['solana:devnet'],
    get accounts() {
      return accounts
    },
    features: {
      'standard:connect': { version: '1.0.0', connect },
      'standard:events': {
        version: '1.0.0',
        on: (_: string, listener: (event: unknown) => void) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      },
      'solana:signMessage': {
        version: '1.0.0',
        signMessage: vi.fn(async () => [{ signature: new Uint8Array(64), signedMessage: new Uint8Array() }]),
      },
      'solana:signAndSendTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: [0, 'legacy'],
        signAndSendTransaction: vi.fn(),
      },
      'solana:signIn': {
        version: '1.0.0',
        signIn: vi.fn(async () => [{ account, signature: new Uint8Array(64), signedMessage: new Uint8Array() }]),
      },
    },
  }
  unregister = getWallets().register(wallet as never)
  return { wallet, connect }
}
afterEach(async () => {
  await cleanup()
  unregister?.()
  unregister = undefined
})

it('real packages connect and sign with the same registry', async () => {
  const { connect } = register()
  await render(
    <WalletProvider cluster={DEVNET} identity={{ name: 'review' }}>
      <Reader />
    </WalletProvider>,
  )
  let pending: Promise<unknown>
  await act(async () => {
    pending = seen.connect()
  })
  await pending!
  expect(seen.account?.address).toBe(account.address)
  await act(async () => {
    await seen.signMessages(new Uint8Array([1]))
  })
  expect(connect).toHaveBeenCalledTimes(1)
})

it('does not automatically retry a rejected wallet prompt', async () => {
  let calls = 0
  const { connect } = register(async () => {
    calls++
    if (calls < 4) throw new Error('User rejected')
    return new Promise(() => {})
  })
  const screen = await render(
    <WalletProvider cluster={DEVNET} identity={{ name: 'review' }}>
      <Reader />
    </WalletProvider>,
  )
  await act(async () => {
    void seen.connect().catch(() => {})
  })
  expect(connect).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull()
})

it('rejects an unsupported cluster without a render crash', async () => {
  register()
  await render(
    <WalletProvider cluster={TESTNET} identity={{ name: 'review' }}>
      <Reader />
    </WalletProvider>,
  )
  await act(async () => {
    void seen.connect().catch(() => {})
  })
  expect(seen.account).toBeUndefined()
})

it('settles a pending connection when the provider is unmounted', async () => {
  register(() => new Promise(() => {}))
  const screen = await render(
    <WalletProvider cluster={DEVNET} identity={{ name: 'review' }}>
      <Reader />
    </WalletProvider>,
  )
  let outcome = 'pending'
  await act(async () => {
    void seen.connect().then(
      () => {
        outcome = 'resolved'
      },
      () => {
        outcome = 'rejected'
      },
    )
  })
  await screen.unmount()
  expect(outcome).toBe('rejected')
})

it('preserves the application subtree when connecting', async () => {
  register()
  let mounts = 0
  function AppState() {
    useEffect(() => {
      mounts++
    }, [])
    return null
  }
  await render(
    <WalletProvider cluster={DEVNET} identity={{ name: 'review' }}>
      <Reader />
      <AppState />
    </WalletProvider>,
  )
  expect(mounts).toBe(1)
  await act(async () => {
    void seen.connect().catch(() => {})
  })
  expect(seen.account?.address).toBe(account.address)
  expect(mounts).toBe(1)
})

it('settles overlapping disconnected sign-ins deterministically', async () => {
  // The wallet's connect never resolves: the first sign-in stays parked in
  // the connecting state, so the second must be refused — not queued over
  // the first's pending slot — and the first must still settle (here, via
  // the provider-unmount cleanup).
  register(() => new Promise(() => {}))
  const screen = await render(
    <WalletProvider cluster={DEVNET} identity={{ name: 'review' }}>
      <Reader />
    </WalletProvider>,
  )
  let first = 'pending',
    second = 'pending'
  await act(async () => {
    void seen.signIn({ chainId: 'solana:devnet' }).then(
      () => {
        first = 'resolved'
      },
      () => {
        first = 'rejected'
      },
    )
    void seen.signIn({ chainId: 'solana:devnet' }).then(
      () => {
        second = 'resolved'
      },
      () => {
        second = 'rejected'
      },
    )
  })
  expect(second).toBe('rejected')
  expect(first).toBe('pending')
  await screen.unmount()
  expect(first).toBe('rejected')
})
