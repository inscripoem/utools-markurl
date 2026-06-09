// Post-build: stage the runnable plugin into dist/ for .upx packaging.
//   - In dev: tsup writes preload.js straight into the project root next to plugin.json,
//     and uTools "接入开发" loads the root plugin.json directly. dist/ is irrelevant.
//   - In build: this script mirrors the 3 runtime files into dist/ so uTools' 打包
//     command can point at dist/ as the package root (per official docs).
import { copyFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

mkdirSync(dist, { recursive: true })
for (const name of ['preload.js', 'plugin.json', 'logo.png']) {
  copyFileSync(resolve(root, name), resolve(dist, name))
}

const kb = (statSync(resolve(dist, 'preload.js')).size / 1024).toFixed(1)
console.log(`[stage-dist] dist/  preload.js ${kb} KB + plugin.json + logo.png`)
