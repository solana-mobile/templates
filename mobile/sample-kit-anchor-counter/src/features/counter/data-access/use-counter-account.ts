import { useQuery } from '@tanstack/react-query'
import type { SolanaClusterId } from '@wallet-ui/react-native-kit'

import { useCluster } from '@/features/cluster/data-access/cluster-provider'
import { getCounterProgramAddress } from '@/features/counter/data-access/counter-program-address'
import { fetchMaybeCounter, findCounterPda } from '@/features/counter/generated'

export function counterAccountQueryKey(clusterId: SolanaClusterId) {
  return ['counter-account', clusterId]
}

export function useCounterAccount() {
  const { cluster, rpc } = useCluster()

  return useQuery({
    queryFn: async () => {
      const programAddress = getCounterProgramAddress(cluster.id)
      const [counterAddress] = await findCounterPda({ programAddress })

      return await fetchMaybeCounter(rpc, counterAddress)
    },
    queryKey: counterAccountQueryKey(cluster.id),
  })
}
