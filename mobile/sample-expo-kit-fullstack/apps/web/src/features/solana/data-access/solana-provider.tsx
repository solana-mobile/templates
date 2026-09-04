import { ClientProvider } from '@solana/react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { ClusterContext } from './cluster-context'
import { CLUSTERS, type Cluster, DEFAULT_CLUSTER } from './clusters'
import { createSolanaClient } from './create-solana-client'
import { registerMobileWalletAdapter } from './solana-mobile-wallet-adapter'

registerMobileWalletAdapter()

/**
 * Owns the selected cluster and the client built for it.
 *
 * One client targets one network: the wallet plugin is bound to a single chain and each network has
 * its own RPC endpoints, so switching networks builds a fresh client rather than mutating one.
 *
 * The client is built during render rather than in a layout effect. This app server-renders, and
 * layout effects do not run on the server — a provider that waits for one to publish its value
 * renders nothing on the first pass, which here means the server sends an empty document. Building
 * it in `useMemo` means there is always a client, on the server and on the client alike.
 *
 * Disposal then cannot ride on an effect's cleanup, because React may run that cleanup and then
 * re-run the effect with the same value — in StrictMode it always does — which would dispose the
 * client still in use. Instead the effect disposes only a client that has actually been superseded.
 */
export function SolanaProvider({ children }: { children: ReactNode }) {
  const [cluster, setCluster] = useState<Cluster>(DEFAULT_CLUSTER)
  const client = useMemo(() => createSolanaClient(cluster), [cluster])
  const current = useRef(client)

  useEffect(() => {
    if (current.current !== client) {
      current.current[Symbol.dispose]()
      current.current = client
    }
  }, [client])

  const value = useMemo(
    () => ({ cluster, clusters: CLUSTERS, setCluster }),
    [cluster],
  )

  return (
    <ClusterContext.Provider value={value}>
      <ClientProvider client={client}>{children}</ClientProvider>
    </ClusterContext.Provider>
  )
}
