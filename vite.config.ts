import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(() => {
  return {
    plugins: [
      react({
        // Enable React Fast Refresh in development
        fastRefresh: true,
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // Development server config
    server: {
      host: '0.0.0.0',
      port: 3000,
      // Security headers for dev
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    },

    // Preview server config (used after build)
    preview: {
      host: '0.0.0.0',
      port: 3000,
    },

    // Production build optimizations
    build: {
      // Output directory
      outDir: 'dist',

      // Chunk size warning limit (500KB warning → raise to 1MB for React apps)
      chunkSizeWarningLimit: 1000,

      // Enable source maps for error tracking in production
      sourcemap: false,

      // Minification settings
      minify: 'esbuild',

      // Target modern browsers for better optimizations
      target: ['es2020', 'chrome90', 'firefox90', 'safari14'],

      // Rollup options for advanced code splitting
      rollupOptions: {
        output: {
          // Use Rollup/Vite default chunking.
          // The previous custom manualChunks strategy created circular chunk dependencies
          // in production (vendor-charts -> vendor-ui -> vendor-misc -> vendor-charts),
          // which caused runtime initialization errors and left the app stuck on the splash screen.

          // Asset file naming for long-term caching
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || ''
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(name)) {
              return 'assets/images/[name]-[hash][extname]'
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
              return 'assets/fonts/[name]-[hash][extname]'
            }
            if (/\.css$/.test(name)) {
              return 'assets/css/[name]-[hash][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          },

          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
    },

    // CSS configuration
    css: {
      devSourcemap: true,
      modules: {
        localsConvention: 'camelCase',
      },
    },

    // Define global constants (ensures env vars work correctly in build)
    define: {
      // Expose build mode for runtime checks
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  }
})
