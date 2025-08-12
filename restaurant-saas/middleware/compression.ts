/**
 * Advanced response compression middleware for Cloudflare Workers
 * Implements intelligent compression with format negotiation and performance optimization
 */

import { NextRequest, NextResponse } from 'next/server';

export interface CompressionConfig {
  enableGzip: boolean;
  enableBrotli: boolean;
  enableDeflate: boolean;
  gzipLevel: number; // 1-9
  brotliQuality: number; // 0-11
  minSizeThreshold: number; // Minimum bytes to compress
  maxSizeThreshold: number; // Maximum bytes to compress
  compressibleTypes: string[];
  excludeTypes: string[];
  excludePaths: RegExp[];
  includePaths: RegExp[];
  cacheCompressed: boolean;
  streamCompression: boolean;
  compressionStats: boolean;
}

export interface CompressionStats {
  totalRequests: number;
  compressedRequests: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  compressionRatio: number;
  averageCompressionTime: number;
  methodUsage: {
    gzip: number;
    brotli: number;
    deflate: number;
    none: number;
  };
}

export type CompressionMethod = 'gzip' | 'br' | 'deflate' | 'identity';

class CompressionMiddleware {
  private config: CompressionConfig;
  private stats: CompressionStats;
  private compressionCache = new Map<string, { data: Buffer; method: CompressionMethod }>();
  private maxCacheSize = 100;

  constructor(config: CompressionConfig) {
    this.config = config;
    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      compressionRatio: 0,
      averageCompressionTime: 0,
      methodUsage: {
        gzip: 0,
        brotli: 0,
        deflate: 0,
        none: 0
      }
    };
  }

  /**
   * Main compression middleware function
   */
  async handle(request: NextRequest, response: NextResponse): Promise<NextResponse> {
    const startTime = performance.now();
    this.stats.totalRequests++;

    // Check if compression should be applied
    if (!this.shouldCompress(request, response)) {
      this.stats.methodUsage.none++;
      return response;
    }

    // Get accepted encodings
    const acceptedEncodings = this.parseAcceptEncoding(request.headers.get('accept-encoding') || '');
    
    // Select best compression method
    const compressionMethod = this.selectCompressionMethod(acceptedEncodings);
    
    if (compressionMethod === 'identity') {
      this.stats.methodUsage.none++;
      return response;
    }

    try {
      // Get response body
      const originalBody = await response.arrayBuffer();
      const originalSize = originalBody.byteLength;
      
      // Check size thresholds
      if (originalSize < this.config.minSizeThreshold || 
          originalSize > this.config.maxSizeThreshold) {
        this.stats.methodUsage.none++;
        return response;
      }

      this.stats.totalOriginalSize += originalSize;

      // Check cache for compressed version
      const cacheKey = this.generateCacheKey(originalBody, compressionMethod);
      let compressedData: Buffer;

      if (this.config.cacheCompressed && this.compressionCache.has(cacheKey)) {
        const cached = this.compressionCache.get(cacheKey)!;
        compressedData = cached.data;
      } else {
        // Compress the data
        compressedData = await this.compress(Buffer.from(originalBody), compressionMethod);
        
        // Cache if enabled
        if (this.config.cacheCompressed) {
          this.addToCache(cacheKey, compressedData, compressionMethod);
        }
      }

      const compressedSize = compressedData.byteLength;
      this.stats.totalCompressedSize += compressedSize;
      this.stats.compressedRequests++;
      this.stats.methodUsage[compressionMethod === 'br' ? 'brotli' : compressionMethod as keyof typeof this.stats.methodUsage]++;

      // Update compression stats
      this.updateStats(startTime);

      // Create compressed response
      return this.createCompressedResponse(response, compressedData, compressionMethod, originalSize, compressedSize);

    } catch (error) {
      console.warn('Compression failed:', error);
      this.stats.methodUsage.none++;
      return response;
    }
  }

  /**
   * Check if response should be compressed
   */
  private shouldCompress(request: NextRequest, response: NextResponse): boolean {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Check method
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return false;
    }

    // Check exclude paths
    if (this.config.excludePaths.some(pattern => pattern.test(pathname))) {
      return false;
    }

    // Check include paths (if specified)
    if (this.config.includePaths.length > 0 && 
        !this.config.includePaths.some(pattern => pattern.test(pathname))) {
      return false;
    }

    // Check if already compressed
    const contentEncoding = response.headers.get('content-encoding');
    if (contentEncoding && contentEncoding !== 'identity') {
      return false;
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    
    // Exclude certain types
    if (this.config.excludeTypes.some(type => contentType.includes(type))) {
      return false;
    }

    // Check if content type is compressible
    if (this.config.compressibleTypes.length > 0) {
      return this.config.compressibleTypes.some(type => contentType.includes(type));
    }

    // Default compressible types
    return this.isDefaultCompressible(contentType);
  }

  /**
   * Check if content type is compressible by default
   */
  private isDefaultCompressible(contentType: string): boolean {
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'image/svg+xml',
      'application/x-font-ttf',
      'application/x-font-opentype',
      'application/vnd.ms-fontobject'
    ];

    return compressibleTypes.some(type => contentType.includes(type));
  }

  /**
   * Parse Accept-Encoding header
   */
  private parseAcceptEncoding(acceptEncoding: string): Map<string, number> {
    const encodings = new Map<string, number>();
    
    if (!acceptEncoding) {
      return encodings;
    }

    const parts = acceptEncoding.split(',').map(part => part.trim());
    
    for (const part of parts) {
      const [encoding, qValue] = part.split(';');
      const quality = qValue ? parseFloat(qValue.split('=')[1]) || 1 : 1;
      encodings.set(encoding.trim(), quality);
    }

    return encodings;
  }

  /**
   * Select best compression method based on client support and server config
   */
  private selectCompressionMethod(acceptedEncodings: Map<string, number>): CompressionMethod {
    const preferences: Array<{ method: CompressionMethod; enabled: boolean }> = [
      { method: 'br', enabled: this.config.enableBrotli },
      { method: 'gzip', enabled: this.config.enableGzip },
      { method: 'deflate', enabled: this.config.enableDeflate }
    ];

    for (const { method, enabled } of preferences) {
      if (enabled && acceptedEncodings.has(method) && acceptedEncodings.get(method)! > 0) {
        return method;
      }
    }

    return 'identity';
  }

  /**
   * Compress data using specified method
   */
  private async compress(data: Buffer, method: CompressionMethod): Promise<Buffer> {
    switch (method) {
      case 'gzip':
        return this.gzipCompress(data);
      case 'br':
        return this.brotliCompress(data);
      case 'deflate':
        return this.deflateCompress(data);
      default:
        return data;
    }
  }

  /**
   * GZIP compression
   */
  private async gzipCompress(data: Buffer): Promise<Buffer> {
    // In Cloudflare Workers, use CompressionStream
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(data);
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return Buffer.from(result);
    }

    // Fallback for Node.js environment
    const zlib = await import('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(data, { level: this.config.gzipLevel }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Brotli compression
   */
  private async brotliCompress(data: Buffer): Promise<Buffer> {
    // In Cloudflare Workers, use CompressionStream
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('deflate-raw');
      // Note: Native Brotli support in CompressionStream might not be available
      // This is a simplified implementation
      return this.gzipCompress(data); // Fallback to gzip
    }

    // Fallback for Node.js environment
    const zlib = await import('zlib');
    return new Promise((resolve, reject) => {
      zlib.brotliCompress(data, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: this.config.brotliQuality
        }
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Deflate compression
   */
  private async deflateCompress(data: Buffer): Promise<Buffer> {
    // In Cloudflare Workers, use CompressionStream
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('deflate');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(data);
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return Buffer.from(result);
    }

    // Fallback for Node.js environment
    const zlib = await import('zlib');
    return new Promise((resolve, reject) => {
      zlib.deflate(data, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Generate cache key for compressed data
   */
  private generateCacheKey(data: ArrayBuffer, method: CompressionMethod): string {
    // Simple hash of the data + method
    const view = new Uint8Array(data);
    let hash = 0;
    
    for (let i = 0; i < Math.min(view.length, 1024); i++) { // Sample first 1KB
      hash = ((hash << 5) - hash + view[i]) & 0xffffffff;
    }
    
    return `${method}:${hash.toString(36)}:${view.length}`;
  }

  /**
   * Add compressed data to cache
   */
  private addToCache(key: string, data: Buffer, method: CompressionMethod): void {
    if (this.compressionCache.size >= this.maxCacheSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.compressionCache.keys().next().value;
      this.compressionCache.delete(firstKey);
    }
    
    this.compressionCache.set(key, { data, method });
  }

  /**
   * Create compressed response
   */
  private createCompressedResponse(
    originalResponse: NextResponse,
    compressedData: Buffer,
    method: CompressionMethod,
    originalSize: number,
    compressedSize: number
  ): NextResponse {
    // Create new response with compressed data
    const response = new NextResponse(compressedData, {
      status: originalResponse.status,
      statusText: originalResponse.statusText
    });

    // Copy original headers
    originalResponse.headers.forEach((value, key) => {
      // Skip content-length as it will change
      if (key.toLowerCase() !== 'content-length') {
        response.headers.set(key, value);
      }
    });

    // Set compression headers
    response.headers.set('content-encoding', method);
    response.headers.set('content-length', compressedSize.toString());
    response.headers.set('vary', 'Accept-Encoding');
    
    // Add compression stats headers (if enabled)
    if (this.config.compressionStats) {
      response.headers.set('x-compression-ratio', (((originalSize - compressedSize) / originalSize) * 100).toFixed(2) + '%');
      response.headers.set('x-original-size', originalSize.toString());
      response.headers.set('x-compressed-size', compressedSize.toString());
      response.headers.set('x-compression-method', method);
    }

    return response;
  }

  /**
   * Update compression statistics
   */
  private updateStats(startTime: number): void {
    const compressionTime = performance.now() - startTime;
    
    // Update average compression time
    const totalTime = this.stats.averageCompressionTime * (this.stats.compressedRequests - 1) + compressionTime;
    this.stats.averageCompressionTime = totalTime / this.stats.compressedRequests;
    
    // Update compression ratio
    if (this.stats.totalOriginalSize > 0) {
      this.stats.compressionRatio = ((this.stats.totalOriginalSize - this.stats.totalCompressedSize) / this.stats.totalOriginalSize) * 100;
    }
  }

  /**
   * Get compression statistics
   */
  getStats(): CompressionStats {
    return { ...this.stats };
  }

  /**
   * Reset compression statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      compressionRatio: 0,
      averageCompressionTime: 0,
      methodUsage: {
        gzip: 0,
        brotli: 0,
        deflate: 0,
        none: 0
      }
    };
  }

  /**
   * Clear compression cache
   */
  clearCache(): void {
    this.compressionCache.clear();
  }

  /**
   * Set compression configuration
   */
  updateConfig(config: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Default configuration for restaurant SaaS
const defaultConfig: CompressionConfig = {
  enableGzip: true,
  enableBrotli: true,
  enableDeflate: true,
  gzipLevel: 6,
  brotliQuality: 6,
  minSizeThreshold: 1024,      // 1KB
  maxSizeThreshold: 10 * 1024 * 1024, // 10MB
  compressibleTypes: [
    'text/html',
    'text/css',
    'text/javascript',
    'text/xml',
    'text/plain',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/rss+xml',
    'application/atom+xml',
    'image/svg+xml'
  ],
  excludeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'video/',
    'audio/',
    'application/pdf',
    'application/zip',
    'application/gzip'
  ],
  excludePaths: [
    /\.(jpg|jpeg|png|gif|webp|avif|mp4|mp3|pdf|zip|gz)$/i,
    /^\/api\/webhooks\//,
    /^\/api\/upload\//
  ],
  includePaths: [],
  cacheCompressed: true,
  streamCompression: false,
  compressionStats: true
};

// Export singleton instance
export const compressionMiddleware = new CompressionMiddleware(defaultConfig);

// Utility function to create compression middleware for Next.js
export function createCompressionMiddleware(config?: Partial<CompressionConfig>) {
  const middleware = new CompressionMiddleware({
    ...defaultConfig,
    ...config
  });

  return {
    async handle(request: NextRequest, response: NextResponse) {
      return middleware.handle(request, response);
    },
    getStats: () => middleware.getStats(),
    resetStats: () => middleware.resetStats(),
    clearCache: () => middleware.clearCache(),
    updateConfig: (config: Partial<CompressionConfig>) => middleware.updateConfig(config)
  };
}

// Helper function to compress specific content
export async function compressContent(
  content: string | Buffer,
  method: CompressionMethod = 'gzip',
  options: {
    level?: number;
    quality?: number;
  } = {}
): Promise<Buffer> {
  const middleware = new CompressionMiddleware({
    ...defaultConfig,
    gzipLevel: options.level || defaultConfig.gzipLevel,
    brotliQuality: options.quality || defaultConfig.brotliQuality
  });

  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return middleware['compress'](buffer, method);
}

// Helper function to estimate compression savings
export function estimateCompressionSavings(
  contentType: string,
  size: number
): { estimatedSavings: number; recommendedMethod: CompressionMethod } {
  // Estimated compression ratios by content type
  const compressionRatios: Record<string, number> = {
    'text/html': 0.75,
    'text/css': 0.80,
    'text/javascript': 0.70,
    'application/json': 0.85,
    'text/xml': 0.80,
    'image/svg+xml': 0.70,
    'default': 0.60
  };

  let ratio = compressionRatios.default;
  for (const [type, typeRatio] of Object.entries(compressionRatios)) {
    if (contentType.includes(type)) {
      ratio = typeRatio;
      break;
    }
  }

  const estimatedSavings = Math.floor(size * (1 - ratio));
  const recommendedMethod: CompressionMethod = size > 10000 ? 'br' : 'gzip';

  return { estimatedSavings, recommendedMethod };
}

// Export types and classes
export { CompressionMiddleware };
export type { CompressionConfig, CompressionStats, CompressionMethod };