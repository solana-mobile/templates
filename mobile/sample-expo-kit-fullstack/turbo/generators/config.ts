import { execSync } from 'node:child_process'
import type { PlopTypes } from '@turbo/gen'
import { generatorPkg } from './generator-pkg'

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setActionType('bunInstall', (_answers, config, _plop) => {
    if (process.env.TURBO_GEN_SKIP_INSTALL === '1') {
      return 'Skipped bun install (TURBO_GEN_SKIP_INSTALL=1).'
    }
    const data = (
      config as { data?: { turbo?: { paths?: { root?: string } } } } | undefined
    )?.data
    const cwd = data?.turbo?.paths?.root ?? process.cwd()
    execSync('bun install', { stdio: 'inherit', cwd })
    return 'Installed dependencies with bun.'
  })
  plop.setGenerator('pkg', generatorPkg)
}
