import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../public',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manuel chunk bölünmesi — ana bundle'ı küçültür, paralel yükleme + cache hit
        manualChunks(id) {
          // node_modules → vendor chunk'ları
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'vendor-react'
            if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul')) return 'vendor-radix'
            if (id.includes('@tanstack/react-query')) return 'vendor-query'
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-forms'
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
            if (id.includes('xlsx')) return 'vendor-excel'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n'
            if (id.includes('sonner')) return 'vendor-toast'
            if (id.includes('react-router-dom') || id.includes('react-router')) return 'vendor-router'
            return 'vendor'
          }
          // Büyük constants dosyaları (ambalaj tipleri 377 entry)
          if (id.includes('/lib/constants/customs/')) return 'customs-data'
        },
      },
    },
  },
})
