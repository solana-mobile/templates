// Clones the devnet deployment of the counter program onto a local validator
// started with `bunx solana-mobile localnet` (surfpool engine), so the app can
// switch to localnet without touching a Rust toolchain: `npm run localnet:sync`.
//
// The program binary enforces its declared program ID (Anchor error 4100), so
// it must live at the same address locally. A regular `solana program deploy`
// can't choose that address — surfpool's `surfnet_setAccount` cheatcode can.
// Pass a wallet address to also airdrop localnet SOL for transaction fees:
// `npm run localnet:sync -- <wallet-address>`.
import { getBase58Decoder } from '@solana/kit'

import { getCounterProgramAddress } from '../src/features/counter/data-access/counter-program-address'
import { findCounterPda } from '../src/features/counter/generated'

const DEVNET_URL = 'https://api.devnet.solana.com'
const LOCALNET_URL = 'http://localhost:8899'
const AIRDROP_SOL = 100n

interface AccountInfo {
  data: [string, string]
  executable: boolean
  lamports: number
  owner: string
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(url, {
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const json = (await response.json()) as { error?: { message: string }; result?: { value: T } }
  if (json.error) {
    throw new Error(`${method} failed: ${json.error.message}`)
  }
  return (json.result as { value: T }).value
}

async function getAccount(url: string, address: string): Promise<AccountInfo | null> {
  return await rpc<AccountInfo | null>(url, 'getAccountInfo', [address, { encoding: 'base64' }])
}

async function cloneAccount(address: string, source: AccountInfo) {
  await rpc(LOCALNET_URL, 'surfnet_setAccount', [
    address,
    {
      data: Buffer.from(source.data[0], 'base64').toString('hex'),
      executable: source.executable,
      lamports: source.lamports,
      owner: source.owner,
    },
  ])
}

async function main() {
  const programAddress = getCounterProgramAddress('solana:devnet')
  if (getCounterProgramAddress('solana:localnet') !== programAddress) {
    throw new Error(
      'The localnet program address differs from devnet — you have your own deployment and do not need this script.',
    )
  }

  const programAccount = await getAccount(DEVNET_URL, programAddress)
  if (!programAccount) {
    throw new Error(`Program ${programAddress} not found on devnet.`)
  }
  // The program account data embeds the programdata address (bytes 4..36),
  // which holds the actual binary.
  const programDataAddress = getBase58Decoder().decode(Buffer.from(programAccount.data[0], 'base64').subarray(4, 36))
  const programDataAccount = await getAccount(DEVNET_URL, programDataAddress)
  if (!programDataAccount) {
    throw new Error(`Programdata ${programDataAddress} not found on devnet.`)
  }

  await cloneAccount(programDataAddress, programDataAccount)
  await cloneAccount(programAddress, programAccount)
  console.log(`Cloned program ${programAddress} from devnet to localnet.`)

  const [counterAddress] = await findCounterPda({ programAddress })
  if (await getAccount(LOCALNET_URL, counterAddress)) {
    console.log(`Counter account ${counterAddress} already exists on localnet, leaving it as is.`)
  } else {
    const counterAccount = await getAccount(DEVNET_URL, counterAddress)
    if (counterAccount) {
      await cloneAccount(counterAddress, counterAccount)
      console.log(`Cloned counter account ${counterAddress} from devnet.`)
    } else {
      console.log(`Counter account ${counterAddress} does not exist yet — use Initialize Counter in the app.`)
    }
  }

  // npm consumes the `--` separator, pnpm forwards it — ignore it either way.
  const [walletAddress] = process.argv.slice(2).filter((arg) => arg !== '--')
  if (walletAddress) {
    await rpc(LOCALNET_URL, 'requestAirdrop', [walletAddress, Number(AIRDROP_SOL * 1_000_000_000n)])
    console.log(`Airdropped ${AIRDROP_SOL} SOL to ${walletAddress}.`)
  } else {
    console.log('Tip: pass your wallet address to airdrop localnet SOL for fees.')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
