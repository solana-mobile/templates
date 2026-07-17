import type { SolanaChain } from '@solana/wallet-standard-chains'

/**
 * The networks this app builds clients for.
 *
 * Narrower than `SolanaChain` on purpose: `createSolanaClient` switches over exactly these, so the
 * switch is exhaustive and every branch narrows to one literal. Widening this to `SolanaChain`
 * would leave a `default` branch whose chain is a union, and that union would travel with the
 * client into every signer and cache key downstream. Name a network here and the switch stops
 * compiling until it is handled.
 */
export type ClusterId = Extract<
  SolanaChain,
  'solana:devnet' | 'solana:localnet' | 'solana:testnet'
>

/**
 * A network the app can talk to.
 *
 * The `id` is the wallet-standard chain identifier, which is what ties the moving parts together:
 * the wallet plugin filters discovered wallets by it, the RPC plugin is picked from it, and the
 * wallet uses it to decide which network to simulate a transaction against.
 */
export type Cluster = {
  /** The `?cluster=` value Solana Explorer expects. Mainnet is the explorer default and needs none. */
  explorerParam: string
  id: ClusterId
  label: string
  rpcUrl: string
}

const DEVNET: Cluster = {
  explorerParam: 'devnet',
  id: 'solana:devnet',
  label: 'Devnet',
  rpcUrl: 'https://api.devnet.solana.com',
}

const TESTNET: Cluster = {
  explorerParam: 'testnet',
  id: 'solana:testnet',
  label: 'Testnet',
  rpcUrl: 'https://api.testnet.solana.com',
}

const LOCALNET: Cluster = {
  explorerParam: 'custom',
  id: 'solana:localnet',
  label: 'Localnet',
  rpcUrl: 'http://127.0.0.1:8899',
}

/**
 * The clusters offered in the network picker.
 *
 * Mainnet is deliberately absent. There is no sensible default endpoint to offer: the public one is
 * rate limited and serves no websocket, so account subscriptions never settle against it. To add
 * it, name it in {@link ClusterId}, define it here, and handle it in `createSolanaClient`.
 */
export const CLUSTERS: readonly Cluster[] = [DEVNET, TESTNET, LOCALNET]

export const DEFAULT_CLUSTER: Cluster = DEVNET

export function getCluster(id: string): Cluster {
  return CLUSTERS.find((cluster) => cluster.id === id) ?? DEFAULT_CLUSTER
}

/** Links a transaction signature or an address to Solana Explorer on the given cluster. */
export function getExplorerUrl(cluster: Cluster, path: string): string {
  const url = new URL(path, 'https://explorer.solana.com')

  if (cluster.explorerParam) {
    url.searchParams.set('cluster', cluster.explorerParam)
  }

  if (cluster.id === 'solana:localnet') {
    url.searchParams.set('customUrl', cluster.rpcUrl)
  }

  return url.toString()
}
