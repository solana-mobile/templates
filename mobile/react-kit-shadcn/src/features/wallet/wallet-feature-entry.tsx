import { useConnectedWallet } from '@solana/kit-plugin-wallet/react'
import { WalletIcon } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppClient } from '@/features/core/data-access/use-app-client'

import { WalletFeatureAccount } from './wallet-feature-account'
import { WalletFeatureSendMemo } from './wallet-feature-send-memo'
import { WalletFeatureSignIn } from './wallet-feature-sign-in'
import { WalletFeatureSignMessage } from './wallet-feature-sign-message'
import { WalletFeatureSignTransaction } from './wallet-feature-sign-transaction'

export function WalletFeatureEntry() {
  const client = useAppClient()
  const connected = useConnectedWallet(client)

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="size-4" />
            No wallet connected
          </CardTitle>
          <CardDescription>
            Connect a wallet to read your balance and run the examples below it. On an Android browser the list includes
            any wallet installed on this device, over Mobile Wallet Adapter.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <WalletFeatureAccount account={connected.account} />
      <div className="grid gap-6 lg:grid-cols-2">
        <WalletFeatureSignIn wallet={connected.wallet} />
        <WalletFeatureSignMessage account={connected.account} />
        <WalletFeatureSignTransaction account={connected.account} walletName={connected.wallet.name} />
        <WalletFeatureSendMemo />
      </div>
    </div>
  )
}
