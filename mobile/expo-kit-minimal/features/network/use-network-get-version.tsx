import { useQuery } from '@tanstack/react-query'
import { useWallet } from '@/features/wallet/use-wallet'

export function useNetworkGetVersion() {
  const { chain, client } = useWallet()
  return useQuery({
    queryKey: ['getVersion', chain],
    queryFn: () =>
      client.rpc
        .getVersion()
        .send()
        .then((version) => ({ core: version['solana-core'], features: version['feature-set'] })),
  })
}
