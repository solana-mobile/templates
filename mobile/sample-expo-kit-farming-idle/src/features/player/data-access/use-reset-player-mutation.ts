import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import * as SecureStore from 'expo-secure-store'
import { playerStoreKey } from './use-player-signer'

// Deletes the stored player keypair; the next usePlayerSigner read generates a
// fresh one. The old player's farm PDA and any lamports it still holds become
// unreachable, so the UI asks the user to withdraw first.
export function useResetPlayerMutation() {
  const { account } = useMobileWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!account) {
        throw new Error('Wallet not connected')
      }
      await SecureStore.deleteItemAsync(playerStoreKey(account.address))
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['player-signer'] })
      await queryClient.invalidateQueries({ queryKey: ['farm'] })
      await queryClient.invalidateQueries({ queryKey: ['balance'] })
    },
  })
}
