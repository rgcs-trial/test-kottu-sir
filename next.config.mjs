// Conditional import for bundle analyzer
let BundleAnalyzerPlugin;
try {
  ({ BundleAnalyzerPlugin } = await import('webpack-bundle-analyzer'));
} catch {
  // Bundle analyzer not available
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Moved from experimental as per Next.js 15 requirements
  serverExternalPackages: ['@node-rs/argon2', '@node-rs/bcrypt'],
  
  // Internationalization configuration
  // Note: next-intl handles routing in middleware, so we don't use Next.js i18n config
  
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
  
  // Performance optimizations
  swcMinify: true,
  modularizeImports: {
    lodash: {
      transform: 'lodash/{{member}}',
    },
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },
  
  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    gzipSize: true,
    craCompat: true,
    esmExternals: true,
    appDir: true,
    serverActions: true,
    typedRoutes: true,
  },
  
  // Bundle optimization
  productionBrowserSourceMaps: false,
  
  // Cloudflare Workers compatibility
  webpack: (config, { dev, isServer, webpack }) => {
    // Handle WASM files for Cloudflare Workers
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }
    
    // Support for importing JSON files (for translations)
    config.module.rules.push({
      test: /\.json$/,
      type: 'json'
    })
    
    // Bundle analyzer in development
    if (!dev && !isServer && process.env.ANALYZE === 'true' && BundleAnalyzerPlugin) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: './analyze/client.html'
        })
      );
    }
    
    // Optimization for production
    if (!dev) {
      // Tree shaking improvements
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\/]node_modules[\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            },
            common: {
              minChunks: 2,
              chunks: 'all',
              name: 'common',
              priority: 5,
              reuseExistingChunk: true,
              enforce: true
            },
            styles: {
              name: 'styles',
              test: /\.(css|scss|sass)$/,
              chunks: 'all',
              enforce: true
            }
          }
        }
      };
      
      // Minimize bundle size
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname),
      };
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
  
  // Compression and caching
  compress: true,
  
  // Performance budgets
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Reduce bundle size
  generateEtags: true,
  
  // Optimize fonts
  optimizeFonts: true,
  
  // Generate static files
  generateBuildId: async () => {
    return process.env.GIT_COMMIT_SHA || 'development'
  },
}

export default nextConfig