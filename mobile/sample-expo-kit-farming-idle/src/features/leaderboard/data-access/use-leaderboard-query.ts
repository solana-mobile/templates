import { fetchMaybeLeaderboard, findLeaderboardPda } from '@project/anchor'
import { useQuery } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'

// Empty leaderboard seats hold the default (all-zero) public key.
const EMPTY_SEAT = '11111111111111111111111111111111'

// The global top-5 leaderboard, sorted best first. `leaderboard` is null until
// someone runs initializeLeaderboard on this cluster.
export function useLeaderboardQuery() {
  const { chain, client } = useMobileWallet()

  return useQuery({
    queryKey: ['leaderboard', chain],
    queryFn: async () => {
      const [address] = await findLeaderboardPda()
      const maybeLeaderboard = await fetchMaybeLeaderboard(client.rpc, address)
      if (!maybeLeaderboard.exists) {
        return { address, entries: null }
      }
      const entries = maybeLeaderboard.data.entries
        .filter((entry) => entry.owner !== EMPTY_SEAT)
        .sort((a, b) => (a.points > b.points ? -1 : a.points < b.points ? 1 : 0))
      return { address, entries }
    },
  })
}
