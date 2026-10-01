import { CROP_POINTS, upgradeCost } from '@project/anchor'
import { useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { formatError } from '../../utils/format-error'
import { formatPoints } from '../../utils/format-points'
import { CROPS } from './crops'
import { useFarmProgram } from './data-access/use-farm-program'
import { CropUiCard } from './ui/crop-ui-card'

export function CropsFeature() {
  const { farmQuery, upgradeFarmMutation } = useFarmProgram()
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)

  const farm = farmQuery.data?.farm

  async function onBuy(cropIndex: number) {
    setPendingIndex(cropIndex)
    try {
      await upgradeFarmMutation.mutateAsync({ cropIndex })
    } catch {
      // The failure reason renders through upgradeFarmMutation.error.
    } finally {
      setPendingIndex(null)
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <FlatList
        data={CROPS}
        keyExtractor={(crop) => crop.name}
        contentContainerClassName="px-4 py-4 gap-3"
        ListHeaderComponent={
          <View className="items-center gap-1 pb-2">
            <Text className="text-2xl font-bold text-gray-800 dark:text-white">
              {farm ? formatPoints(farm.harvestPoints) : '0'} 🌾 to spend
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Crops cost banked 🌾 — harvest first. Each plot costs 15% more than the last.
            </Text>
            {!farm ? (
              <Text className="text-amber-600 dark:text-amber-400 text-center">Create your farm first.</Text>
            ) : null}
            {upgradeFarmMutation.error ? (
              <Text className="text-red-500 text-center">{formatError(upgradeFarmMutation.error)}</Text>
            ) : null}
          </View>
        }
        renderItem={({ index, item: crop }) => {
          const owned = farm?.crops[index] ?? 0
          const cost = upgradeCost(index, owned, 1)
          return (
            <CropUiCard
              cost={cost}
              emoji={crop.emoji}
              isAffordable={!!farm && farm.harvestPoints >= cost}
              isPending={pendingIndex === index}
              name={crop.name}
              onBuy={() => void onBuy(index)}
              owned={owned}
              pointsPerPlot={CROP_POINTS[index]}
            />
          )
        }}
      />
    </View>
  )
}
