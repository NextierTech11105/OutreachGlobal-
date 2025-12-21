const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Generate unique build ID to bust cache
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  // Optimize heavy package imports (tree-shaking)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'lodash',
      '@radix-ui/react-icons',
      'framer-motion',
    ],
  },
  // External packages that shouldn't be bundled by Next.js
  serverExternalPackages: ['@twilio/voice-sdk', '@apollo/client'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@twilio/voice-sdk');
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
