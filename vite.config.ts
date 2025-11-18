import { defineConfig } from 'vite'

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
      ...(tsconfigPaths ? [tsconfigPaths()] : [])
    ],
    server: {
      // listen on all interfaces (IPv4 + IPv6) so localhost / 127.0.0.1 work reliably
      host: true,
      // prefer a stable port; Vite will try the port and increment if taken. Use 5174 to match current runtime
      port: 5174
    }
  })
}
