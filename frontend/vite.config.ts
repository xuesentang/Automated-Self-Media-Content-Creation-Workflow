import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/antd') || id.includes('@ant-design')) return 'vendor-antd';
          if (id.includes('node_modules/xstate') || id.includes('@xstate')) return 'vendor-xstate';
          if (id.includes('node_modules/@tiptap')) return 'vendor-tiptap';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('react-router-dom')) return 'vendor-react';
        },
      },
    },
  },
})
