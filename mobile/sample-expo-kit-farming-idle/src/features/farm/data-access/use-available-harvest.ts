import { harvestYield, pointsPerSecond, type Farm } from '@project/anchor'
import { useEffect, useState } from 'react'

// Live estimate of what a harvest would yield right now, ticking a few times a
// second. The program computes the real number from the cluster clock when the
// harvest lands.
export function useAvailableHarvest(farm: Farm | null | undefined) {
  const [now, setNow] = useState(() => Date.now() / 1000)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now() / 1000), 250)
    return () => clearInterval(interval)
  }, [])

  if (!farm) {
    return { availableHarvest: 0n, perSecond: 0n }
  }
  return { availableHarvest: harvestYield(farm, now), perSecond: pointsPerSecond(farm.crops) }
}
