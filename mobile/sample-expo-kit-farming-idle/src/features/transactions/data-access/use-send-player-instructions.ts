import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Instruction,
} from '@solana/kit'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { usePlayerSigner } from '../../player/data-access/use-player-signer'
import { waitForConfirmation } from '../../../utils/wait-for-confirmation'

// Sends instructions signed only by the local player keypair: no wallet app,
// no approval prompt. This is what keeps the harvest-upgrade loop instant.
export function useSendPlayerInstructions() {
  const { client } = useMobileWallet()
  const { data: player } = usePlayerSigner()

  return async function sendPlayerInstructions(instructions: Instruction[]) {
    if (!player) {
      throw new Error('Player wallet not ready')
    }
    const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send()

    const transaction = await pipe(
      createTransactionMessage({ version: 0 }),
      (message) => setTransactionMessageFeePayerSigner(player, message),
      (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
      (message) => appendTransactionMessageInstructions(instructions, message),
      (message) => signTransactionMessageWithSigners(message),
    )

    const transactionSignature = getSignatureFromTransaction(transaction)
    await client.rpc
      .sendTransaction(getBase64EncodedWireTransaction(transaction), {
        encoding: 'base64',
        preflightCommitment: 'confirmed',
      })
      .send()
    await waitForConfirmation(client.rpc, transactionSignature)
    return transactionSignature
  }
}
