import { FARMING_IDLE_PROGRAM_ADDRESS } from '@project/anchor'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { openURL } from 'expo-linking'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { AppAddressLink } from '../../components/app-address-link'
import { AppButton } from '../../components/app-button'
import { useAirdropMutation } from '../account/data-access/use-airdrop-mutation'
import { useBalanceQuery } from '../account/data-access/use-balance-query'
import { NetworkUiSelect } from '../network/network-ui-select'
import { useNetwork } from '../network/use-network'
import { usePlayerSigner } from '../player/data-access/use-player-signer'
import { useResetPlayerMutation } from '../player/data-access/use-reset-player-mutation'
import { formatError } from '../../utils/format-error'
import { formatSol } from '../../utils/format-sol'
import { useDepositMutation } from './data-access/use-deposit-mutation'
import { useWithdrawMutation } from './data-access/use-withdraw-mutation'

export function WalletFeature() {
  const { account, disconnect } = useMobileWallet()
  const { chain, getFaucetUrl } = useNetwork()
  const { data: player } = usePlayerSigner()
  const ownerBalanceQuery = useBalanceQuery({ address: account?.address })
  const playerBalanceQuery = useBalanceQuery({ address: player?.address })
  const airdropMutation = useAirdropMutation()
  const depositMutation = useDepositMutation()
  const resetPlayerMutation = useResetPlayerMutation()
  const withdrawMutation = useWithdrawMutation()

  const hasNoSol = ownerBalanceQuery.data === 0n
  const isLocalnet = chain === 'solana:localnet'
  const error =
    airdropMutation.error ?? depositMutation.error ?? resetPlayerMutation.error ?? withdrawMutation.error ?? null

  function onResetPlayer() {
    Alert.alert(
      'Reset the player wallet?',
      'This deletes the player keypair from this device and generates a new one. The current farm and any SOL left in the player wallet become unreachable — withdraw first.',
      [
        { style: 'cancel', text: 'Cancel' },
        { onPress: () => resetPlayerMutation.mutate(), style: 'destructive', text: 'Reset' },
      ],
    )
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="px-4 py-4 gap-4">
      <View className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 gap-3">
        <Text className="text-base font-bold text-gray-800 dark:text-white">Main wallet</Text>
        <Text className="text-2xl font-bold text-gray-800 dark:text-white">
          {ownerBalanceQuery.data != null ? formatSol(ownerBalanceQuery.data) : '…'}
        </Text>
        {account ? <AppAddressLink address={account.address.toString()} label="Owner" /> : null}
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Holds your funds and signs through the wallet app: creating the farm, funding the player wallet, and
          submitting scores.
        </Text>
        <AppButton
          disabled={depositMutation.isPending || !player}
          label={depositMutation.isPending ? 'Waiting for wallet...' : 'Deposit 0.001 SOL to Player'}
          onPress={() => depositMutation.mutate()}
        />
        {hasNoSol && isLocalnet ? (
          <AppButton
            disabled={airdropMutation.isPending}
            label={airdropMutation.isPending ? 'Working...' : 'Request Airdrop'}
            onPress={() => airdropMutation.mutate()}
          />
        ) : null}
        {hasNoSol && !isLocalnet ? (
          <Pressable onPress={() => void openURL(getFaucetUrl(account?.address.toString()))}>
            <Text className="text-amber-600 dark:text-amber-400 text-center">
              Your wallet has no SOL to pay for transactions.{'\n'}
              Get some at <Text className="underline">faucet.solana.com</Text>
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 gap-3">
        <Text className="text-base font-bold text-gray-800 dark:text-white">Player wallet</Text>
        <Text className="text-2xl font-bold text-gray-800 dark:text-white">
          {playerBalanceQuery.data != null ? formatSol(playerBalanceQuery.data) : '…'}
        </Text>
        {player ? <AppAddressLink address={player.address.toString()} label="Player" /> : null}
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          A burner keypair in this device&apos;s keystore. It only holds gas money and signs every harvest and upgrade
          without prompts.
        </Text>
        <AppButton
          disabled={withdrawMutation.isPending || !player}
          label={withdrawMutation.isPending ? 'Working...' : 'Withdraw to Main Wallet'}
          onPress={() => withdrawMutation.mutate()}
        />
        <AppButton
          disabled={resetPlayerMutation.isPending}
          label="Reset Player Wallet"
          onPress={onResetPlayer}
          variant="danger"
        />
      </View>

      <View className="items-center gap-4">
        <AppAddressLink address={FARMING_IDLE_PROGRAM_ADDRESS} label="Program" />
        <NetworkUiSelect />
        <AppButton label="Disconnect Wallet" onPress={() => void disconnect()} variant="danger" />
        {error ? <Text className="text-red-500 text-center">{formatError(error)}</Text> : null}
      </View>
    </ScrollView>
  )
}
