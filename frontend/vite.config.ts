import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// ESM-only плагін підтягуємо динамічно, щоб уникнути помилки "ESM file cannot be loaded by require"
export default defineConfig(async () => {
  const { viteStaticCopy } = await import('vite-plugin-static-copy');

  return {
    root: __dirname, // директорія frontend
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          // Top-level logos flat into /build/images/
          {
            src: '../assets/images/*.{png,svg}',
            dest: 'images',
            rename: { stripBase: true },
          },
          // Favicon subdir preserved as /build/images/favicon/
          {
            src: '../assets/images/favicon/*',
            dest: 'images/favicon',
            rename: { stripBase: true },
          },
        ],
      }),
    ],
    build: {
      outDir: resolve(__dirname, '../public/build'),
      manifest: true,
      emptyOutDir: true,
      sourcemap: false,
      cssCodeSplit: false,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          users: resolve(__dirname, 'users.html'),
        },
        output: {
          // Вирівнюємо імена, щоб їх було легко підключити у Twig без хеша
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) return 'assets/style.css';
            return 'assets/[name].[ext]';
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      host: '0.0.0.0',
      hmr: true,
    },
  };
}); 