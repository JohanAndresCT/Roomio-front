import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Load plugins dynamically to avoid ESM/CommonJS loader mismatch on some environments
export default async () => {
  const [{ default: react }] = await Promise.all([import('@vitejs/plugin-react')])
  let tsconfigPaths: any = null
  try {
    tsconfigPaths = (await import('vite-tsconfig-paths')).default
  } catch (e) {
    // optional helper; continue if not available
  }

  return defineConfig({
    plugins: [
      react(),
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        protocolImports: true,
      }),
      ...(tsconfigPaths ? [tsconfigPaths()] : [])
    ],
    define: {
      // Define global para compatibilidad con librerías que lo necesitan (como simple-peer)
      global: 'globalThis',
      // Define process.env para librerías que lo necesitan
      'process.env': {}
    },
    server: {
      // listen on all interfaces (IPv4 + IPv6) so localhost / 127.0.0.1 work reliably
      host: true,
      // prefer a stable port; Vite will try the port and increment if taken. Use 5174 to match current runtime
      port: 5175,
      // Proxy para evitar CORS en desarrollo
      proxy: {
        '/api': {
          target: 'https://roomio-server-6pbs.onrender.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: false
        }
      }
    }
  })
}
