import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/ai-town',
  // Convex 1.45-generated server helpers may be reached through shared model
  // modules in the browser bundle. Keep their server-only env export inert.
  define: {
    'process.env': {},
  },
  plugins: [react()],
  server: {
    allowedHosts: ['ai-town-your-app-name.fly.dev', 'localhost', '127.0.0.1'],
  },
});
