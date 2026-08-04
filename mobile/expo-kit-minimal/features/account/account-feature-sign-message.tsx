import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Address } from '@solana/kit'
import { AppActionButton } from '@/components/app-action-button'

export function AccountFeatureSignMessage({ address }: { address: Address }) {
  const { signMessages } = useMobileWallet()

  return (
    <AppActionButton
      onPress={async () => {
        await signMessages(new TextEncoder().encode(`Signing a message with ${address}`))
        return { description: `Signed a message with ${address}`, status: 'success', title: 'Sign Message' } as const
      }}
      title="Sign Message"
    />
  )
}
