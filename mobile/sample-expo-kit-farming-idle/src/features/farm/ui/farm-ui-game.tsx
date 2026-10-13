import type { Farm } from '@project/anchor'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { formatError } from '../../../utils/format-error'
import { formatPoints } from '../../../utils/format-points'
import { useAvailableHarvest } from '../data-access/use-available-harvest'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center flex-1">
      <Text className="text-xl font-bold text-gray-800 dark:text-white">{value}</Text>
      <Text className="text-xs text-gray-500 dark:text-gray-400">{label}</Text>
    </View>
  )
}

export function FarmUiGame({
  error,
  farm,
  gained,
  isHarvesting,
  onHarvest,
}: {
  error: Error | null
  farm: Farm
  gained: bigint | null
  isHarvesting: boolean
  onHarvest: () => void
}) {
  const { availableHarvest, perSecond } = useAvailableHarvest(farm)

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="items-center px-4 py-6 gap-6">
      <View className="w-full flex-row border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
        <Stat label="Harvested 🌾" value={formatPoints(farm.harvestPoints)} />
        <Stat label="Per second" value={formatPoints(perSecond)} />
        <Stat label="High score" value={formatPoints(farm.highScore)} />
      </View>

      <View className="items-center gap-2">
        <Text className="text-lg font-semibold text-gray-800 dark:text-white">
          Tap to harvest ~{formatPoints(availableHarvest)} 🌾
        </Text>
        <Pressable
          disabled={isHarvesting}
          onPress={onHarvest}
          className={`w-52 h-52 rounded-full bg-green-100 dark:bg-green-950 border-4 border-green-600 items-center justify-center active:bg-green-200 dark:active:bg-green-900 ${isHarvesting ? 'opacity-60' : ''}`}
        >
          <Text className="text-8xl">🚜</Text>
        </Pressable>
        <Text className={`text-xl font-bold text-green-600 ${gained === null ? 'opacity-0' : ''}`}>
          +{gained === null ? '0' : formatPoints(gained)} 🌾
        </Text>
        {error ? <Text className="text-red-500 text-center px-4">{formatError(error)}</Text> : null}
      </View>

      <View className="w-full border border-gray-200 dark:border-gray-800 rounded-2xl p-4 gap-2">
        <Text className="text-base font-bold text-gray-800 dark:text-white">How it works</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Every tap sends a real transaction, signed by the player wallet on this device — no approval prompt. It banks
          1 🌾 plus everything your crops grew since the last harvest.
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Spend 🌾 on crops to raise your per-second yield, then submit your run to the on-chain leaderboard.
        </Text>
      </View>
    </ScrollView>
  )
}
