/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fix bundling issues with Next.js 15 for Apollo and Twilio
  serverExternalPackages: ['@apollo/client', '@twilio/voice-sdk'],
  transpilePackages: ['@apollo/client'],
  experimental: {
    optimizePackageImports: ['@apollo/client'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Exclude problematic packages from server bundling
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@apollo/client');
      config.externals.push('@twilio/voice-sdk');
    }
    return config;
  },
};

module.exports = nextConfig;
