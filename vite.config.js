import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Simple Vite config without any proxy
export default defineConfig({
  plugins: [react()],
})