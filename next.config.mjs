/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Removed output: 'export' to enable SSR with Neon DB
};

export default nextConfig;
