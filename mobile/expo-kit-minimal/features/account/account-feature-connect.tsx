import React from 'react'
import { useWallet } from '@/features/wallet/use-wallet'
import { AppActionButton } from '@/components/app-action-button'

export function AccountFeatureConnect() {
  const { account, connect } = useWallet()

  return (
    <AppActionButton
      disabled={!!account}
      onPress={async () => {
        await connect()
      }}
      title="Connect"
    />
  )
}
