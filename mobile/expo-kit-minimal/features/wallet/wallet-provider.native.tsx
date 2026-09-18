import { MobileWalletProvider } from '@wallet-ui/react-native-kit'
import type { WalletProviderProps } from './wallet-types'

// Pass-through to the kit's Mobile Wallet Adapter provider. The seam's
// `AppIdentity` is structurally identical to the kit's, so it maps on directly.
export function WalletProvider({ children, cluster, identity }: WalletProviderProps) {
  return (
    <MobileWalletProvider cluster={cluster} identity={identity}>
      {children}
    </MobileWalletProvider>
  )
}
