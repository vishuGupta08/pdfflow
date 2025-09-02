import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // SEO and Performance Optimizations
  build: {
    // Code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          lucide: ['lucide-react'],
          pdf: ['react-pdf', 'pdfjs-dist']
        }
      }
    },
    
    // Asset optimization
    assetsInlineLimit: 4096, // Inline small assets
    cssCodeSplit: true,
    sourcemap: false, // Disable source maps in production
    
    // Compression - using esbuild (built-in, faster than terser)
    minify: 'esbuild'
  },
  
  // Server configuration for development
  server: {
    host: true,
    port: 5173
  },
  
  // Preview configuration
  preview: {
    port: 4173,
    host: true
  }
})
