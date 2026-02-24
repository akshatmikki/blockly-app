/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",   // 🔥 CRITICAL FIX

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig