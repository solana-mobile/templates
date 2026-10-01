import type { Address } from '@solana/kit'
import { useQuery } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'

// A wallet's balance in lamports. Takes the address as a parameter so the
// wallet screen can watch both the owner and the player wallet.
export function useBalanceQuery({ address }: { address: Address | undefined }) {
  const { chain, client } = useMobileWallet()

  return useQuery({
    enabled: !!address,
    queryKey: ['balance', chain, address],
    queryFn: async () => {
      if (!address) {
        return null
      }
      const { value } = await client.rpc.getBalance(address).send()
      return value
    },
  })
}
