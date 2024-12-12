import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { comlink } from 'vite-plugin-comlink'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'


// https://vite.dev/config/
export default defineConfig({
  plugins: [comlink(), wasm(), topLevelAwait(), react()],
  worker: {
    plugins: () => [comlink(), wasm(), topLevelAwait()],
    format: 'es',
  },
  optimizeDeps: {
    include: ['@nervina-labs/mutiny-wasm'],
  },
})
