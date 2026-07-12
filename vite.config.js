import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// User Pages(gangto326.github.io)로 배포되므로 base는 루트('/')
export default defineConfig({
  plugins: [react()],
  base: '/',
})
