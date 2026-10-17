import { NetworkFeatureIndex } from '@/features/network/network-feature-index'
import { AccountFeatureIndex } from '@/features/account/account-feature-index'
import { SeekerFeatureIndex } from '@/features/seeker/seeker-feature-index'
import { AppConfig } from '@/constants/app-config'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { appStyles } from '@/constants/app-styles'

export default function HomeScreen() {
  const { chain } = useMobileWallet()
  return (
    <SafeAreaView style={appStyles.screen}>
      <View style={appStyles.stack}>
        <Text style={appStyles.title}>App Config</Text>
        <View style={appStyles.card}>
          <Text>
            Name <Text style={{ fontWeight: 'bold' }}>{AppConfig.identity.name}</Text>
          </Text>
          <Text>
            URL <Text style={{ fontWeight: 'bold' }}>{AppConfig.identity.uri}</Text>
          </Text>
        </View>
        <SeekerFeatureIndex chain={chain} identity={AppConfig.identity} />
        <AccountFeatureIndex />
        <NetworkFeatureIndex />
      </View>
    </SafeAreaView>
  )
}
