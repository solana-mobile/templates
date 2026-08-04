import { getAddMemoInstruction } from '@solana-program/memo'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Address, Instruction } from '@solana/kit'
import { AppActionButton } from '@/components/app-action-button'

export function AccountFeatureSignTransaction({ address }: { address: Address }) {
  const { sendTransactions } = useMobileWallet()

  return (
    <AppActionButton
      onPress={async () => {
        const instructions: Instruction[] = [
          // You can add more instructions here
          getAddMemoInstruction({ memo: `gm from Mobile Wallet Adapter - ${address}` }),
        ]

        const signature = await sendTransactions(instructions)

        return { description: `Signature: ${signature}`, status: 'success', title: 'Send transaction' } as const
      }}
      title="Send transaction"
    />
  )
}
