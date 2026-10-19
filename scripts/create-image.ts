#!/usr/bin/env tsx
/**
 * Generate og-image.png for templates in the Solana Mobile thumbnail style.
 *
 * Usage:
 *   pnpm create-image                           # every template in repokit.groups
 *   pnpm create-image mobile/expo-kit-minimal   # one or more template paths
 *
 * Requires PP Mori Semibold installed locally (licensed font, not committed).
 */

import { Resvg } from '@resvg/resvg-js'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const FONT_FILE = ['/Library/Fonts', join(homedir(), 'Library/Fonts')]
  .map((dir) => join(dir, 'PPMori-Semibold.otf'))
  .find(existsSync)
const WORDMARK = readFileSync(join(ROOT_DIR, 'assets/seeker-wordmark.svg'), 'base64')

// Layout is authored at the 1920x1080 size of the Paper design and sliced to 1200x630.
const FONT = `font-family="PP Mori" font-weight="600" font-size="176" letter-spacing="-5.28"`
const MARGIN = 87
const PADDING = 50
const LINE_HEIGHT = 147
const GAP = 46
const BOTTOM = 970
const MAX_TEXT_WIDTH = 1920 - 2 * MARGIN - 2 * PADDING

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const render = (svg: string) => new Resvg(svg, { font: { fontFiles: [FONT_FILE!], loadSystemFonts: false } })

const textWidth = (text: string) =>
  render(
    `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="400"><text y="300" ${FONT}>${escape(text)}</text></svg>`,
  ).getBBox()?.width ?? 0

const headline = (line1: string, line2: string) => {
  const scale = Math.min(1, MAX_TEXT_WIDTH / Math.max(textWidth(line1), textWidth(line2)))
  const boxWidth = textWidth(line2) + 2 * PADDING
  const boxTop = BOTTOM - LINE_HEIGHT - 2 * PADDING
  const baseline = (top: number) => top + LINE_HEIGHT / 2 + 0.35 * 176
  return `<g transform="translate(${MARGIN} ${BOTTOM}) scale(${scale}) translate(${-MARGIN} ${-BOTTOM})">
    <text x="${MARGIN}" y="${baseline(boxTop - GAP - LINE_HEIGHT)}" ${FONT} fill="#FFFFFF">${escape(line1)}</text>
    <rect x="${MARGIN}" y="${boxTop}" width="${boxWidth}" height="${LINE_HEIGHT + 2 * PADDING}" fill="#FFEA00"/>
    <text x="${MARGIN + PADDING}" y="${baseline(boxTop + PADDING)}" ${FONT} fill="#000000">${escape(line2)}</text>
  </g>`
}

const image = (
  line1: string,
  line2: string,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1200" height="630" preserveAspectRatio="xMidYMid slice">
  <rect width="1920" height="1080" fill="#000000"/>
  <defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="200"/></filter></defs>
  <g transform="translate(0 1080) rotate(-90) matrix(-0.5 0.866 -0.866 -0.5 1281 -289.425)">
    <path filter="url(#blur)" fill="#6939CA" d="M1119 0C1737.007 0 2238 337.469 2238 753.757C2238 1170.046 1737.007 1507.514 1119 1507.514C500.993 1507.514 0 1170.046 0 753.757C0 337.469 500.993 0 1119 0Z"/>
    <path filter="url(#blur)" fill="#EE5A6F" transform="translate(216.115 379.488)" d="M889.017 0C1380.008 0 1778.034 337.469 1778.034 753.757C1778.034 1170.046 1380.008 1507.514 889.017 1507.514C398.026 1507.514 0 1170.046 0 753.757C0 337.469 398.026 0 889.017 0Z"/>
    <path filter="url(#blur)" fill="#FD8F3A" transform="translate(414.895 863.296)" d="M681.57 0C1057.991 0 1363.14 229.163 1363.14 511.851C1363.14 794.538 1057.991 1023.701 681.57 1023.701C305.149 1023.701 0 794.538 0 511.851C0 229.163 305.149 0 681.57 0Z"/>
    <path filter="url(#blur)" fill="#FFEA00" transform="translate(615.407 1261.048)" d="M481.346 0C747.186 0 962.693 171.945 962.693 384.051C962.693 596.156 747.186 768.102 481.346 768.102C215.506 768.102 0 596.156 0 384.051C0 171.945 215.506 0 481.346 0Z"/>
  </g>
  <image x="${MARGIN}" y="100" width="413" height="101" href="data:image/svg+xml;base64,${WORDMARK}"/>
  ${headline(line1, line2)}
</svg>`

const templatePaths = (): string[] => {
  const groups: { path: string }[] = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8')).repokit.groups
  return groups.flatMap((group) =>
    readdirSync(join(ROOT_DIR, group.path), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(group.path, entry.name)),
  )
}

const main = () => {
  if (!FONT_FILE) {
    console.error('Error: PPMori-Semibold.otf not found in /Library/Fonts or ~/Library/Fonts')
    process.exit(1)
  }
  const paths = process.argv.length > 2 ? process.argv.slice(2) : templatePaths()
  for (const templatePath of paths) {
    const packageJson = join(ROOT_DIR, templatePath, 'package.json')
    if (!existsSync(packageJson)) {
      console.error(`Error: ${templatePath} has no package.json`)
      process.exit(1)
    }
    const { displayName, name } = JSON.parse(readFileSync(packageJson, 'utf-8'))
    const title: string = displayName ?? name
    const kind = title.endsWith(' sample') ? 'Sample' : 'Template'
    const subject = title.replace(/ (example|sample)$/, '')
    const png = render(image(kind, subject)).render().asPng()
    writeFileSync(join(ROOT_DIR, templatePath, 'og-image.png'), png)
    console.log(`${templatePath}/og-image.png (${Math.round(png.length / 1024)}KB): ${kind} / ${subject}`)
  }
}

main()
