import { Text, View } from 'react-native'
import { AppButton } from '../../../components/app-button'
import { formatPoints } from '../../../utils/format-points'

export function CropUiCard({
  cost,
  emoji,
  isAffordable,
  isPending,
  name,
  onBuy,
  owned,
  pointsPerPlot,
}: {
  cost: bigint
  emoji: string
  isAffordable: boolean
  isPending: boolean
  name: string
  onBuy: () => void
  owned: number
  pointsPerPlot: bigint
}) {
  return (
    <View className="w-full flex-row items-center border border-gray-200 dark:border-gray-800 rounded-2xl p-4 gap-3">
      <Text className="text-4xl">{emoji}</Text>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-800 dark:text-white">{name}</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {owned} owned · +{formatPoints(pointsPerPlot)} 🌾/s each
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">Next: {formatPoints(cost)} 🌾</Text>
      </View>
      <AppButton
        disabled={!isAffordable || isPending}
        label={isPending ? '...' : 'Buy'}
        onPress={onBuy}
        variant="success"
      />
    </View>
  )
}
