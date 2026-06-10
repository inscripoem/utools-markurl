import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { preload: 'preload/index.ts' },
  format: 'cjs',
  outDir: '.',
  target: 'node20',
  platform: 'node',
  splitting: false,
  clean: false,
  minify: false,
  treeshake: false,
  sourcemap: false,
  outExtension: () => ({ js: '.js' }),
})
