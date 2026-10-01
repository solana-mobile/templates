import { createKeyPairSignerFromPrivateKeyBytes, getBase64Decoder, getBase64Encoder } from '@solana/kit'
import { useQuery } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import * as SecureStore from 'expo-secure-store'

// One player wallet per owner wallet, so switching accounts switches farms.
// Base58 addresses only use characters SecureStore accepts in keys.
export function playerStoreKey(owner: string) {
  return `farming-idle-player-${owner}`
}

async function loadOrCreatePlayerKey(storeKey: string): Promise<Uint8Array> {
  const stored = await SecureStore.getItemAsync(storeKey)
  if (stored) {
    return new Uint8Array(getBase64Encoder().encode(stored))
  }
  const privateKey = crypto.getRandomValues(new Uint8Array(32))
  await SecureStore.setItemAsync(storeKey, getBase64Decoder().decode(privateKey))
  return privateKey
}

// The player wallet: a burner keypair generated on the device and kept in the
// keystore (expo-secure-store), so gameplay transactions can sign without
// opening the wallet app. It only ever holds the small gas deposit — the
// owner wallet remains the source of funds.
export function usePlayerSigner() {
  const { account } = useMobileWallet()

  return useQuery({
    enabled: !!account,
    // The signer is derived from the keystore, not the cluster: cache it for the session.
    gcTime: Infinity,
    staleTime: Infinity,
    queryKey: ['player-signer', account?.address],
    queryFn: async () => {
      if (!account) {
        return null
      }
      const privateKey = await loadOrCreatePlayerKey(playerStoreKey(account.address))
      return await createKeyPairSignerFromPrivateKeyBytes(privateKey)
    },
  })
}
