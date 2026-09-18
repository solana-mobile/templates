import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { describe, expect, it } from 'vitest'
import { createSolanaDevnet } from '@wallet-ui/core'
import { useWallet } from '@/features/wallet/use-wallet.web'
import { WalletProvider } from '@/features/wallet/wallet-provider.web'
import type { UseWalletReturn } from '@/features/wallet/wallet-types'

// This file must stay self-contained — no `@/test/…` imports. `reset-project`
// deletes `test/` but keeps `features/wallet/`, so a helper import from there
// would dangle in the reset app's suite.
//
// The `.web` modules are imported by their explicit filenames, which sidesteps
// platform resolution — the suite runs with `platform: 'android'` and would
// otherwise resolve the `.native` variants.

function readWallet() {
  let seen: UseWalletReturn | undefined
  function Reader() {
    seen = useWallet()
    return null
  }
  return { Reader, seen: () => seen }
}

describe('wallet seam (web)', () => {
  it('renders children and reports a disconnected wallet', async () => {
    const cluster = createSolanaDevnet({ url: 'https://api.devnet.solana.com' })
    const identity = { name: 'stub-app', uri: 'https://example.com' }
    const { Reader, seen } = readWallet()

    const screen = await render(
      <WalletProvider cluster={cluster} identity={identity}>
        <Reader />
        <Text>inside the wallet</Text>
      </WalletProvider>,
    )

    expect(screen.getByText('inside the wallet')).toBeTruthy()
    const wallet = seen()
    expect(wallet?.account).toBeUndefined()
    expect(wallet?.chain).toBe('solana:devnet')
    expect(wallet?.identity).toBe(identity)
    expect(wallet?.client.rpc).toBeDefined()
    expect(wallet?.client.rpcSubscriptions).toBeDefined()
  })

  it('rejects wallet interactions with a not-yet-available error', async () => {
    const { Reader, seen } = readWallet()

    await render(
      <WalletProvider
        cluster={createSolanaDevnet({ url: 'https://api.devnet.solana.com' })}
        identity={{ name: 'stub-app' }}
      >
        <Reader />
      </WalletProvider>,
    )

    const wallet = seen()
    await expect(wallet?.connect()).rejects.toThrow(/web wallet.*not.*available/i)
    await expect(wallet?.signIn({})).rejects.toThrow(/web wallet.*not.*available/i)
    await expect(wallet?.signMessages(new Uint8Array())).rejects.toThrow(/web wallet.*not.*available/i)
    await expect(wallet?.sendTransactions([])).rejects.toThrow(/web wallet.*not.*available/i)
    // Disconnecting a wallet that was never connected is a no-op, not an error.
    await expect(wallet?.disconnect()).resolves.toBeUndefined()
  })
})
