/**
 * Advanced image optimization utilities for restaurant SaaS
 * Integrates with Cloudflare Images and implements modern image delivery
 */

export interface ImageTransform {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png' | 'auto';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  gravity?: 'auto' | 'center' | 'top' | 'bottom' | 'left' | 'right';
  blur?: number;
  brightness?: number;
  contrast?: number;
  gamma?: number;
  sharpen?: number;
  background?: string;
  trim?: boolean;
  rotate?: number;
}

export interface ResponsiveImageConfig {
  src: string;
  alt: string;
  sizes: string;
  breakpoints: number[];
  aspectRatio?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  transform?: ImageTransform;
}

export interface ImageOptimizationConfig {
  cloudflareAccountHash?: string;
  defaultQuality: number;
  defaultFormat: 'auto' | 'webp' | 'avif';
  enableLazyLoading: boolean;
  placeholderType: 'blur' | 'shimmer' | 'empty';
  breakpoints: number[];
  maxWidth: number;
  compressionLevel: number;
}

class ImageOptimizer {
  private config: ImageOptimizationConfig;
  private supportedFormats = new Set<string>();

  constructor(config: ImageOptimizationConfig) {
    this.config = config;
    this.detectSupportedFormats();
  }

  /**
   * Detect browser-supported image formats
   */
  private detectSupportedFormats(): void {
    if (typeof window === 'undefined') {
      // Server-side: assume modern browser capabilities
      this.supportedFormats.add('webp');
      this.supportedFormats.add('avif');
      return;
    }

    // Test WebP support
    const webpCanvas = document.createElement('canvas');
    webpCanvas.width = 1;
    webpCanvas.height = 1;
    const webpSupported = webpCanvas.toDataURL('image/webp').startsWith('data:image/webp');
    if (webpSupported) {
      this.supportedFormats.add('webp');
    }

    // Test AVIF support
    const avifImg = new Image();
    avifImg.onload = () => this.supportedFormats.add('avif');
    avifImg.onerror = () => {}; // Silent fail
    avifImg.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  }

  /**
   * Get optimal image format based on browser support
   */
  private getOptimalFormat(requestedFormat?: string): string {
    if (requestedFormat && requestedFormat !== 'auto') {
      return requestedFormat;
    }

    if (this.supportedFormats.has('avif')) {
      return 'avif';
    }
    if (this.supportedFormats.has('webp')) {
      return 'webp';
    }
    return 'jpg';
  }

  /**
   * Generate Cloudflare Images URL
   */
  generateCloudflareImageUrl(src: string, transform: ImageTransform = {}): string {
    if (!this.config.cloudflareAccountHash) {
      return src; // Fallback to original URL
    }

    // Extract image ID from src if it's already a Cloudflare Images URL
    let imageId = src;
    const cloudflareMatch = src.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
    if (cloudflareMatch) {
      imageId = cloudflareMatch[1];
    } else if (src.startsWith('http')) {
      // For external URLs, you'd need to upload to Cloudflare Images first
      // This is a simplified example
      imageId = this.generateImageId(src);
    }

    const transforms: string[] = [];

    // Apply transformations
    if (transform.width) transforms.push(`w=${transform.width}`);
    if (transform.height) transforms.push(`h=${transform.height}`);
    if (transform.quality) transforms.push(`q=${transform.quality}`);
    if (transform.format) transforms.push(`f=${this.getOptimalFormat(transform.format)}`);
    if (transform.fit) transforms.push(`fit=${transform.fit}`);
    if (transform.gravity) transforms.push(`gravity=${transform.gravity}`);
    if (transform.blur) transforms.push(`blur=${transform.blur}`);
    if (transform.brightness) transforms.push(`brightness=${transform.brightness}`);
    if (transform.contrast) transforms.push(`contrast=${transform.contrast}`);
    if (transform.gamma) transforms.push(`gamma=${transform.gamma}`);
    if (transform.sharpen) transforms.push(`sharpen=${transform.sharpen}`);
    if (transform.background) transforms.push(`background=${transform.background}`);
    if (transform.trim) transforms.push('trim=true');
    if (transform.rotate) transforms.push(`rotate=${transform.rotate}`);

    const transformString = transforms.join(',');
    return `https://imagedelivery.net/${this.config.cloudflareAccountHash}/${imageId}/${transformString}`;
  }

  /**
   * Generate consistent image ID from URL
   */
  private generateImageId(url: string): string {
    // In a real implementation, this would be a hash of the URL
    // or the actual ID returned when uploading to Cloudflare Images
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(src: string, transform: ImageTransform = {}): string {
    const srcsets: string[] = [];

    for (const width of this.config.breakpoints) {
      const url = this.generateCloudflareImageUrl(src, {
        ...transform,
        width,
        quality: transform.quality || this.config.defaultQuality,
        format: transform.format || this.config.defaultFormat
      });
      srcsets.push(`${url} ${width}w`);
    }

    return srcsets.join(', ');
  }

  /**
   * Generate blur placeholder data URL
   */
  generateBlurPlaceholder(src: string, width = 8, height = 8): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Create a simple gradient placeholder
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.1);
  }

  /**
   * Generate shimmer placeholder SVG
   */
  generateShimmerPlaceholder(width: number, height: number): string {
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <animateTransform 
              attributeName="gradientTransform" 
              type="translate" 
              values="-100 0;100 0;-100 0" 
              dur="2s" 
              repeatCount="indefinite"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#shimmer)" />
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Optimize image configuration for responsive display
   */
  optimizeForResponsive(config: ResponsiveImageConfig): ResponsiveImageConfig {
    const optimized = { ...config };

    // Generate optimized srcset
    if (!optimized.sizes) {
      optimized.sizes = this.generateDefaultSizes();
    }

    // Generate blur placeholder if needed
    if (optimized.placeholder === 'blur' && !optimized.blurDataURL) {
      optimized.blurDataURL = this.generateBlurPlaceholder(optimized.src);
    }

    // Ensure transform has optimal defaults
    if (!optimized.transform) {
      optimized.transform = {};
    }

    optimized.transform = {
      quality: this.config.defaultQuality,
      format: this.config.defaultFormat,
      fit: 'cover',
      ...optimized.transform
    };

    return optimized;
  }

  /**
   * Generate default sizes attribute
   */
  private generateDefaultSizes(): string {
    return [
      '(max-width: 640px) 100vw',
      '(max-width: 768px) 100vw',
      '(max-width: 1024px) 50vw',
      '33vw'
    ].join(', ');
  }

  /**
   * Calculate image dimensions maintaining aspect ratio
   */
  calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth?: number,
    targetHeight?: number,
    aspectRatio?: number
  ): { width: number; height: number } {
    if (aspectRatio) {
      if (targetWidth) {
        return {
          width: targetWidth,
          height: Math.round(targetWidth / aspectRatio)
        };
      }
      if (targetHeight) {
        return {
          width: Math.round(targetHeight * aspectRatio),
          height: targetHeight
        };
      }
    }

    if (targetWidth && targetHeight) {
      return { width: targetWidth, height: targetHeight };
    }

    if (targetWidth) {
      const ratio = targetWidth / originalWidth;
      return {
        width: targetWidth,
        height: Math.round(originalHeight * ratio)
      };
    }

    if (targetHeight) {
      const ratio = targetHeight / originalHeight;
      return {
        width: Math.round(originalWidth * ratio),
        height: targetHeight
      };
    }

    return { width: originalWidth, height: originalHeight };
  }

  /**
   * Preload critical images
   */
  preloadImage(src: string, transform?: ImageTransform): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = this.generateCloudflareImageUrl(src, transform);
    });
  }

  /**
   * Batch preload multiple images
   */
  async preloadImages(
    images: Array<{ src: string; transform?: ImageTransform }>,
    concurrent = 3
  ): Promise<void> {
    const batches: Array<Array<{ src: string; transform?: ImageTransform }>> = [];
    
    for (let i = 0; i < images.length; i += concurrent) {
      batches.push(images.slice(i, i + concurrent));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(img => this.preloadImage(img.src, img.transform))
      );
    }
  }

  /**
   * Get image metadata (requires server-side implementation)
   */
  async getImageMetadata(src: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  } | null> {
    try {
      // This would typically be implemented server-side
      // For client-side, we can only get dimensions after loading
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          resolve({
            width: img.naturalWidth,
            height: img.naturalHeight,
            format: 'unknown',
            size: 0
          });
        };
        img.onerror = () => reject(null);
        img.src = src;
      });
    } catch (error) {
      console.warn('Failed to get image metadata:', error);
      return null;
    }
  }

  /**
   * Generate WebP fallback chain
   */
  generateFallbackChain(src: string, transform: ImageTransform = {}): string[] {
    const formats = ['avif', 'webp', 'jpg'];
    return formats.map(format => 
      this.generateCloudflareImageUrl(src, { ...transform, format })
    );
  }

  /**
   * Monitor image loading performance
   */
  measureImagePerformance(src: string): Promise<{
    loadTime: number;
    renderTime: number;
    size: number;
  }> {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const loadTime = performance.now() - startTime;
        
        // Estimate render time (simplified)
        requestAnimationFrame(() => {
          const renderTime = performance.now() - startTime;
          
          resolve({
            loadTime,
            renderTime,
            size: 0 // Would need server-side implementation
          });
        });
      };
      
      img.onerror = reject;
      img.src = src;
    });
  }
}

// Default configuration for restaurant SaaS
const defaultConfig: ImageOptimizationConfig = {
  defaultQuality: 80,
  defaultFormat: 'auto',
  enableLazyLoading: true,
  placeholderType: 'blur',
  breakpoints: [640, 768, 1024, 1280, 1536],
  maxWidth: 1920,
  compressionLevel: 8
};

// Export singleton instance
export const imageOptimizer = new ImageOptimizer(defaultConfig);

// Export utility functions
export const generateImageUrl = (src: string, transform?: ImageTransform) => 
  imageOptimizer.generateCloudflareImageUrl(src, transform);

export const generateSrcSet = (src: string, transform?: ImageTransform) => 
  imageOptimizer.generateSrcSet(src, transform);

export const generatePlaceholder = (width: number, height: number, type: 'blur' | 'shimmer' = 'blur') => 
  type === 'blur' 
    ? imageOptimizer.generateBlurPlaceholder('', width, height)
    : imageOptimizer.generateShimmerPlaceholder(width, height);

// Export types and classes
export { ImageOptimizer };
export type { 
  ImageTransform, 
  ResponsiveImageConfig, 
  ImageOptimizationConfig 
};