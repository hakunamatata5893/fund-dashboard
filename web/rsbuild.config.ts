import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [pluginReact()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 51889,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:51888',
        changeOrigin: true,
      },
    },
  },
  html: {
    title: '基金看板',
    favicon: './public/favicon.svg',
  },
});
