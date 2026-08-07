import {
  AppIdentity,
  createSolanaDevnet,
  createSolanaLocalnet,
  createSolanaTestnet,
  SolanaCluster,
} from '@wallet-ui/react-native-kit'

export class AppConfig {
  static identity: AppIdentity = { name: 'expo-kit-minimal' }
  static networks: SolanaCluster[] = [
    createSolanaDevnet({ url: 'https://api.devnet.solana.com' }),
    createSolanaLocalnet({ url: 'http://localhost:8899' }),
    createSolanaTestnet({ url: 'https://api.testnet.solana.com' }),
  ]
}
