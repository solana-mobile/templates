import { useCallback } from 'react'

import { getCluster, getExplorerUrl } from './clusters'
import { useAppClient } from './use-app-client'

/**
 * Builds Solana Explorer links for the network the client is actually talking to.
 *
 * The cluster is read off the client rather than off `useCluster()`. Both hold the same value in a
 * steady state, but during a network switch the selection flips one render before the rebuilt
 * client is published — and a link that points at a different network than the request it came from
 * is worse than one that lags by a render.
 */
export function useSolanaExplorer() {
  const { chain } = useAppClient()

  return useCallback(
    (path: string) => getExplorerUrl(getCluster(chain), path),
    [chain],
  )
}
