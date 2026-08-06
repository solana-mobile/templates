// Renders the TypeScript client in src/features/counter/generated from the
// Anchor IDL. The generated code is committed, so this only needs to run again
// after the IDL changes: `npm run codegen`.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { rootNodeFromAnchor, type AnchorIdl } from '@codama/nodes-from-anchor'
import { renderVisitor } from '@codama/renderers-js'
import { createFromRoot } from 'codama'

const anchorDir = dirname(fileURLToPath(import.meta.url))
const idl = JSON.parse(readFileSync(join(anchorDir, 'idl', 'counter.json'), 'utf-8')) as AnchorIdl

const codama = createFromRoot(rootNodeFromAnchor(idl))

codama.accept(
  renderVisitor(join(anchorDir, '..', 'src', 'features', 'counter'), {
    deleteFolderBeforeRendering: true,
    generatedFolder: 'generated',
    // Import everything from `@solana/kit` (and its subpaths) so the app needs
    // no extra dependency for the generated client.
    kitImportStrategy: 'rootOnly',
    syncPackageJson: false,
  }),
)
