import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Tea-Log/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'lucide-react'],
          'firebase-auth': ['firebase/app', 'firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
        },
      },
    },
  },
})
