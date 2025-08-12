/**
 * Custom image loader for Cloudflare Workers
 * This loader is used when Next.js images need to be optimized for Cloudflare deployment
 */

interface ImageLoaderProps {
  src: string
  width: number
  quality?: number
}

export default function cloudflareImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // If it's already an absolute URL, return as-is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }
  
  // For local images, construct the URL based on the environment
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // In production, you might want to use Cloudflare Images or another CDN
  if (process.env.NODE_ENV === 'production') {
    // Example using Cloudflare Images (requires setup)
    // return `https://imagedelivery.net/your-account-hash/${src}/w=${width},q=${quality || 75}`
    
    // For now, return the direct URL
    return `${baseUrl}${src}`
  }
  
  // In development, return the direct URL
  return `${baseUrl}${src}`
}