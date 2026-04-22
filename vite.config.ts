import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env variables for the current mode
  const env = loadEnv(mode, process.cwd(), '')

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
          // Manual chunk splitting for better caching
          // Note: Order matters – more specific rules first to avoid circular deps
          manualChunks(id) {
            // Charts (large) – must come before React to avoid circular with recharts
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
              return 'vendor-charts'
            }
            // Supabase (standalone)
            if (id.includes('node_modules/@supabase/')) {
              return 'vendor-supabase'
            }
            // React Router (depends on react but isolated)
            if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router/') || id.includes('node_modules/@remix-run/')) {
              return 'vendor-router'
            }
            // React core (base layer)
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
              return 'vendor-react'
            }
            // State management & data fetching
            if (id.includes('node_modules/zustand') || id.includes('node_modules/@tanstack/')) {
              return 'vendor-data'
            }
            // UI utilities (no React deps in chunk)
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) {
              return 'vendor-ui'
            }
            // Toast (uses React but isolated)
            if (id.includes('node_modules/react-hot-toast')) {
              return 'vendor-ui'
            }
            // Other node_modules → misc bundle
            if (id.includes('node_modules/')) {
              return 'vendor-misc'
            }
          },

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
