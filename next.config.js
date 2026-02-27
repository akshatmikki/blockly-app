/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",   // 🔥 CRITICAL FIX

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig