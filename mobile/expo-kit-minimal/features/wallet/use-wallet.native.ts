import { useMobileWallet } from '@wallet-ui/react-native-kit'
import type { SolanaClusterId } from '@wallet-ui/core'
import type { UseWalletReturn } from './wallet-types'

// Pass-through to Mobile Wallet Adapter. The kit's return value is reshaped
// onto the platform-neutral contract: the members line up one-to-one, and the
// seam's `AppIdentity`/`WalletAccount` are structurally identical to the kit's,
// so the only cast is the MWA `Chain` onto the narrower `SolanaClusterId`.
export function useWallet(): UseWalletReturn {
  const wallet = useMobileWallet()
  return {
    account: wallet.account,
    chain: wallet.chain as SolanaClusterId,
    client: wallet.client,
    identity: wallet.identity,
    connect: wallet.connect,
    disconnect: wallet.disconnect,
    sendTransactions: wallet.sendTransactions,
    signIn: wallet.signIn,
    signMessages: wallet.signMessages,
  }
}
