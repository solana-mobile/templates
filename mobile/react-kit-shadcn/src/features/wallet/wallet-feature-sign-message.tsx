import { getBase58Decoder } from '@solana/kit'
import { useAction, useSignMessage } from '@solana/react'
import type { UiWalletAccount } from '@wallet-standard/ui'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WalletUiActionCard } from '@/features/wallet/ui/wallet-ui-action-card'

/**
 * Signs a message with the connected account.
 *
 * This deliberately uses `useSignMessage` from `@solana/react` rather than the same-named hook in
 * `@solana/kit-plugin-wallet/react`. The plugin's version hands the wallet its own
 * `UiWalletAccount` — a ui-registry wrapper — where wallets expect the account object they
 * themselves published, and they reject it with "Invalid account". The `@solana/react` hook maps
 * the wrapper back to the underlying wallet-standard account first.
 *
 * The transaction path is unaffected either way: it goes through `createSignerFromWalletAccount`,
 * which does that mapping. Only the plugin's direct message-signing shortcut skips it.
 */
export function WalletFeatureSignMessage({ account }: { account: UiWalletAccount }) {
  const signMessage = useSignMessage(account)
  const [message, setMessage] = useState('Hello from Solana Kit')

  const { data, dispatch, error, isRunning } = useAction(async (_abortSignal, text: string) => {
    const { signature } = await signMessage({ message: new TextEncoder().encode(text) })
    return getBase58Decoder().decode(signature)
  })

  return (
    <WalletUiActionCard
      description="Signs arbitrary bytes. Nothing is sent to the network, and no fee is paid."
      error={error}
      result={data}
      title="Sign message"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input onChange={(event) => setMessage(event.target.value)} placeholder="Message to sign" value={message} />
        <Button disabled={isRunning || message.length === 0} onClick={() => dispatch(message)} variant="outline">
          {isRunning ? 'Waiting for wallet…' : 'Sign message'}
        </Button>
      </div>
    </WalletUiActionCard>
  )
}
