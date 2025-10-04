import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '/shared/': `${path.resolve(__dirname, 'tools/shared')}/`,
      '/widgets/': `${path.resolve(__dirname, 'tools/unique')}/`
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        eventos: path.resolve(__dirname, 'apps/eventos.html')
      }
    }
  }
});
