import { createSolanaRpc } from '@solana/kit'
import { createSolanaDevnet, createSolanaLocalnet, type SolanaCluster } from '@wallet-ui/react-native-kit'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type SolanaRpc = ReturnType<typeof createSolanaRpc>

// The clusters the in-app switcher offers. Add createSolanaMainnet() or
// createSolanaTestnet() here once the counter program is deployed there —
// getCounterProgramAddress fails loudly for clusters without a deployment.
export const appClusters: SolanaCluster[] = [createSolanaDevnet(), createSolanaLocalnet()]

interface ClusterContextValue {
  cluster: SolanaCluster
  clusters: SolanaCluster[]
  rpc: SolanaRpc
  setCluster: (cluster: SolanaCluster) => void
}

const ClusterContext = createContext<ClusterContextValue | null>(null)

export function ClusterProvider({ children }: { children: ReactNode }) {
  const [cluster, setCluster] = useState(appClusters[0])
  const value = useMemo(
    () => ({ cluster, clusters: appClusters, rpc: createSolanaRpc(cluster.url), setCluster }),
    [cluster],
  )

  return <ClusterContext.Provider value={value}>{children}</ClusterContext.Provider>
}

export function useCluster() {
  const context = useContext(ClusterContext)
  if (!context) {
    throw new Error('useCluster must be used within a ClusterProvider.')
  }
  return context
}
