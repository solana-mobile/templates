import { Pressable, Text, View } from 'react-native'

import { useCluster } from '@/features/cluster/data-access/cluster-provider'

export function ClusterUiSwitcher() {
  const { cluster, clusters, setCluster } = useCluster()

  return (
    <View className="flex-row bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
      {clusters.map((item) => {
        const isActive = item.id === cluster.id
        return (
          <Pressable
            key={item.id}
            onPress={() => setCluster(item)}
            className={`px-5 py-2 rounded-lg ${isActive ? 'bg-blue-600' : ''}`}
          >
            <Text className={`font-semibold ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
