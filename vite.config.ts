/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
  // GitHub Pages serves project sites from /<repo>/ — relative base keeps
  // assets working both there and on a custom domain.
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        methodology: resolve(__dirname, 'methodology.html'),
      },
    },
  },
});
