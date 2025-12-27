const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Reduce static generation issues
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

module.exports = withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  silent: true, // Suppresses source map uploading logs during build
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
}, {
  // Sentry SDK options
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
