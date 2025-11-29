/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fix Apollo Client bundling issues with Next.js 15
  serverExternalPackages: ['@apollo/client'],
  transpilePackages: ['@apollo/client'],
  experimental: {
    // Optimize package imports to prevent incorrect tree-shaking
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
    // Force Apollo Client to use CJS on server to avoid ESM issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@apollo/client');
    }
    return config;
  },
};

module.exports = nextConfig;
