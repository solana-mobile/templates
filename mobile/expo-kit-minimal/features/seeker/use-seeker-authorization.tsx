import { SeekerConnect, SeekerConnectConfig, StoredAuthorization } from '@solana-mobile/seeker-connect-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export async function seeker(config: SeekerConnectConfig) {
  await SeekerConnect.configure(config)
  return SeekerConnect
}

export function useSeekerAuthorization(config: SeekerConnectConfig) {
  const queryClient = useQueryClient()
  const queryKey = ['seeker-authorization', config.chain]
  const query = useQuery({
    queryKey,
    queryFn: () => seeker(config).then((client) => client.restore()),
  })
  return {
    ...query,
    setAuthorization: (authorization: StoredAuthorization | null) => queryClient.setQueryData(queryKey, authorization),
  }
}
