import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'
import type { WalletClient } from './wallet-types'

// Mirrors createDefaultClient from @wallet-ui/react-native-kit so both
// platforms talk to the RPC the same way.
export function createClient(cluster: { url: string; urlWs?: string }): WalletClient {
  const rpc = createSolanaRpc(cluster.url)
  const rpcSubscriptionsUrl = cluster.urlWs ?? cluster.url.replace(/^http/, 'ws')
  const rpcSubscriptions = createSolanaRpcSubscriptions(rpcSubscriptionsUrl)
  return { rpc, rpcSubscriptions }
}
