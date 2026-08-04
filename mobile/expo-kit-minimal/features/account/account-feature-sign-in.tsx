import { Account, useMobileWallet } from '@wallet-ui/react-native-kit'
import { AppActionButton } from '@/components/app-action-button'

export function AccountFeatureSignIn({ account }: { account?: Account }) {
  const { chain, identity, signIn } = useMobileWallet()

  return (
    <AppActionButton
      onPress={async () => {
        const result = await signIn({
          address: account?.address.toString(),
          chainId: chain,
          uri: identity.uri,
        })
        return {
          description: `Signed in with ${result.account.address}`,
          status: 'success',
          title: 'Sign In',
        } as const
      }}
      title={`Sign In ${account ? `with ${account.label}` : 'and connect'}`}
    />
  )
}
