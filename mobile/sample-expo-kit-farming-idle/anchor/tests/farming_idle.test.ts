import {
  appendTransactionMessageInstruction,
  assertIsTransactionWithBlockhashLifetime,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type KeyPairSigner,
} from '@solana/kit'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  fetchFarm,
  fetchLeaderboard,
  fetchMaybeLeaderboard,
  findFarmPda,
  findLeaderboardPda,
  getHarvestInstruction,
  getInitializeFarmInstructionAsync,
  getInitializeLeaderboardInstructionAsync,
  getSubmitFarmInstruction,
  getUpgradeFarmInstruction,
  upgradeCost,
} from '../src'
import { createFundedSigner } from './create-funded-signer'

// The `anchor test` command starts a local validator and provides this variable.
const rpcUrl = process.env.ANCHOR_PROVIDER_URL!
const rpc = createSolanaRpc(rpcUrl)
const rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl.replace('http', 'ws').replace('8899', '8900'))
const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })

describe('farming_idle', () => {
  // The owner wallet holds the funds; the player is the burner wallet that
  // signs gameplay transactions. In the app the owner signs through Mobile
  // Wallet Adapter, but the program only sees two ordinary signers.
  let owner: KeyPairSigner
  let player: KeyPairSigner
  let farm: Address

  beforeAll(async () => {
    owner = await createFundedSigner({ rpc, rpcSubscriptions })
    player = await createFundedSigner({ rpc, rpcSubscriptions })
    farm = (await findFarmPda({ player: player.address, owner: owner.address }))[0]
  })

  it('initializes a farm', async () => {
    // ARRANGE
    const instruction = await getInitializeFarmInstructionAsync({ owner, player })

    // ACT
    await sendInstruction({ instruction, feePayer: owner })

    // ASSERT
    const { data } = await fetchFarm(rpc, farm)
    expect(data.owner).toEqual(owner.address)
    expect(data.player).toEqual(player.address)
    expect(data.harvestPoints).toEqual(0n)
    expect(data.crops).toEqual(new Array(8).fill(0))
    expect(data.highScore).toEqual(0n)
    expect(data.lastHarvested).toEqual(data.createdAt)
  })

  it('tops up an empty player wallet on initialize', async () => {
    // ARRANGE: a brand-new burner wallet with no lamports at all.
    const emptyPlayer = await generateKeyPairSigner()
    const instruction = await getInitializeFarmInstructionAsync({ owner, player: emptyPlayer })

    // ACT: the owner pays, so the empty player can still co-sign.
    await sendInstruction({ instruction, feePayer: owner })

    // ASSERT: the program moved gas money from the owner to the player.
    const { value: balance } = await rpc.getBalance(emptyPlayer.address).send()
    expect(balance).toEqual(10_000_000n)
  })

  it('rejects an upgrade the farm cannot afford', async () => {
    // ARRANGE
    const instruction = getUpgradeFarmInstruction({ farm, player, cropIndex: 0, amount: 1 })

    // ACT + ASSERT
    await expect(sendInstruction({ instruction, feePayer: player })).rejects.toThrow()
  })

  it('rejects a harvest signed by a different player', async () => {
    // ARRANGE
    const intruder = await createFundedSigner({ rpc, rpcSubscriptions })
    const instruction = getHarvestInstruction({ farm, player: intruder })

    // ACT + ASSERT
    await expect(sendInstruction({ instruction, feePayer: intruder })).rejects.toThrow()
  })

  it('harvests points with only the player signing', async () => {
    // ARRANGE
    const instruction = getHarvestInstruction({ farm, player })

    // ACT
    await sendInstruction({ instruction, feePayer: player })

    // ASSERT: a tap on a farm without crops yields exactly one point.
    const { data } = await fetchFarm(rpc, farm)
    expect(data.harvestPoints).toEqual(1n)
  })

  it('buys a crop plot once the farm can afford it', async () => {
    // ARRANGE: tap until the farm can pay for the first plot of the first crop.
    const cost = upgradeCost(0, 0, 1)
    let points = 1n
    while (points < cost) {
      await sendInstruction({ instruction: getHarvestInstruction({ farm, player }), feePayer: player })
      points = (await fetchFarm(rpc, farm)).data.harvestPoints
    }

    // ACT
    await sendInstruction({
      instruction: getUpgradeFarmInstruction({ farm, player, cropIndex: 0, amount: 1 }),
      feePayer: player,
    })

    // ASSERT
    const { data } = await fetchFarm(rpc, farm)
    expect(data.crops[0]).toEqual(1)
    expect(data.harvestPoints).toEqual(points - cost)
  })

  it('initializes the leaderboard once', async () => {
    // ARRANGE
    const [leaderboard] = await findLeaderboardPda()
    const existing = await fetchMaybeLeaderboard(rpc, leaderboard)
    if (existing.exists) {
      // Another run against the same validator already created the singleton.
      return
    }
    const instruction = await getInitializeLeaderboardInstructionAsync({ payer: owner })

    // ACT
    await sendInstruction({ instruction, feePayer: owner })

    // ASSERT
    const { data } = await fetchLeaderboard(rpc, leaderboard)
    expect(data.entries).toHaveLength(5)
    expect(data.entries.every((entry) => entry.points === 0n)).toBe(true)
  })

  it('submits the score and resets the farm', async () => {
    // ARRANGE: harvest once more so the run has a score to submit.
    await sendInstruction({ instruction: getHarvestInstruction({ farm, player }), feePayer: player })
    const [leaderboard] = await findLeaderboardPda()
    const scoreBefore = (await fetchFarm(rpc, farm)).data.harvestPoints
    expect(scoreBefore > 0n).toBe(true)
    const instruction = getSubmitFarmInstruction({ farm, leaderboard, owner, player })

    // ACT
    await sendInstruction({ instruction, feePayer: owner })

    // ASSERT: the owner wallet is on the leaderboard and the run started over.
    const { data } = await fetchLeaderboard(rpc, leaderboard)
    expect(data.entries.some((entry) => entry.owner === owner.address && entry.points >= scoreBefore)).toBe(true)
    const { data: farmData } = await fetchFarm(rpc, farm)
    expect(farmData.harvestPoints).toEqual(0n)
    expect(farmData.crops).toEqual(new Array(8).fill(0))
    expect(farmData.highScore >= scoreBefore).toBe(true)
  })
})

// Helper function to keep the tests DRY
async function sendInstruction({ feePayer, instruction }: { feePayer: KeyPairSigner; instruction: Instruction }) {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
  const transaction = await pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstruction(instruction, tx),
    (tx) => signTransactionMessageWithSigners(tx),
  )
  assertIsTransactionWithBlockhashLifetime(transaction)
  await sendAndConfirm(transaction, { commitment: 'confirmed' })
  return getSignatureFromTransaction(transaction)
}
