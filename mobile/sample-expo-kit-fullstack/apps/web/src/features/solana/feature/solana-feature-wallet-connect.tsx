import { useConnect } from '@solana/kit-plugin-wallet/react'
import type { UiWallet } from '@wallet-standard/ui'
import { LucidePlug } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAppClient } from '@/features/solana/data-access/use-app-client'

import { getErrorMessage } from '../ui/solana-ui-error'

export function SolanaFeatureWalletConnect({ wallet }: { wallet: UiWallet }) {
  const client = useAppClient()
  const connect = useConnect(client)

  // The plugin action reports failures on the result rather than by rejecting, so a declined
  // prompt has to be read off `connect.error` instead of caught at the call site.
  useEffect(() => {
    if (connect.error) {
      toast.error('Error connecting wallet', {
        description: getErrorMessage(connect.error, 'Unknown error occurred'),
      })
      connect.reset()
    }
  }, [connect])

  return (
    <Button
      disabled={connect.isRunning}
      onClick={() => connect.dispatch(wallet)}
      size="sm"
      variant="secondary"
    >
      {connect.isRunning ? <Spinner /> : <LucidePlug />}
      Connect
    </Button>
  )
}
