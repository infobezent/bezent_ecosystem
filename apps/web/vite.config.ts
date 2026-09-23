import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      /** @design-system → design-system public components barrel */
      '@design-system': path.resolve(__dirname, 'src/design-system/components/index.ts'),
    },
  },
});
