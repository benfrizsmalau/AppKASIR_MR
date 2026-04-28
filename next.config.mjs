import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  turbopack: {},

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Jangan cache server actions & API routes agar tidak stale
  workboxOptions: {
    disableDevLogs: true,
    // Exclude server action requests dari cache
    navigateFallbackDenylist: [/^\/_next\//, /^\/api\//],
    runtimeCaching: [
      {
        // Static assets Next.js — cache dengan stale-while-revalidate
        urlPattern: /^https:\/\/.*\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        // Gambar — cache lama ok
        urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        // Halaman HTML — selalu network-first agar server action ID selalu fresh
        urlPattern: /^https:\/\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
    ],
  },
})(nextConfig);
