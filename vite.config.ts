import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/async-modal.ts'),
      name: 'AsyncModal',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'async-modal.mjs';
        if (format === 'cjs') return 'async-modal.cjs';
        if (format === 'umd') return 'async-modal.js';
        return 'async-modal.js';
      },
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/async-modal.ts'),
      },
      output: {
        exports: 'named',
        assetFileNames: (assetInfo) =>
          assetInfo.name === 'style.css' ? 'async-modal.css' : assetInfo.name ?? '',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
  },
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      include: ['src/**/*.ts', 'locales/**/*.ts'],
      outDir: 'dist',
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
});
