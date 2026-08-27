import {
  address,
  createSolanaRpc,
  getAddressDecoder,
  getAddressEncoder,
  getBase64Encoder,
  getProgramDerivedAddress,
  getU64Decoder,
  getUtf8Encoder,
  type Address,
} from '@solana/kit'

// .skr domains are AllDomains name service records. They live on mainnet no
// matter which cluster the app targets, so resolution uses its own RPC.
const MAINNET_RPC_URL = 'https://api.mainnet-beta.solana.com'

const ANS_PROGRAM_ADDRESS = address('ALTNSZ46uaAUU7XUV6awvdorLGqAsPwa9shm7h4uP2FK')
const NAME_HOUSE_PROGRAM_ADDRESS = address('NH3uX6FtVE2fNREAioP7hm5RaozotZxeL6khU1EHx51')
const TLD_HOUSE_PROGRAM_ADDRESS = address('TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S')
// The name record of the 'ANS' origin, the parent of every top-level domain record.
const ORIGIN_TLD_ADDRESS = address('3mX9b4AZaQehNoQGfckVcmgmA6bkBoFcbLj9RMmMyNcU')
const HASH_PREFIX = 'ALT Name Service'

export function isSkrDomain(input: string): boolean {
  return input.trim().toLowerCase().endsWith('.skr')
}

// Resolves a .skr domain to the wallet that owns it, or null when the domain
// does not exist or has expired. Derivation: every record address is a PDA of
// [sha256(prefix + name), name class (unset), parent record].
export async function resolveSkrDomain(domain: string): Promise<Address | null> {
  const name = domain
    .trim()
    .toLowerCase()
    .replace(/\.skr$/, '')
  if (!name) {
    return null
  }
  const rpc = createSolanaRpc(MAINNET_RPC_URL)

  const tldRecord = await findNameRecordAddress('.skr', ORIGIN_TLD_ADDRESS)
  const nameRecord = await findNameRecordAddress(name, tldRecord)
  const { value: accountInfo } = await rpc.getAccountInfo(nameRecord, { encoding: 'base64' }).send()
  if (!accountInfo) {
    return null
  }

  // Name record layout: discriminator (8), parent (32), owner (32), class (32),
  // expires at (u64 LE), created at (u64 LE), non-transferable (1).
  const data = getBase64Encoder().encode(accountInfo.data[0])
  const owner = getAddressDecoder().decode(data.slice(40, 72))
  const [expiresAt] = getU64Decoder().read(data, 104)
  if (expiresAt !== 0n && Number(expiresAt) * 1000 < Date.now()) {
    return null
  }

  // Tokenized domains: the record is owned by an NFT record PDA and the real
  // owner is whoever holds the domain NFT.
  const nftRecord = await findNftRecordAddress(nameRecord)
  if (owner !== nftRecord) {
    return owner
  }
  return await resolveNftRecordOwner(rpc, nftRecord)
}

async function findNameRecordAddress(name: string, parent: Address): Promise<Address> {
  const nameBytes = new Uint8Array(getUtf8Encoder().encode(HASH_PREFIX + name))
  const hashedName = new Uint8Array(await crypto.subtle.digest('SHA-256', nameBytes))
  const [record] = await getProgramDerivedAddress({
    programAddress: ANS_PROGRAM_ADDRESS,
    seeds: [hashedName, new Uint8Array(32), getAddressEncoder().encode(parent)],
  })
  return record
}

async function findNftRecordAddress(nameRecord: Address): Promise<Address> {
  const [tldHouse] = await getProgramDerivedAddress({
    programAddress: TLD_HOUSE_PROGRAM_ADDRESS,
    seeds: [getUtf8Encoder().encode('tld_house'), getUtf8Encoder().encode('.skr')],
  })
  const [nameHouse] = await getProgramDerivedAddress({
    programAddress: NAME_HOUSE_PROGRAM_ADDRESS,
    seeds: [getUtf8Encoder().encode('name_house'), getAddressEncoder().encode(tldHouse)],
  })
  const [nftRecord] = await getProgramDerivedAddress({
    programAddress: NAME_HOUSE_PROGRAM_ADDRESS,
    seeds: [
      getUtf8Encoder().encode('nft_record'),
      getAddressEncoder().encode(nameHouse),
      getAddressEncoder().encode(nameRecord),
    ],
  })
  return nftRecord
}

async function resolveNftRecordOwner(
  rpc: ReturnType<typeof createSolanaRpc>,
  nftRecord: Address,
): Promise<Address | null> {
  const { value: accountInfo } = await rpc.getAccountInfo(nftRecord, { encoding: 'base64' }).send()
  if (!accountInfo) {
    return null
  }
  // NFT record layout: discriminator (8), tag (1), bump (1), name account (32),
  // owner (32), mint (32). Tag 1 means the record is active.
  const data = getBase64Encoder().encode(accountInfo.data[0])
  if (data[8] !== 1) {
    return null
  }
  const mint = getAddressDecoder().decode(data.slice(74, 106))
  const { value: largestAccounts } = await rpc.getTokenLargestAccounts(mint).send()
  const holder = largestAccounts[0]?.address
  if (!holder) {
    return null
  }
  const { value: tokenAccount } = await rpc.getAccountInfo(holder, { encoding: 'jsonParsed' }).send()
  const parsed = tokenAccount?.data as { parsed?: { info?: { owner?: string } } } | undefined
  const owner = parsed && 'parsed' in parsed ? parsed.parsed?.info?.owner : undefined
  return owner ? address(owner) : null
}
