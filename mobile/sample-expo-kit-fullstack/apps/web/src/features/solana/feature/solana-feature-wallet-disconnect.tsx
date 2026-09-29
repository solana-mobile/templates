import { useDisconnect } from '@solana/kit-plugin-wallet/react'
import type { UiWallet } from '@wallet-standard/ui'
import { LucideUnplug } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAppClient } from '@/features/solana/data-access/use-app-client'

export function SolanaFeatureWalletDisconnect({
  wallet,
}: {
  wallet: UiWallet
}) {
  const client = useAppClient()
  const disconnect = useDisconnect(client)

  return (
    <Button
      disabled={disconnect.isRunning}
      onClick={() => disconnect.dispatch(wallet)}
      size="sm"
      variant="secondary"
    >
      {disconnect.isRunning ? <Spinner /> : <LucideUnplug />}
      Disconnect
    </Button>
  )
}
