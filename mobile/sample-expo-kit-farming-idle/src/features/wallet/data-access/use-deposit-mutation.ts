import { getTransferSolInstruction } from '@solana-program/system'
import { lamports } from '@solana/kit'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { usePlayerSigner } from '../../player/data-access/use-player-signer'
import { useSendOwnerInstructions } from '../../transactions/data-access/use-send-owner-instructions'

export const DEPOSIT_LAMPORTS = lamports(1_000_000n) // 0.001 SOL

// Moves a little more gas money from the owner wallet to the player wallet,
// for when the initial top-up runs out. Signed by the owner through the wallet.
export function useDepositMutation() {
  const { chain } = useMobileWallet()
  const { data: player } = usePlayerSigner()
  const sendOwnerInstructions = useSendOwnerInstructions()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!player) {
        throw new Error('Player wallet not ready')
      }
      return await sendOwnerInstructions(async (owner) => [
        getTransferSolInstruction({ amount: DEPOSIT_LAMPORTS, destination: player.address, source: owner }),
      ])
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['balance', chain] }),
  })
}
