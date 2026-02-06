import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  preset: 'vercel',
  // Disable node modules tracing to avoid Windows nf3 issues
  externals: {
    noTrace: true,
  },
  experimental: {
    wasm: false,
  },
})
