/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Optimize for development
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Improve development build speed
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
}

module.exports = nextConfig;