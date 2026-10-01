import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import liveDataPlugin from './server/liveDataPlugin.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads .env / .env.local etc. without a prefix filter, so the keys
  // stay on the server side and are only handed to the local API middleware.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }

  return {
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api/v3': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), tailwindcss(), liveDataPlugin(env)],
  }
})