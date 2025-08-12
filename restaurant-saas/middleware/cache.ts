/**
 * Advanced edge caching middleware for Cloudflare Workers
 * Implements intelligent caching strategies with geographic distribution
 */

import { NextRequest, NextResponse } from 'next/server';
import { cacheManager, CacheStrategy } from '@/lib/performance/cache-manager';

export interface CacheConfig {
  defaultTTL: number;
  staticAssetsTTL: number;
  apiResponseTTL: number;
  htmlTTL: number;
  browserCacheTTL: number;
  staleWhileRevalidate: number;
  enableGzip: boolean;
  enableBrotli: boolean;
  enableETags: boolean;
  varyHeaders: string[];
  cacheableStatusCodes: number[];
  excludePaths: RegExp[];
  includePaths: RegExp[];
  bypassParams: string[];
}

export interface CacheHeaders {
  'Cache-Control': string;
  'CDN-Cache-Control'?: string;
  'Cloudflare-CDN-Cache-Control'?: string;
  'Vary'?: string;
  'ETag'?: string;
  'Last-Modified'?: string;
  'Expires'?: string;
  'X-Cache-Status'?: string;
  'X-Cache-Key'?: string;
  'X-Cache-TTL'?: string;
}

class EdgeCacheMiddleware {
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Main middleware function
   */
  async handle(request: NextRequest): Promise<NextResponse | null> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Only cache GET and HEAD requests
    if (method !== 'GET' && method !== 'HEAD') {
      return null;
    }

    // Check if path should be excluded
    if (this.shouldExcludePath(pathname)) {
      return null;
    }

    // Check if path should be included (if include patterns are defined)
    if (this.config.includePaths.length > 0 && !this.shouldIncludePath(pathname)) {
      return null;
    }

    // Check for cache bypass parameters
    if (this.hasBypassParams(url.searchParams)) {
      return null;
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(request);

    // Try to get from cache
    const cached = await this.getFromCache(cacheKey, request);
    if (cached) {
      return cached;
    }

    // If not in cache, continue to next middleware/handler
    return null;
  }

  /**
   * Cache response after it's generated
   */
  async cacheResponse(
    request: NextRequest,
    response: NextResponse,
    cacheKey?: string
  ): Promise<NextResponse> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Don't cache if response has errors or isn't cacheable
    if (!this.isCacheableResponse(response)) {
      return response;
    }

    // Generate cache key if not provided
    const key = cacheKey || this.generateCacheKey(request);

    // Determine TTL based on content type and path
    const ttl = this.determineTTL(pathname, response);

    // Get cache strategy
    const strategy = this.getCacheStrategy(pathname, response);

    // Clone response to cache (response can only be read once)
    const responseClone = response.clone();

    // Cache the response
    await this.setInCache(key, responseClone, ttl, strategy);

    // Add cache headers to the original response
    return this.addCacheHeaders(response, ttl, strategy, key);
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: NextRequest): string {
    const url = new URL(request.url);
    
    // Base key components
    const components = [
      url.pathname,
      url.search
    ];

    // Add vary headers to cache key
    for (const header of this.config.varyHeaders) {
      const value = request.headers.get(header);
      if (value) {
        components.push(`${header}:${value}`);
      }
    }

    // Add device type for responsive caching
    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = this.getDeviceType(userAgent);
    components.push(`device:${deviceType}`);

    // Add geographic region if available
    const cfCountry = request.headers.get('cf-ipcountry');
    if (cfCountry) {
      components.push(`country:${cfCountry}`);
    }

    // Hash the components for consistent key
    return this.hashComponents(components);
  }

  /**
   * Get device type from user agent
   */
  private getDeviceType(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|webOS/i.test(userAgent)) {
      return 'mobile';
    }
    if (/Tablet|iPad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Hash cache key components
   */
  private hashComponents(components: string[]): string {
    const key = components.join('|');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `cache:${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get response from cache
   */
  private async getFromCache(
    cacheKey: string,
    request: NextRequest
  ): Promise<NextResponse | null> {
    try {
      const cached = await cacheManager.get<{
        body: string;
        headers: Record<string, string>;
        status: number;
        statusText: string;
      }>(cacheKey);

      if (!cached) {
        return null;
      }

      // Create response from cached data
      const response = new NextResponse(cached.body, {
        status: cached.status,
        statusText: cached.statusText
      });

      // Restore headers
      Object.entries(cached.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Add cache hit headers
      response.headers.set('X-Cache-Status', 'HIT');
      response.headers.set('X-Cache-Key', cacheKey);

      return response;
    } catch (error) {
      console.warn('Failed to get from cache:', error);
      return null;
    }
  }

  /**
   * Set response in cache
   */
  private async setInCache(
    cacheKey: string,
    response: NextResponse,
    ttl: number,
    strategy: CacheStrategy
  ): Promise<void> {
    try {
      // Read response body
      const body = await response.text();

      // Prepare cache data
      const cacheData = {
        body,
        headers: Object.fromEntries(response.headers.entries()),
        status: response.status,
        statusText: response.statusText
      };

      // Cache with appropriate strategy
      await cacheManager.set(cacheKey, cacheData, {
        ttl,
        tags: this.generateCacheTags(response)
      });
    } catch (error) {
      console.warn('Failed to set cache:', error);
    }
  }

  /**
   * Generate cache tags for invalidation
   */
  private generateCacheTags(response: NextResponse): string[] {
    const tags: string[] = [];
    
    // Add content-type based tags
    const contentType = response.headers.get('content-type');
    if (contentType) {
      if (contentType.includes('application/json')) {
        tags.push('api', 'json');
      } else if (contentType.includes('text/html')) {
        tags.push('html', 'page');
      } else if (contentType.includes('image/')) {
        tags.push('image', 'asset');
      } else if (contentType.includes('text/css') || contentType.includes('javascript')) {
        tags.push('asset', 'static');
      }
    }

    return tags;
  }

  /**
   * Determine TTL based on content type and path
   */
  private determineTTL(pathname: string, response: NextResponse): number {
    // Static assets
    if (this.isStaticAsset(pathname)) {
      return this.config.staticAssetsTTL;
    }

    // API responses
    if (pathname.startsWith('/api/')) {
      return this.config.apiResponseTTL;
    }

    // HTML pages
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/html')) {
      return this.config.htmlTTL;
    }

    return this.config.defaultTTL;
  }

  /**
   * Get cache strategy based on content
   */
  private getCacheStrategy(pathname: string, response: NextResponse): CacheStrategy {
    // Static assets can be cached aggressively
    if (this.isStaticAsset(pathname)) {
      return CacheStrategy.CACHE_FIRST;
    }

    // API responses use stale-while-revalidate
    if (pathname.startsWith('/api/')) {
      return CacheStrategy.STALE_WHILE_REVALIDATE;
    }

    // HTML pages use stale-while-revalidate
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/html')) {
      return CacheStrategy.STALE_WHILE_REVALIDATE;
    }

    return CacheStrategy.STALE_WHILE_REVALIDATE;
  }

  /**
   * Add cache headers to response
   */
  private addCacheHeaders(
    response: NextResponse,
    ttl: number,
    strategy: CacheStrategy,
    cacheKey: string
  ): NextResponse {
    const maxAge = Math.floor(ttl / 1000);
    const swr = Math.floor(this.config.staleWhileRevalidate / 1000);

    const headers: CacheHeaders = {
      'Cache-Control': this.buildCacheControlHeader(maxAge, swr, strategy),
      'X-Cache-Status': 'MISS',
      'X-Cache-Key': cacheKey,
      'X-Cache-TTL': ttl.toString()
    };

    // Add Vary header
    if (this.config.varyHeaders.length > 0) {
      headers['Vary'] = this.config.varyHeaders.join(', ');
    }

    // Add ETag if enabled
    if (this.config.enableETags) {
      headers['ETag'] = this.generateETag(response);
    }

    // Add Cloudflare specific headers
    headers['Cloudflare-CDN-Cache-Control'] = `max-age=${maxAge}`;

    // Apply headers
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) {
        response.headers.set(key, value);
      }
    });

    return response;
  }

  /**
   * Build Cache-Control header value
   */
  private buildCacheControlHeader(
    maxAge: number,
    swr: number,
    strategy: CacheStrategy
  ): string {
    const directives: string[] = [];

    switch (strategy) {
      case CacheStrategy.CACHE_FIRST:
        directives.push('public');
        directives.push(`max-age=${maxAge}`);
        directives.push('immutable');
        break;

      case CacheStrategy.STALE_WHILE_REVALIDATE:
        directives.push('public');
        directives.push(`max-age=${maxAge}`);
        directives.push(`stale-while-revalidate=${swr}`);
        break;

      case CacheStrategy.NETWORK_FIRST:
        directives.push('public');
        directives.push(`max-age=${Math.min(maxAge, 60)}`); // Short cache for network-first
        directives.push('must-revalidate');
        break;

      case CacheStrategy.NETWORK_ONLY:
        directives.push('no-cache');
        directives.push('no-store');
        directives.push('must-revalidate');
        break;

      default:
        directives.push('public');
        directives.push(`max-age=${maxAge}`);
    }

    return directives.join(', ');
  }

  /**
   * Generate ETag for response
   */
  private generateETag(response: NextResponse): string {
    // Simple ETag based on response hash
    // In production, you might want to use a more sophisticated method
    const content = JSON.stringify({
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status
    });
    
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `"${Math.abs(hash).toString(36)}"`;
  }

  /**
   * Check if path should be excluded from caching
   */
  private shouldExcludePath(pathname: string): boolean {
    return this.config.excludePaths.some(pattern => pattern.test(pathname));
  }

  /**
   * Check if path should be included in caching
   */
  private shouldIncludePath(pathname: string): boolean {
    return this.config.includePaths.some(pattern => pattern.test(pathname));
  }

  /**
   * Check if request has cache bypass parameters
   */
  private hasBypassParams(searchParams: URLSearchParams): boolean {
    return this.config.bypassParams.some(param => searchParams.has(param));
  }

  /**
   * Check if response is cacheable
   */
  private isCacheableResponse(response: NextResponse): boolean {
    // Check status code
    if (!this.config.cacheableStatusCodes.includes(response.status)) {
      return false;
    }

    // Check cache-control header
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl && (
      cacheControl.includes('no-cache') ||
      cacheControl.includes('no-store') ||
      cacheControl.includes('private')
    )) {
      return false;
    }

    return true;
  }

  /**
   * Check if path is a static asset
   */
  private isStaticAsset(pathname: string): boolean {
    const staticExtensions = [
      '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
      '.woff', '.woff2', '.ttf', '.eot', '.webp', '.avif', '.mp4', '.webm'
    ];
    
    return staticExtensions.some(ext => pathname.endsWith(ext));
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    await cacheManager.invalidateByTags(tags);
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    await cacheManager.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheManager.getStats();
  }
}

// Default configuration for restaurant SaaS
const defaultConfig: CacheConfig = {
  defaultTTL: 5 * 60 * 1000,      // 5 minutes
  staticAssetsTTL: 24 * 60 * 60 * 1000, // 24 hours
  apiResponseTTL: 2 * 60 * 1000,   // 2 minutes
  htmlTTL: 10 * 60 * 1000,        // 10 minutes
  browserCacheTTL: 60 * 1000,     // 1 minute
  staleWhileRevalidate: 10 * 60 * 1000, // 10 minutes
  enableGzip: true,
  enableBrotli: true,
  enableETags: true,
  varyHeaders: ['Accept-Encoding', 'User-Agent', 'Accept'],
  cacheableStatusCodes: [200, 201, 204, 206, 300, 301, 404, 410],
  excludePaths: [
    /^\/api\/auth\//,
    /^\/api\/webhooks\//,
    /^\/api\/admin\//,
    /^\/admin\//,
    /^\/dashboard\/.*\/edit/,
    /\?.*nocache/,
    /\?.*preview/
  ],
  includePaths: [
    /^\/$/,
    /^\/menu/,
    /^\/api\/menu/,
    /^\/api\/restaurant/,
    /^\/.*\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif)$/
  ],
  bypassParams: ['nocache', 'preview', 'debug', 'force-refresh']
};

// Export singleton instance
export const edgeCacheMiddleware = new EdgeCacheMiddleware(defaultConfig);

// Utility function to create cache middleware for Next.js
export function createCacheMiddleware(config?: Partial<CacheConfig>) {
  const middleware = new EdgeCacheMiddleware({
    ...defaultConfig,
    ...config
  });

  return {
    async handle(request: NextRequest) {
      return middleware.handle(request);
    },
    async cacheResponse(request: NextRequest, response: NextResponse, cacheKey?: string) {
      return middleware.cacheResponse(request, response, cacheKey);
    },
    invalidateByTags: (tags: string[]) => middleware.invalidateByTags(tags),
    clearCache: () => middleware.clearCache(),
    getStats: () => middleware.getCacheStats()
  };
}

// Helper function to conditionally cache API responses
export async function cacheApiResponse<T>(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options: {
    ttl?: number;
    tags?: string[];
    strategy?: CacheStrategy;
    bypassCache?: boolean;
  } = {}
): Promise<NextResponse> {
  if (options.bypassCache) {
    return handler();
  }

  const cacheKey = edgeCacheMiddleware['generateCacheKey'](request);
  
  // Try cache first
  const cached = await edgeCacheMiddleware['getFromCache'](cacheKey, request);
  if (cached) {
    return cached;
  }

  // Execute handler
  const response = await handler();

  // Cache the response
  return edgeCacheMiddleware.cacheResponse(request, response, cacheKey);
}

// Export types and classes
export { EdgeCacheMiddleware };
export type { CacheConfig, CacheHeaders };