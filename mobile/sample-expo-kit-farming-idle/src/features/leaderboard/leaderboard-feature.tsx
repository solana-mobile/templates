import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Alert, ScrollView, Text, View } from 'react-native'
import { AppButton } from '../../components/app-button'
import { ellipsify } from '../../utils/ellipsify'
import { formatError } from '../../utils/format-error'
import { formatPoints } from '../../utils/format-points'
import { useFarmProgram } from '../farm/data-access/use-farm-program'
import { useLeaderboardQuery } from './data-access/use-leaderboard-query'

const MEDALS = ['🥇', '🥈', '🥉', '4.', '5.']

export function LeaderboardFeature() {
  const { account } = useMobileWallet()
  const { farmQuery, initializeLeaderboardMutation, submitFarmMutation } = useFarmProgram()
  const leaderboardQuery = useLeaderboardQuery()

  const farm = farmQuery.data?.farm
  const entries = leaderboardQuery.data?.entries

  function onSubmit() {
    Alert.alert(
      'Submit your score?',
      'Your harvested 🌾 goes on the leaderboard and the farm starts over: points and crops reset. Your wallet approves this transaction.',
      [
        { style: 'cancel', text: 'Cancel' },
        { onPress: () => submitFarmMutation.mutate(), style: 'destructive', text: 'Submit' },
      ],
    )
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="px-4 py-4 gap-4">
      <View className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 gap-3">
        <Text className="text-base font-bold text-gray-800 dark:text-white">Global top 5</Text>
        {leaderboardQuery.isLoading ? <Text className="text-gray-600 dark:text-gray-400">Loading...</Text> : null}
        {entries && entries.length === 0 ? (
          <Text className="text-gray-600 dark:text-gray-400">No scores yet. Be the first!</Text>
        ) : null}
        {entries?.map((entry, index) => {
          const isOwn = entry.owner === account?.address
          return (
            <View
              key={`${entry.owner}-${index}`}
              className={`flex-row items-center justify-between rounded-xl px-3 py-2 ${isOwn ? 'bg-green-100 dark:bg-green-950' : ''}`}
            >
              <Text className="text-base text-gray-800 dark:text-white">
                {MEDALS[index]} {ellipsify(entry.owner)}
                {isOwn ? ' (you)' : ''}
              </Text>
              <Text className="text-base font-bold text-gray-800 dark:text-white">{formatPoints(entry.points)} 🌾</Text>
            </View>
          )
        })}
        {leaderboardQuery.data && !entries ? (
          <>
            <Text className="text-gray-600 dark:text-gray-400">
              The leaderboard account does not exist on this cluster yet. Anyone can create it once.
            </Text>
            <AppButton
              disabled={initializeLeaderboardMutation.isPending}
              label={initializeLeaderboardMutation.isPending ? 'Waiting for wallet...' : 'Create Leaderboard'}
              onPress={() => initializeLeaderboardMutation.mutate()}
            />
            {initializeLeaderboardMutation.error ? (
              <Text className="text-red-500">{formatError(initializeLeaderboardMutation.error)}</Text>
            ) : null}
          </>
        ) : null}
      </View>

      <View className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 gap-3">
        <Text className="text-base font-bold text-gray-800 dark:text-white">Your run</Text>
        <Text className="text-2xl font-bold text-gray-800 dark:text-white">
          {farm ? formatPoints(farm.harvestPoints) : '0'} 🌾
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          High score: {farm ? formatPoints(farm.highScore) : '0'} 🌾
        </Text>
        <AppButton
          disabled={!farm || !entries || farm.harvestPoints === 0n || submitFarmMutation.isPending}
          label={submitFarmMutation.isPending ? 'Waiting for wallet...' : 'Submit Score & Reset Farm'}
          onPress={onSubmit}
        />
        {submitFarmMutation.error ? (
          <Text className="text-red-500">{formatError(submitFarmMutation.error)}</Text>
        ) : null}
      </View>
    </ScrollView>
  )
}
