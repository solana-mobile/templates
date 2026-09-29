import { getBase64Decoder } from '@solana/kit'
import { useSignMessage } from '@solana/react'
import type { UiWalletAccount } from '@wallet-standard/ui'
import { LucideKey } from 'lucide-react'
import { type SyntheticEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { getErrorMessage } from '../ui/solana-ui-error'

/**
 * Signs a message with the connected account.
 *
 * This deliberately uses `useSignMessage` from `@solana/react` rather than the same-named hook in
 * `@solana/kit-plugin-wallet/react`. The plugin's version hands the wallet its own
 * `UiWalletAccount` — a ui-registry wrapper — where wallets expect the account object they
 * themselves published, and they reject it with "Invalid account". The `@solana/react` hook maps
 * the wrapper back to the underlying wallet-standard account first.
 */
export function SolanaFeatureWalletSignMessage({
  account,
  onError,
  onSuccess,
}: {
  account: UiWalletAccount
  onError(error: unknown): void
  onSuccess(signature: string | undefined): void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [text, setText] = useState('Hello Solana!')
  const signMessage = useSignMessage(account)

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        setIsLoading(true)

        try {
          const { signature } = await signMessage({
            message: new TextEncoder().encode(text),
          })
          onSuccess(getBase64Decoder().decode(signature))
        } catch (error) {
          onError(getErrorMessage(error, 'Unknown error occurred'))
        } finally {
          setIsLoading(false)
        }
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Sign Message</CardTitle>
          <CardDescription>Sign a message with this text</CardDescription>
          <CardAction>
            <Button
              disabled={!text || isLoading}
              size="lg"
              type="submit"
              variant="outline"
            >
              {isLoading ? <Spinner /> : <LucideKey />}
              Sign Message
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            onChange={(event: SyntheticEvent<HTMLInputElement>) =>
              setText(event.currentTarget.value)
            }
            placeholder="Write a message to sign"
            value={text}
          />
        </CardContent>
      </Card>
    </form>
  )
}
