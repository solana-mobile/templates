import {
  appendTransactionMessageInstruction,
  assertIsTransactionWithBlockhashLifetime,
  createTransactionMessage,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/kit'
import { useWalletAccountTransactionSigner } from '@solana/react'
import { getAddMemoInstruction } from '@solana-program/memo'
import type { UiWalletAccount } from '@wallet-standard/ui'
import { LucideKey } from 'lucide-react'
import { type SyntheticEvent, useCallback, useMemo, useState } from 'react'

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
import { useAppClient } from '@/features/solana/data-access/use-app-client'

import { getErrorMessage } from '../ui/solana-ui-error'

export function SolanaFeatureWalletSignTransaction({
  account,
  onError,
  onSuccess,
}: {
  account: UiWalletAccount
  onError(error: unknown): void
  onSuccess(signature: string | undefined): void
}) {
  const client = useAppClient()
  const [isLoading, setIsLoading] = useState(false)
  const [text, setText] = useState('Hello Solana!')
  const transactionSigner = useWalletAccountTransactionSigner(
    account,
    client.chain,
  )
  const sendAndConfirmTransaction = useMemo(
    () => sendAndConfirmTransactionFactory(client),
    [client],
  )

  const signTransaction = useCallback(async () => {
    const { value: latestBlockhash } = await client.rpc
      .getLatestBlockhash({ commitment: 'confirmed' })
      .send()
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (transaction) =>
        setTransactionMessageFeePayerSigner(transactionSigner, transaction),
      (transaction) =>
        setTransactionMessageLifetimeUsingBlockhash(
          latestBlockhash,
          transaction,
        ),
      (transaction) =>
        appendTransactionMessageInstruction(
          getAddMemoInstruction({ memo: text }),
          transaction,
        ),
    )

    const transaction = await signTransactionMessageWithSigners(message)

    assertIsTransactionWithBlockhashLifetime(transaction)

    const signature = getSignatureFromTransaction(transaction)

    await sendAndConfirmTransaction(transaction, { commitment: 'confirmed' })

    if (!signature) {
      throw new Error()
    }

    return signature
  }, [client.rpc, sendAndConfirmTransaction, text, transactionSigner])

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        setIsLoading(true)

        try {
          const signature = await signTransaction()
          onSuccess(signature)
        } catch (error) {
          onError(getErrorMessage(error, 'Unknown error occurred'))
        } finally {
          setIsLoading(false)
        }
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Sign Transaction</CardTitle>
          <CardDescription>Sign a transaction with a memo text</CardDescription>
          <CardAction>
            <Button
              disabled={!text || isLoading}
              size="lg"
              type="submit"
              variant="outline"
            >
              {isLoading ? <Spinner /> : <LucideKey />}
              Sign Transaction
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            onChange={(event: SyntheticEvent<HTMLInputElement>) =>
              setText(event.currentTarget.value)
            }
            placeholder="Write a memo text to sign as a transaction"
            value={text}
          />
        </CardContent>
      </Card>
    </form>
  )
}
