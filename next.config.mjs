/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Disable webpack's persistent filesystem cache. It tries to serialize a CSS
  // module-warning it can't ("No serializer registered for Warning"), which can
  // stall/fail the build on Vercel right after "Compiled with warnings".
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};
export default nextConfig;
