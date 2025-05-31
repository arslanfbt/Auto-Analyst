/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      '4q2e4qu710mvgubg.public.blob.vercel-storage.com', 
      'lh3.googleusercontent.com', 
      'deepseek.com'
    ],
    formats: ['image/webp'],             // Use only WebP to reduce transformations
    minimumCacheTTL: 2678400,            // Cache for 31 days
    deviceSizes: [640, 768, 1024, 1280], // Tailor to your design breakpoints
    imageSizes: [16, 32, 48, 64, 96],    // For small UI elements/icons
  },
};

module.exports = nextConfig;