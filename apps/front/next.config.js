/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Only keep Twilio in serverExternalPackages (Apollo removed to avoid conflict)
  serverExternalPackages: ['@twilio/voice-sdk'],
  // Transpile Apollo to fix R.A constructor error
  transpilePackages: ['@apollo/client'],
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
