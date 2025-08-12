/** @type {import('next').NextConfig} */
const nextConfig = {
  // Moved from experimental as per Next.js 15 requirements
  serverExternalPackages: ['@node-rs/argon2', '@node-rs/bcrypt'],
  
  // Output file tracing for Cloudflare Pages compatibility
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/**/*.wasm', './node_modules/**/*.node'],
  },
  
  // Image optimization for Cloudflare Workers
  images: {
    loader: 'custom',
    loaderFile: './lib/cloudflare-image-loader.ts',
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
  
  // Cloudflare Workers compatibility
  webpack: (config, { dev, isServer }) => {
    // Handle WASM files for Cloudflare Workers
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }
    
    // Optimize for edge runtime
    if (!dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
      }
    }
    
    return config
  },
  
  // Output configuration for static exports
  trailingSlash: false,
  
  // Redirects and rewrites
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/dashboard/overview',
        permanent: false,
      },
    ]
  },
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Enable Power Features
  poweredByHeader: false,
  
  // Compression
  compress: true,
}

export default nextConfig