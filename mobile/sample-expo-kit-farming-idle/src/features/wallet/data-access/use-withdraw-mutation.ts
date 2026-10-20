import { getTransferSolInstruction } from '@solana-program/system'
import { lamports } from '@solana/kit'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { usePlayerSigner } from '../../player/data-access/use-player-signer'
import { useSendPlayerInstructions } from '../../transactions/data-access/use-send-player-instructions'

const TRANSACTION_FEE = 5_000n

// Sends the player wallet's balance back to the owner wallet. The player pays
// the fee out of the amount, so this needs no wallet approval either.
export function useWithdrawMutation() {
  const { account, chain, client } = useMobileWallet()
  const { data: player } = usePlayerSigner()
  const sendPlayerInstructions = useSendPlayerInstructions()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!account || !player) {
        throw new Error('Wallet not connected')
      }
      const { value: balance } = await client.rpc.getBalance(player.address).send()
      if (balance <= TRANSACTION_FEE) {
        throw new Error('The player wallet has nothing to withdraw')
      }
      return await sendPlayerInstructions([
        getTransferSolInstruction({
          amount: lamports(balance - TRANSACTION_FEE),
          destination: account.address,
          source: player,
        }),
      ])
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['balance', chain] }),
  })
}
