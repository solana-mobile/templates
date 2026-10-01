import type { Farm } from './generated'

/**
 * Game math, mirroring the on-chain integer math in
 * `programs/farming_idle/src/state.rs` so costs and yields shown in the app
 * match what the program computes exactly.
 */

/** Harvest points each plot of a crop yields per second. */
export const CROP_POINTS: readonly bigint[] = [1n, 3n, 8n, 47n, 260n, 1_400n, 7_800n, 44_000n]

/** Cost in harvest points of the first plot of each crop. */
export const CROP_COSTS: readonly bigint[] = [
  15n,
  100n,
  1_100n,
  12_000n,
  130_000n,
  1_400_000n,
  20_000_000n,
  330_000_000n,
]

export const CROP_COUNT = 8

const COST_GROWTH_NUMERATOR = 115n
const COST_GROWTH_DENOMINATOR = 100n

// The program saturates costs at u64::MAX; mirror that here.
const U64_MAX = 2n ** 64n - 1n

/** Cost of a crop's `n`th plot: 15% compounding per plot already owned, each step floored. */
export function nthPlotCost(baseCost: bigint, n: number): bigint {
  let cost = baseCost
  for (let i = 0; i < n; i++) {
    cost = (cost * COST_GROWTH_NUMERATOR) / COST_GROWTH_DENOMINATOR
  }
  return cost > U64_MAX ? U64_MAX : cost
}

/** Total cost of the next `amount` plots of a crop, starting from `owned` plots. */
export function upgradeCost(cropIndex: number, owned: number, amount: number): bigint {
  let total = 0n
  for (let n = 0; n < amount; n++) {
    total += nthPlotCost(CROP_COSTS[cropIndex], owned + n)
  }
  return total > U64_MAX ? U64_MAX : total
}

/** Harvest points all plots on the farm produce per second. */
export function pointsPerSecond(crops: readonly number[]): bigint {
  return crops.reduce((total, plots, index) => total + BigInt(plots) * CROP_POINTS[index], 0n)
}

/** Points a harvest would yield right now: 1 for the tap itself, plus per-second production since the last harvest. */
export function harvestYield(farm: Farm, nowSeconds: number): bigint {
  const elapsed = BigInt(Math.max(0, Math.floor(nowSeconds) - Number(farm.lastHarvested)))
  return 1n + pointsPerSecond(farm.crops) * elapsed
}
