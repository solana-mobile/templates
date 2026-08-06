import { address, type Address } from '@solana/kit'
import type { SolanaClusterId } from '@wallet-ui/react-native-kit'

// Deployments of the counter program in anchor/programs/counter, keyed by
// cluster. The sample ships against a pre-deployed devnet instance so it works
// out of the box. After deploying your own copy (see the README), point the
// relevant cluster at it here and in anchor/Anchor.toml.
const counterProgramAddresses: Partial<Record<SolanaClusterId, Address>> = {
  'solana:devnet': address('ADraQ2ENAbVoVZhvH5SPxWPsF2hH5YmFcgx61TafHuwu'),
  'solana:localnet': address('ADraQ2ENAbVoVZhvH5SPxWPsF2hH5YmFcgx61TafHuwu'),
}

export function getCounterProgramAddress(clusterId: SolanaClusterId): Address {
  const programAddress = counterProgramAddresses[clusterId]

  if (!programAddress) {
    throw new Error(
      `The counter program has no known deployment on "${clusterId}". Add one to counterProgramAddresses.`,
    )
  }

  return programAddress
}
