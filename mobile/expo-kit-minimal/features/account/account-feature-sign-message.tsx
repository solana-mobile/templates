import { useWallet } from '@/features/wallet/use-wallet'
import { Address } from '@solana/kit'
import { AppActionButton } from '@/components/app-action-button'

export function AccountFeatureSignMessage({ address }: { address: Address }) {
  const { signMessages } = useWallet()

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
