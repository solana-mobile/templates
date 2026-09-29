import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useIsWalletReady,
  useSelectAccount,
  useWallets,
} from '@solana/kit-plugin-wallet/react'
import { useWallets as useRegisteredWallets } from '@wallet-standard/react'
import type { UiWallet } from '@wallet-standard/ui'
import { LucideCheck, LucideWallet } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getCluster } from '@/features/solana/data-access/clusters'
import { useAppClient } from '@/features/solana/data-access/use-app-client'
import { useHasMounted } from '@/features/solana/data-access/use-has-mounted'
import { ellipsify } from '@/lib/ellipsify'

import { SolanaUiWalletIcon } from '../ui/solana-ui-wallet-icon'

function byName(a: UiWallet, b: UiWallet) {
  return a.name.localeCompare(b.name)
}

/**
 * The connect control.
 *
 * Every wallet here comes from the same wallet-standard registry, so a browser extension and a
 * phone reached over Mobile Wallet Adapter are the same kind of entry and take the same code path.
 * Wallets that do not advertise the active cluster's chain are listed but disabled — one that
 * quietly vanishes on a network switch reads as a bug rather than as an answer.
 */
export function SolanaFeatureWalletSelect() {
  const client = useAppClient()
  const cluster = getCluster(client.chain)
  const hasMounted = useHasMounted()
  const connected = useConnectedWallet(client)
  const isReady = useIsWalletReady(client)
  const connect = useConnect(client)
  const disconnect = useDisconnect(client)
  const selectAccount = useSelectAccount(client)

  // Two lists, deliberately. The plugin's `useWallets` is already filtered to wallets that
  // advertise the active chain; the registry's is everything installed. The difference is the set
  // worth showing greyed out.
  const discoveredWallets = useWallets(client)
  const registeredWallets = useRegisteredWallets()

  // Both lists are sorted by name. Wallet-standard hands them over in registration order, which is
  // whichever extension injected itself first — a race that can come out differently on the next
  // load, and a menu whose entries move between visits invites clicking the wrong wallet.
  const wallets = useMemo(
    () => [...discoveredWallets].sort(byName),
    [discoveredWallets],
  )
  const unsupportedWallets = useMemo(
    () =>
      registeredWallets
        .filter(
          (wallet) =>
            !discoveredWallets.some(
              (supported) => supported.name === wallet.name,
            ),
        )
        .sort(byName),
    [discoveredWallets, registeredWallets],
  )

  // Hold the button until this has mounted and the silent reconnect has settled: the first keeps
  // the server and client renders identical, the second keeps a remembered wallet from flashing
  // "Select Wallet" on the way back in.
  if (!hasMounted || !isReady) {
    return (
      <Button disabled variant="outline">
        <LucideWallet />
        Connecting…
      </Button>
    )
  }

  if (!connected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline">
              <LucideWallet />
              {connect.isRunning ? 'Connecting…' : 'Select Wallet'}
            </Button>
          }
        />
        <DropdownMenuContent className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Available wallets</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {wallets.length === 0 && unsupportedWallets.length === 0 ? (
            <DropdownMenuItem className="cursor-pointer">
              <a
                href="https://solana.com/solana-wallets"
                rel="noopener noreferrer"
                target="_blank"
              >
                Get a Solana wallet to connect.
              </a>
            </DropdownMenuItem>
          ) : null}
          {wallets.length === 0 && unsupportedWallets.length > 0 ? (
            <div className="px-2 py-3 text-muted-foreground text-sm">
              None of your wallets support {cluster.label}.
            </div>
          ) : null}
          {wallets.map((wallet) => (
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={connect.isRunning}
              key={wallet.name}
              onClick={() => connect.dispatch(wallet)}
            >
              <SolanaUiWalletIcon name={wallet.name} src={wallet.icon} />
              {wallet.name}
            </DropdownMenuItem>
          ))}
          {unsupportedWallets.map((wallet) => (
            <DropdownMenuItem disabled key={wallet.name}>
              <SolanaUiWalletIcon name={wallet.name} src={wallet.icon} />
              {wallet.name}
              <span className="ml-auto text-muted-foreground text-xs">
                No {cluster.label}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const otherWallets = wallets.filter(
    (wallet) => wallet.name !== connected.wallet.name,
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            <SolanaUiWalletIcon
              name={connected.wallet.name}
              src={connected.wallet.icon}
            />
            <span className="font-mono">
              {ellipsify(connected.account.address)}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{connected.wallet.name}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {connected.wallet.accounts.map((account) => (
          <DropdownMenuItem
            className="cursor-pointer"
            key={account.address}
            onClick={() => selectAccount(account)}
          >
            {account.address === connected.account.address ? (
              <LucideCheck />
            ) : (
              <span className="size-4" />
            )}
            <span className="font-mono">{ellipsify(account.address)}</span>
          </DropdownMenuItem>
        ))}
        {otherWallets.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Switch wallet</DropdownMenuLabel>
            </DropdownMenuGroup>
            {/*
              Switching does not disconnect first. `connect` keeps the current wallet in place until
              the new one is established, so a declined prompt leaves the session exactly as it was.
            */}
            {otherWallets.map((wallet) => (
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={connect.isRunning}
                key={wallet.name}
                onClick={() => connect.dispatch(wallet)}
              >
                <SolanaUiWalletIcon name={wallet.name} src={wallet.icon} />
                {wallet.name}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() =>
            void navigator.clipboard.writeText(connected.account.address)
          }
        >
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={disconnect.isRunning}
          onClick={() => disconnect.dispatch()}
        >
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
