/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fix Apollo Client bundling issues with Next.js 15
  // The "R.A is not a constructor" error is caused by improper tree-shaking
  transpilePackages: ['@apollo/client'],
  webpack: (config, { isServer }) => {
    // Prevent Apollo Client from being bundled on the server incorrectly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
