/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Transpile Apollo Client to fix bundling issues with Next.js 15
  transpilePackages: ['@apollo/client'],
  // External packages that shouldn't be bundled by Next.js
  serverExternalPackages: ['@twilio/voice-sdk'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Only externalize Twilio on server (not Apollo - it needs to be transpiled)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@twilio/voice-sdk');
    }
    return config;
  },
};

module.exports = nextConfig;
