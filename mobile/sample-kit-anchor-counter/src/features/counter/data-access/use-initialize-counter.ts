import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'

import { useCluster } from '@/features/cluster/data-access/cluster-provider'
import { getCounterProgramAddress } from '@/features/counter/data-access/counter-program-address'
import { counterAccountQueryKey } from '@/features/counter/data-access/use-counter-account'
import { signAndSendInstructions } from '@/features/counter/data-access/sign-and-send-instructions'
import { findCounterPda, getInitializeInstruction } from '@/features/counter/generated'

// Only needed when running against your own deployment of the program: the
// counter account must be created once per cluster before it can be read or
// incremented. The pre-deployed devnet counter is already initialized.
export function useInitializeCounter() {
  const queryClient = useQueryClient()
  const { cluster, rpc } = useCluster()
  const { account, getTransactionSigner } = useMobileWallet()

  return useMutation({
    mutationFn: async () => {
      if (!account) {
        throw new Error('Connect a wallet first.')
      }
      const programAddress = getCounterProgramAddress(cluster.id)
      const [counterAddress] = await findCounterPda({ programAddress })

      return await signAndSendInstructions({
        address: account.address,
        createInstructions: (signer) => [
          getInitializeInstruction({ counter: counterAddress, payer: signer }, { programAddress }),
        ],
        getTransactionSigner,
        rpc,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: counterAccountQueryKey(cluster.id) })
    },
  })
}
