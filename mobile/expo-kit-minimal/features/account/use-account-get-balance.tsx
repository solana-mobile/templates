import { useQuery } from '@tanstack/react-query'
import { useWallet } from '@/features/wallet/use-wallet'
import { Address } from '@solana/kit'

export function useAccountGetBalance({ address }: { address: Address }) {
  const { chain, client } = useWallet()
  return useQuery({
    queryKey: ['get-balance', chain, address],
    queryFn: () => client.rpc.getBalance(address).send(),
  })
}
