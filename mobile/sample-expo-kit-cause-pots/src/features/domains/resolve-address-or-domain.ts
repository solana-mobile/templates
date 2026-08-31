import { address, assertIsAddress, type Address } from '@solana/kit'
import { isSkrDomain, resolveSkrDomain } from './resolve-skr-domain'

// Turns user input into a wallet address: either a base58 address or a .skr
// domain that resolves to one. Throws with a readable message otherwise.
export async function resolveAddressOrDomain(input: string): Promise<Address> {
  const trimmed = input.trim()
  if (isSkrDomain(trimmed)) {
    const resolved = await resolveSkrDomain(trimmed)
    if (!resolved) {
      throw new Error(`Could not resolve ${trimmed.toLowerCase()}. Check the spelling, or use the wallet address.`)
    }
    return resolved
  }
  try {
    assertIsAddress(trimmed)
  } catch {
    throw new Error('Enter a valid wallet address or a .skr domain.')
  }
  return address(trimmed)
}
