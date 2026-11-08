/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'loremflickr.com' },
      { protocol: 'https', hostname: 'media.istockphoto.com' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
      { protocol: 'https', hostname: 'www.watsonsreach.com.au' },
    ],
  },
};

export default nextConfig;

