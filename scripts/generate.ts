#!/usr/bin/env tsx
/**
 * Write the generated template artifacts
 *
 * The artifacts are rendered by `solana-mobile`, which is the same renderer
 * `solana-mobile templates check` compares against. Rendering here rather than
 * reimplementing the format is what keeps `pnpm generate` and `pnpm lint` from
 * disagreeing about what the artifacts should contain.
 *
 * Usage: tsx scripts/generate.ts
 */

import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { renderTemplateRepository } from 'solana-mobile/templates'
import { writeFile } from './shared/fs-utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')

const main = () => {
  console.log('Generating template metadata...')

  let artifacts: ReturnType<typeof renderTemplateRepository>

  try {
    artifacts = renderTemplateRepository(ROOT_DIR)
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }

  for (const artifact of artifacts) {
    const result = writeFile(join(ROOT_DIR, artifact.path), artifact.content)

    if (!result.ok) {
      console.error(`Failed to write ${artifact.path}: ${result.error}`)
      process.exit(1)
    }

    console.log(`Generated ${artifact.path}`)
  }

  console.log('Run "automd" to update README.md')
}

main()
