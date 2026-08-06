import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { ActivityIndicator, Text, View } from 'react-native'

import { useCounterAccount } from '@/features/counter/data-access/use-counter-account'
import { useIncrementCounter } from '@/features/counter/data-access/use-increment-counter'
import { useInitializeCounter } from '@/features/counter/data-access/use-initialize-counter'
import { CounterUiButton } from '@/features/counter/ui/counter-ui-button'
import { formatError } from '@/utils/format-error'

export function CounterFeature() {
  const { account } = useMobileWallet()
  const counterQuery = useCounterAccount()
  const incrementMutation = useIncrementCounter()
  const initializeMutation = useInitializeCounter()

  if (counterQuery.isPending) {
    return (
      <View className="items-center">
        <ActivityIndicator />
        <Text className="text-gray-600 dark:text-gray-400 mt-3">Loading the counter account...</Text>
      </View>
    )
  }

  if (counterQuery.isError) {
    return (
      <View className="items-center">
        <Text className="text-red-500 mb-4 text-center max-w-sm">{formatError(counterQuery.error)}</Text>
        <CounterUiButton label="Retry" onPress={() => void counterQuery.refetch()} />
      </View>
    )
  }

  const counter = counterQuery.data
  const isBusy = incrementMutation.isPending || initializeMutation.isPending
  const error = incrementMutation.error ?? initializeMutation.error

  // The counter account is created once per cluster. The pre-deployed devnet
  // counter already exists; this path only shows up on a fresh deployment.
  if (!counter.exists) {
    return (
      <View className="items-center">
        <Text className="text-gray-700 dark:text-gray-300 mb-4 text-center max-w-sm">
          The counter account does not exist on this cluster yet.
        </Text>
        <CounterUiButton
          disabled={isBusy || !account}
          label={isBusy ? 'Initializing...' : 'Initialize Counter'}
          onPress={() => initializeMutation.mutate()}
        />
        {!account ? (
          <Text className="text-gray-600 dark:text-gray-400 mt-3">Connect a wallet to initialize.</Text>
        ) : null}
        {error ? <Text className="text-red-500 mt-3 text-center max-w-sm">{formatError(error)}</Text> : null}
      </View>
    )
  }

  return (
    <View className="items-center">
      <Text className="text-gray-600 dark:text-gray-400 uppercase tracking-widest text-xs mb-2">Current count</Text>
      <Text className="text-6xl font-extrabold text-gray-800 dark:text-white mb-6">
        {counter.data.count.toString()}
      </Text>

      <View className="flex-row gap-3">
        <CounterUiButton disabled={isBusy || !account} label="+1" onPress={() => incrementMutation.mutate(1n)} />
        <CounterUiButton disabled={isBusy || !account} label="+10" onPress={() => incrementMutation.mutate(10n)} />
        <CounterUiButton
          disabled={isBusy || counterQuery.isFetching}
          label="Refresh"
          onPress={() => void counterQuery.refetch()}
        />
      </View>

      {!account ? <Text className="text-gray-600 dark:text-gray-400 mt-3">Connect a wallet to increment.</Text> : null}
      {isBusy ? <Text className="text-gray-600 dark:text-gray-400 mt-3">Waiting for the wallet...</Text> : null}
      {incrementMutation.data ? (
        <Text className="text-gray-600 dark:text-gray-400 mt-3">
          Last transaction: {incrementMutation.data.slice(0, 8)}...
        </Text>
      ) : null}
      {error ? <Text className="text-red-500 mt-3 text-center max-w-sm">{formatError(error)}</Text> : null}
    </View>
  )
}
