import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/astronaut': 'http://127.0.0.1:8000',
      '/navigation': 'http://127.0.0.1:8000',
      '/locations': 'http://127.0.0.1:8000',
      '/hazards': 'http://127.0.0.1:8000',
    },
  },
})
