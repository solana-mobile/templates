import { fetchMaybeFarm, findFarmPda } from '@project/anchor'
import { useQuery } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { usePlayerSigner } from '../../player/data-access/use-player-signer'

// The farm PDA for the connected owner and the current player wallet. The
// address always resolves; `farm` is null until initializeFarm creates it.
export function useFarmQuery() {
  const { account, chain, client } = useMobileWallet()
  const { data: player } = usePlayerSigner()

  return useQuery({
    enabled: !!account && !!player,
    queryKey: ['farm', chain, account?.address, player?.address],
    queryFn: async () => {
      if (!account || !player) {
        return null
      }
      const [address] = await findFarmPda({ owner: account.address, player: player.address })
      const maybeFarm = await fetchMaybeFarm(client.rpc, address)
      return { address, farm: maybeFarm.exists ? maybeFarm.data : null }
    },
  })
}
