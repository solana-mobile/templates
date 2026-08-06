import {
  appendTransactionMessageInstructions,
  assertIsTransactionMessageWithSingleSendingSigner,
  createTransactionMessage,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  signature,
  type Address,
  type Instruction,
  type Signature,
  type TransactionSendingSigner,
} from '@solana/kit'

import type { SolanaRpc } from '@/features/cluster/data-access/cluster-provider'

export interface SignAndSendInstructionsProps {
  address: Address
  createInstructions: (signer: TransactionSendingSigner) => Instruction[] | Promise<Instruction[]>
  getTransactionSigner: (address: Address, minContextSlot: bigint) => TransactionSendingSigner
  rpc: SolanaRpc
}

// Builds a transaction around the wallet's sending signer, hands it to the
// wallet through Mobile Wallet Adapter, and polls until the cluster confirms.
// The wallet signs and submits for the chain its session was authorized on,
// so the wallet must support the active cluster — see the README for what
// that means on localnet.
export async function signAndSendInstructions({
  address,
  createInstructions,
  getTransactionSigner,
  rpc,
}: SignAndSendInstructionsProps): Promise<Signature> {
  const {
    context: { slot: minContextSlot },
    value: latestBlockhash,
  } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()

  const signer = getTransactionSigner(address, minContextSlot)
  const instructions = await createInstructions(signer)

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (message) => setTransactionMessageFeePayerSigner(signer, message),
    (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
    (message) => appendTransactionMessageInstructions(instructions, message),
  )
  assertIsTransactionMessageWithSingleSendingSigner(message)

  const signatureBytes = await signAndSendTransactionMessageWithSigners(message)
  const transactionSignature = signature(getBase58Decoder().decode(signatureBytes))

  await waitForConfirmation(rpc, transactionSignature)

  return transactionSignature
}

async function waitForConfirmation(rpc: SolanaRpc, transactionSignature: Signature, timeoutMs = 30_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const {
      value: [status],
    } = await rpc.getSignatureStatuses([transactionSignature]).send()

    if (status?.err) {
      throw new Error(`Transaction ${transactionSignature} failed: ${JSON.stringify(status.err)}`)
    }
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  throw new Error(`Timed out waiting for transaction ${transactionSignature} to confirm.`)
}
