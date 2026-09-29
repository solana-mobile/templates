import { useConnect, useWallets } from '@solana/kit-plugin-wallet/react'
import type { UiWallet } from '@wallet-standard/ui'
import { LucideKey, LucideWallet } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useAppClient } from '@/features/solana/data-access/use-app-client'
import { useHasMounted } from '@/features/solana/data-access/use-has-mounted'
import { SolanaUiWalletIcon } from '@/features/solana/ui/solana-ui-wallet-icon'

import { useAuthWalletSignIn } from '../data-access/use-auth-wallet-sign-in'

function AuthFeatureAuthenticatedSolanaWalletConnect({
  wallet,
}: {
  wallet: UiWallet
}) {
  const client = useAppClient()
  const connect = useConnect(client)

  // The plugin action reports failures on the result rather than by rejecting, so a declined
  // prompt has to be read off `connect.error` instead of caught at the call site.
  useEffect(() => {
    if (connect.error) {
      toast.error(String(connect.error))
      connect.reset()
    }
  }, [connect])

  return (
    <Button
      className="w-full justify-start gap-2"
      disabled={connect.isRunning}
      onClick={() => connect.dispatch(wallet)}
      variant="outline"
    >
      {connect.isRunning ? (
        <Spinner className="size-5" />
      ) : (
        <SolanaUiWalletIcon
          className="size-5"
          name={wallet.name}
          src={wallet.icon}
        />
      )}
      <span className="flex-1 text-left">Connect {wallet.name}</span>
    </Button>
  )
}

function AuthFeatureAuthenticatedSolanaWalletSignIn({
  wallet,
}: {
  wallet: UiWallet
}) {
  const account = wallet.accounts[0]
  const { isPending, signInWithWallet } = useAuthWalletSignIn({
    account,
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Sign in failed')
    },
    onSuccess: () => {
      toast.success('Signed in successfully')
    },
    wallet,
  })

  return (
    <Button
      className="w-full justify-start gap-2"
      disabled={isPending}
      onClick={() => {
        void signInWithWallet()
      }}
      variant="secondary"
    >
      {isPending ? (
        <Spinner className="size-5" />
      ) : (
        <SolanaUiWalletIcon
          className="size-5"
          name={wallet.name}
          src={wallet.icon}
        />
      )}
      <span className="flex-1 text-left">Sign in with {wallet.name}</span>
      <LucideKey className="size-4" />
    </Button>
  )
}

export function AuthFeatureAuthenticatedSolana() {
  const client = useAppClient()
  const hasMounted = useHasMounted()
  const wallets = useWallets(client)

  // The server has no wallet registry to enumerate, so it renders the same empty state the browser
  // shows before mount. Without this the two disagree and hydration throws the whole tree away.
  if (!hasMounted || wallets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LucideWallet className="size-5" />
            Sign in with Solana
          </CardTitle>
          <CardDescription>
            No Solana wallets detected. Please install a wallet extension.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LucideWallet className="size-5" />
          Sign in with Solana
        </CardTitle>
        <CardDescription>
          Connect your wallet to sign in securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {wallets.map((wallet) =>
          wallet.accounts[0] ? (
            <AuthFeatureAuthenticatedSolanaWalletSignIn
              key={wallet.name}
              wallet={wallet}
            />
          ) : (
            <AuthFeatureAuthenticatedSolanaWalletConnect
              key={wallet.name}
              wallet={wallet}
            />
          ),
        )}
      </CardContent>
    </Card>
  )
}
