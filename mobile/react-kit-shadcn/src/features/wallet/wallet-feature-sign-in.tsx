import { getBase58Decoder } from '@solana/kit'
import { useSignIn } from '@solana/kit-plugin-wallet/react'
import type { UiWallet } from '@wallet-standard/ui'

import { Button } from '@/components/ui/button'
import { useAppClient } from '@/features/core/data-access/use-app-client'
import { WalletUiActionCard } from '@/features/wallet/ui/wallet-ui-action-card'
import { WalletUiUnsupportedCard } from '@/features/wallet/ui/wallet-ui-unsupported-card'

const SIGN_IN_FEATURE = 'solana:signIn'

export function WalletFeatureSignIn({ wallet }: { wallet: UiWallet }) {
  if (!wallet.features.includes(SIGN_IN_FEATURE)) {
    return <WalletUiUnsupportedCard feature={SIGN_IN_FEATURE} title="Sign in" walletName={wallet.name} />
  }
  return <SignIn wallet={wallet} />
}

/**
 * Sign In With Solana.
 *
 * Unlike the other cards this is a connection operation, not just a signature — the wallet returns
 * the account it signed in with, and the plugin adopts it as the active connection. Passing the
 * already-connected wallet re-runs that against the current session, which is what makes it usable
 * as a test rather than only as a first-run login.
 *
 * The plugin's own hook is safe here: `signIn` hands the wallet only the input, never an account
 * object, so it does not hit the account-identity defect that forces the message-signing card onto
 * `@solana/react`.
 */
function SignIn({ wallet }: { wallet: UiWallet }) {
  const client = useAppClient()
  const { data, dispatch, error, isRunning } = useSignIn(client)

  return (
    <WalletUiActionCard
      description="Signs a Sign In With Solana message and adopts the account the wallet returns."
      error={error}
      result={data ? getBase58Decoder().decode(data.signature) : undefined}
      title="Sign in"
    >
      <div className="flex flex-col gap-2">
        <Button
          disabled={isRunning}
          onClick={() =>
            dispatch(wallet, {
              domain: window.location.host,
              // A real deployment mints this server-side and verifies it there. Generating it in
              // the browser proves nothing — an attacker replaying a captured signature would
              // supply their own — so treat this as a placeholder for a server-issued value.
              nonce: crypto.randomUUID(),
              statement: 'Sign in to the React Kit Shadcn example.',
              uri: window.location.origin,
            })
          }
          variant="outline"
        >
          {isRunning ? 'Waiting for wallet…' : 'Sign in'}
        </Button>
        <p className="text-muted-foreground text-xs">
          The nonce is generated in the browser here. Issue and verify it on a server before using this to authenticate
          anyone.
        </p>
      </div>
    </WalletUiActionCard>
  )
}
