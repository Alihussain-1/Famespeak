/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ws', '@andresaya/edge-tts'],
  }
};

export default nextConfig;
