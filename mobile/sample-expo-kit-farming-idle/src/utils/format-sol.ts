const LAMPORTS_PER_SOL = 1_000_000_000

export function formatSol(lamports: bigint): string {
  const sol = Number(lamports) / LAMPORTS_PER_SOL
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 5 }).format(sol)} SOL`
}
