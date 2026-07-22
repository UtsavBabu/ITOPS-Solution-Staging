import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Vendor code changes far less often than app code — splitting it
        // out means a deploy that only touches app pages doesn't force
        // every user to re-download React/Supabase/motion again, and the
        // browser can cache these chunks across releases.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/react-router|\/react\/|\/react-dom\//.test(id)) return 'react-vendor';
          if (/@supabase|@tanstack/.test(id)) return 'supabase-vendor';
          if (/\/motion\/|recharts/.test(id)) return 'ui-vendor';
        }
      }
    }
  }
})
