import React from 'react'
import { useWallet } from '@/features/wallet/use-wallet'
import { AppActionButton } from '@/components/app-action-button'

export function AccountFeatureDisconnect() {
  const { account, disconnect } = useWallet()

  return (
    <AppActionButton
      disabled={!account}
      onPress={async () => {
        await disconnect()
      }}
      title="Disconnect"
    />
  )
}
