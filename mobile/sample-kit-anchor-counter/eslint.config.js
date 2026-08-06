// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    // The Codama-generated client is not hand-written code; regenerate it with
    // `npm run codegen` instead of linting it.
    ignores: ['dist/*', 'src/features/counter/generated/*'],
  },
])
