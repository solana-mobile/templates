import {
  findLeaderboardPda,
  getHarvestInstruction,
  getInitializeFarmInstructionAsync,
  getInitializeLeaderboardInstructionAsync,
  getSubmitFarmInstruction,
  getUpgradeFarmInstruction,
  harvestYield,
} from '@project/anchor'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { usePlayerSigner } from '../../player/data-access/use-player-signer'
import { useSendOwnerInstructions } from '../../transactions/data-access/use-send-owner-instructions'
import { useSendPlayerInstructions } from '../../transactions/data-access/use-send-player-instructions'
import { useFarmQuery } from './use-farm-query'

// The gameplay mutations. Harvest and upgrade sign with the player wallet only
// (no approval prompt); creating a farm, submitting a score, and creating the
// leaderboard move funds or speak for the owner, so they go through the wallet.
export function useFarmProgram() {
  const { chain } = useMobileWallet()
  const { data: player } = usePlayerSigner()
  const farmQuery = useFarmQuery()
  const sendOwnerInstructions = useSendOwnerInstructions()
  const sendPlayerInstructions = useSendPlayerInstructions()
  const queryClient = useQueryClient()

  function requirePlayer() {
    if (!player) {
      throw new Error('Player wallet not ready')
    }
    return player
  }

  function requireFarm() {
    if (!farmQuery.data?.address) {
      throw new Error('Farm not found')
    }
    return farmQuery.data.address
  }

  // Refresh even when a mutation fails: the wallet may have submitted the
  // transaction after the app stopped waiting for it.
  const onSettled = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['balance', chain] }),
      queryClient.invalidateQueries({ queryKey: ['farm', chain] }),
      queryClient.invalidateQueries({ queryKey: ['leaderboard', chain] }),
    ])

  return {
    farmQuery,
    harvestMutation: useMutation({
      mutationFn: async () => {
        const farm = requireFarm()
        // Estimate the yield for the "+N" toast; the program computes the real number.
        const gained = farmQuery.data?.farm ? harvestYield(farmQuery.data.farm, Date.now() / 1000) : 1n
        await sendPlayerInstructions([getHarvestInstruction({ farm, player: requirePlayer() })])
        return gained
      },
      onSettled,
    }),
    initializeFarmMutation: useMutation({
      mutationFn: () =>
        sendOwnerInstructions(async (owner) => [
          await getInitializeFarmInstructionAsync({ owner, player: requirePlayer() }),
        ]),
      onSettled,
    }),
    initializeLeaderboardMutation: useMutation({
      mutationFn: () =>
        sendOwnerInstructions(async (payer) => [await getInitializeLeaderboardInstructionAsync({ payer })]),
      onSettled,
    }),
    submitFarmMutation: useMutation({
      mutationFn: () =>
        sendOwnerInstructions(async (owner) => {
          const [leaderboard] = await findLeaderboardPda()
          return [getSubmitFarmInstruction({ farm: requireFarm(), leaderboard, owner, player: requirePlayer() })]
        }),
      onSettled,
    }),
    upgradeFarmMutation: useMutation({
      mutationFn: ({ amount = 1, cropIndex }: { amount?: number; cropIndex: number }) =>
        sendPlayerInstructions([
          getUpgradeFarmInstruction({ amount, cropIndex, farm: requireFarm(), player: requirePlayer() }),
        ]),
      onSettled,
    }),
  }
}
