import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
  ],
  build: {
    outDir: 'dist', // Hasil build akan masuk ke folder dist di dalam folder frontend
  },
  // Server config ini hanya untuk development (lokal)
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000', 
        changeOrigin: true,
      },
    },
  },
});