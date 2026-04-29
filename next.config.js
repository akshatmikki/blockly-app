/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore TypeScript build errors (legacy code)
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig
