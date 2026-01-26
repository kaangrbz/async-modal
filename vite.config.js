import { defineConfig } from 'vite';

export default defineConfig({
  // CommonJS modüllerini desteklemek için optimizeDeps ayarları
  optimizeDeps: {
    include: ['async-modal'],
    // CommonJS modüllerini ES modüllere dönüştür
    esbuildOptions: {
      // CommonJS modüllerini işle
      format: 'esm'
    }
  },
  
  // Build ayarları
  build: {
    // CommonJS modüllerini ES modüllere dönüştür
    commonjsOptions: {
      // CommonJS modüllerini otomatik olarak ES modüllere dönüştür
      transformMixedEsModules: true,
      // Varsayılan olarak CommonJS modüllerini include et
      include: [/async-modal/, /node_modules/]
    },
    
    // Rollup ayarları
    rollupOptions: {
      // External olarak işaretleme (eğer gerekirse)
      // external: []
    }
  },
  
  // SSR ayarları (eğer kullanılıyorsa)
  ssr: {
    // CommonJS modüllerini SSR'da da destekle
    noExternal: ['async-modal']
  }
});
