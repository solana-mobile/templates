import { useWebWallet } from './wallet-provider.web'
import type { UseWalletReturn } from './wallet-types'

export function useWallet(): UseWalletReturn {
  return useWebWallet()
}
