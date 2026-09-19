import { useWallet } from '@/features/wallet/use-wallet'
import type { WalletAccount } from '@/features/wallet/wallet-types'
import { AppActionButton } from '@/components/app-action-button'
import { ellipsify } from '@/utils/ellipsify'

export function AccountFeatureSignIn({ account }: { account?: WalletAccount }) {
  const { chain, identity, signIn } = useWallet()

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
      title={`Sign In ${account ? `with ${account.label ?? ellipsify(account.address)}` : 'and connect'}`}
    />
  )
}
