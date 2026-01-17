const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  // Reduce static generation issues
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Fix workspace root detection for monorepo builds (Next.js 16+)
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
}

module.exports = nextConfig
