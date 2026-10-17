import { SeekerConnectButton, SeekerConnectConfig } from '@solana-mobile/seeker-connect-react-native'
import { useMutation } from '@tanstack/react-query'
import { Text, View } from 'react-native'
import { AppActionButton } from '@/components/app-action-button'
import { appStyles } from '@/constants/app-styles'
import { formatError } from '@/utils/format-error'
import { seeker, useSeekerAuthorization } from './use-seeker-authorization'

export function SeekerFeatureIndex(props: SeekerConnectConfig) {
  const { data: authorization, error, setAuthorization } = useSeekerAuthorization(props)
  const connect = useMutation({
    mutationFn: () => seeker(props).then((client) => client.connect()),
    onSuccess: setAuthorization,
  })
  const account = authorization?.accounts[0]
  const failure = error ?? connect.error

  return (
    <View style={appStyles.stack}>
      <Text style={appStyles.title}>Seeker Connect</Text>
      {account ? (
        <View key="connected" style={appStyles.stack}>
          <View style={appStyles.card}>
            <Text>Connected to {account.label ?? account.address}</Text>
          </View>
          <AppActionButton
            onPress={async () => {
              const message = new TextEncoder().encode(`Signing a message with ${account.address}`)
              await (await seeker(props)).signMessages([account.address], [message])
              return {
                description: `Signed a message with ${account.address}`,
                status: 'success',
                title: 'Sign Message',
              } as const
            }}
            title="Sign Message"
          />
          <AppActionButton
            onPress={async () => {
              await (await seeker(props)).disconnect()
              setAuthorization(null)
            }}
            title="Disconnect"
          />
        </View>
      ) : (
        <View key="disconnected" style={appStyles.stack}>
          <SeekerConnectButton onPress={() => connect.mutate()} style={{ height: 56 }} />
          <AppActionButton
            onPress={async () => {
              const client = await seeker(props)
              const result = await client.signIn({ statement: 'Sign in to expo-kit-minimal' })
              setAuthorization(await client.restore())
              return { description: `Signed in with ${result.address}`, status: 'success', title: 'Sign In' } as const
            }}
            title="Sign in with Seeker"
          />
        </View>
      )}
      {failure ? <Text>{formatError(failure)}</Text> : null}
    </View>
  )
}
