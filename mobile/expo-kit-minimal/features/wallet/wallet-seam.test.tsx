import { render } from '@testing-library/react-native'
import { createElement, Fragment, type ReactNode } from 'react'
import { Text } from 'react-native'
import { describe, expect, it, vi } from 'vitest'
import { createSolanaDevnet } from '@wallet-ui/core'
import { useWallet } from '@/features/wallet/use-wallet'
import { WalletProvider } from '@/features/wallet/wallet-provider'
import type { UseWalletReturn } from '@/features/wallet/wallet-types'

// This file must stay self-contained — no `@/test/…` imports. `reset-project`
// deletes `test/` but keeps `features/wallet/`, so a helper import from there
// would dangle in the reset app's suite.

const kit = vi.hoisted(() => ({
  mobileWallet: undefined as unknown,
  providerProps: undefined as { children?: ReactNode; cluster?: unknown; identity?: unknown } | undefined,
}))

// The kit is the layer underneath the seam: the test doubles live here so the
// assertions can prove the seam passes the kit's values through unchanged.
vi.mock('@wallet-ui/react-native-kit', () => ({
  useMobileWallet: () => kit.mobileWallet,
  MobileWalletProvider: (props: { children?: ReactNode; cluster?: unknown; identity?: unknown }) => {
    kit.providerProps = props
    return createElement(Fragment, null, props.children)
  },
}))

function buildMobileWallet() {
  return {
    account: { address: 'GsbwXfJraMomNxBcjK9jJ3YuPBQTd7pTvbwEfJvvZoP1', label: 'Stub Wallet' },
    chain: 'solana:devnet',
    client: { rpc: { tag: 'rpc' }, rpcSubscriptions: { tag: 'rpcSubscriptions' } },
    identity: { name: 'stub-app' },
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendTransactions: vi.fn(),
    signIn: vi.fn(),
    signMessages: vi.fn(),
  }
}

describe('wallet seam (native pass-through)', () => {
  it('useWallet returns every member of the underlying mobile wallet', async () => {
    const mobileWallet = buildMobileWallet()
    kit.mobileWallet = mobileWallet

    let seen: UseWalletReturn | undefined
    function Reader() {
      seen = useWallet()
      return null
    }

    await render(<Reader />)

    expect(seen).toEqual({
      account: mobileWallet.account,
      chain: 'solana:devnet',
      client: mobileWallet.client,
      identity: mobileWallet.identity,
      connect: mobileWallet.connect,
      disconnect: mobileWallet.disconnect,
      sendTransactions: mobileWallet.sendTransactions,
      signIn: mobileWallet.signIn,
      signMessages: mobileWallet.signMessages,
    })
  })

  it('useWallet reflects a disconnected wallet as an undefined account', async () => {
    kit.mobileWallet = { ...buildMobileWallet(), account: undefined }

    let seen: UseWalletReturn | undefined
    function Reader() {
      seen = useWallet()
      return null
    }

    await render(<Reader />)

    expect(seen?.account).toBeUndefined()
  })

  it('WalletProvider passes cluster, identity and children to the kit provider', async () => {
    const cluster = createSolanaDevnet({ url: 'https://api.devnet.solana.com' })
    const identity = { name: 'stub-app', uri: 'https://example.com' }

    const screen = await render(
      <WalletProvider cluster={cluster} identity={identity}>
        <Text>inside the wallet</Text>
      </WalletProvider>,
    )

    expect(kit.providerProps?.cluster).toBe(cluster)
    expect(kit.providerProps?.identity).toBe(identity)
    expect(screen.getByText('inside the wallet')).toBeTruthy()
  })
})
