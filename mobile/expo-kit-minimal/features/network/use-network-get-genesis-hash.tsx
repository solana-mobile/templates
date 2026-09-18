import { useQuery } from '@tanstack/react-query'
import { useWallet } from '@/features/wallet/use-wallet'

export function useNetworkGetGenesisHash() {
  const { chain, client } = useWallet()
  return useQuery({
    queryKey: ['getGenesisHash', chain],
    queryFn: () => client.rpc.getGenesisHash().send(),
  })
}
