const units = [
  { suffix: 'q', value: 1_000_000_000_000_000 },
  { suffix: 't', value: 1_000_000_000_000 },
  { suffix: 'b', value: 1_000_000_000 },
  { suffix: 'm', value: 1_000_000 },
  { suffix: 'k', value: 1_000 },
]

// Compact display for harvest points: 1234 -> "1.2k". Idle-game scores outgrow
// safe integers eventually, but far beyond what a rounded display can show.
export function formatPoints(points: bigint): string {
  const value = Number(points)
  for (const unit of units) {
    if (value >= unit.value) {
      return (value / unit.value).toFixed(1).replace(/\.0$/, '') + unit.suffix
    }
  }
  return value.toFixed(0)
}
