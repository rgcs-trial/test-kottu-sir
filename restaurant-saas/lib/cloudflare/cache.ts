/**
 * Cloudflare Edge Caching Utilities
 * Provides intelligent caching strategies for restaurant SaaS platform
 */

import type { CloudflareEnv } from '../../env';
import { KVCache } from './kv-storage';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  staleWhileRevalidate?: number;
  cacheKey?: string;
  bypassCache?: boolean;
}

export interface EdgeCacheConfig {
  maxAge: number;
  staleWhileRevalidate?: number;
  mustRevalidate?: boolean;
  public?: boolean;
  immutable?: boolean;
}

/**
 * Edge Cache Manager
 * Handles both Cloudflare Cache API and KV-based caching
 */
export class EdgeCacheManager {
  private env: CloudflareEnv;
  private kvCache: KVCache;

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.kvCache = new KVCache(env);
  }

  /**
   * Cache response using Cloudflare Cache API
   */
  async cacheResponse(
    request: Request,
    response: Response,
    config: EdgeCacheConfig
  ): Promise<Response> {
    // Clone response for caching
    const responseToCache = response.clone();
    
    // Set cache headers
    const headers = new Headers(responseToCache.headers);
    headers.set('Cache-Control', this.buildCacheControlHeader(config));
    headers.set('X-Cache-Status', 'MISS');
    
    // Create cached response
    const cachedResponse = new Response(responseToCache.body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers,
    });

    // Cache in Cloudflare edge
    const cache = caches.default;
    await cache.put(request, cachedResponse.clone());

    return cachedResponse;
  }

  /**
   * Get cached response from Cloudflare Cache API
   */
  async getCachedResponse(request: Request): Promise<Response | null> {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cache-Status', 'HIT');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers,
      });
    }
    
    return null;
  }

  /**
   * Intelligent cache wrapper for API responses
   */
  async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    if (options.bypassCache) {
      return await fetcher();
    }

    // Try to get from KV cache first
    const cached = await this.kvCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher();
    
    // Cache with tags for invalidation
    if (options.tags) {
      await this.kvCache.setWithTags(key, data, options.tags, options.ttl);
    } else {
      await this.kvCache.set(key, data, options.ttl);
    }
    
    return data;
  }

  /**
   * Cache menu data with restaurant-specific invalidation
   */
  async cacheMenuData(
    restaurantId: string,
    fetcher: () => Promise<any>,
    ttl = 3600 // 1 hour
  ): Promise<any> {
    const key = `menu:${restaurantId}`;
    return this.withCache(key, fetcher, {
      ttl,
      tags: [`restaurant:${restaurantId}`, 'menu'],
    });
  }

  /**
   * Cache restaurant data with automatic invalidation
   */
  async cacheRestaurantData(
    restaurantId: string,
    fetcher: () => Promise<any>,
    ttl = 7200 // 2 hours
  ): Promise<any> {
    const key = `restaurant:${restaurantId}`;
    return this.withCache(key, fetcher, {
      ttl,
      tags: [`restaurant:${restaurantId}`],
    });
  }

  /**
   * Cache order data with short TTL
   */
  async cacheOrderData(
    orderId: string,
    fetcher: () => Promise<any>,
    ttl = 300 // 5 minutes
  ): Promise<any> {
    const key = `order:${orderId}`;
    return this.withCache(key, fetcher, { ttl });
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    await this.kvCache.invalidateByTags(tags);
  }

  /**
   * Invalidate all restaurant cache
   */
  async invalidateRestaurant(restaurantId: string): Promise<void> {
    await this.invalidateByTags([`restaurant:${restaurantId}`]);
  }

  /**
   * Invalidate menu cache
   */
  async invalidateMenu(restaurantId: string): Promise<void> {
    await this.invalidateByTags([`restaurant:${restaurantId}`, 'menu']);
  }

  /**
   * Purge Cloudflare cache for specific URLs
   */
  async purgeUrls(urls: string[]): Promise<void> {
    // This would require Cloudflare API integration
    // For now, we'll just invalidate KV cache
    for (const url of urls) {
      const key = this.urlToKey(url);
      await this.kvCache.delete(key);
    }
  }

  /**
   * Build cache control header
   */
  private buildCacheControlHeader(config: EdgeCacheConfig): string {
    const parts = [];
    
    if (config.public !== false) {
      parts.push('public');
    }
    
    parts.push(`max-age=${config.maxAge}`);
    
    if (config.staleWhileRevalidate) {
      parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }
    
    if (config.mustRevalidate) {
      parts.push('must-revalidate');
    }
    
    if (config.immutable) {
      parts.push('immutable');
    }
    
    return parts.join(', ');
  }

  /**
   * Convert URL to cache key
   */
  private urlToKey(url: string): string {
    return `url:${btoa(url)}`;
  }
}

/**
 * Static Asset Cache Manager
 * Handles caching for images, CSS, JS, and other static assets
 */
export class StaticAssetCache {
  private env: CloudflareEnv;

  constructor(env: CloudflareEnv) {
    this.env = env;
  }

  /**
   * Cache static assets with long TTL
   */
  async cacheStaticAsset(
    request: Request,
    response: Response
  ): Promise<Response> {
    const url = new URL(request.url);
    const extension = url.pathname.split('.').pop()?.toLowerCase();
    
    const config = this.getStaticAssetConfig(extension);
    
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', this.buildCacheControlHeader(config));
    headers.set('X-Cache-Type', 'static-asset');
    
    const cachedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    // Cache in Cloudflare edge
    const cache = caches.default;
    await cache.put(request, cachedResponse.clone());

    return cachedResponse;
  }

  /**
   * Get cache configuration for static assets
   */
  private getStaticAssetConfig(extension?: string): EdgeCacheConfig {
    const configs: Record<string, EdgeCacheConfig> = {
      // Images
      jpg: { maxAge: 31536000, immutable: true }, // 1 year
      jpeg: { maxAge: 31536000, immutable: true },
      png: { maxAge: 31536000, immutable: true },
      gif: { maxAge: 31536000, immutable: true },
      webp: { maxAge: 31536000, immutable: true },
      avif: { maxAge: 31536000, immutable: true },
      svg: { maxAge: 31536000, immutable: true },
      
      // Fonts
      woff: { maxAge: 31536000, immutable: true },
      woff2: { maxAge: 31536000, immutable: true },
      ttf: { maxAge: 31536000, immutable: true },
      otf: { maxAge: 31536000, immutable: true },
      
      // CSS/JS with versioning
      css: { maxAge: 31536000, immutable: true },
      js: { maxAge: 31536000, immutable: true },
      mjs: { maxAge: 31536000, immutable: true },
      
      // Other assets
      ico: { maxAge: 86400 }, // 1 day
      manifest: { maxAge: 86400 },
      xml: { maxAge: 86400 },
    };

    return configs[extension || ''] || { maxAge: 3600 }; // 1 hour default
  }

  /**
   * Build cache control header for static assets
   */
  private buildCacheControlHeader(config: EdgeCacheConfig): string {
    const parts = ['public'];
    
    parts.push(`max-age=${config.maxAge}`);
    
    if (config.immutable) {
      parts.push('immutable');
    }
    
    return parts.join(', ');
  }
}

/**
 * API Response Cache Manager
 * Handles intelligent caching for API endpoints
 */
export class APIResponseCache {
  private env: CloudflareEnv;
  private kvCache: KVCache;

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.kvCache = new KVCache(env);
  }

  /**
   * Cache API response with intelligent TTL
   */
  async cacheAPIResponse(
    request: Request,
    response: Response,
    options: {
      ttl?: number;
      tags?: string[];
      varyBy?: string[];
    } = {}
  ): Promise<Response> {
    const url = new URL(request.url);
    const cacheKey = this.buildAPIKey(url, options.varyBy);
    
    // Determine TTL based on endpoint
    const ttl = options.ttl || this.getAPITTL(url.pathname);
    
    try {
      const responseData = await response.clone().json();
      
      if (options.tags) {
        await this.kvCache.setWithTags(cacheKey, responseData, options.tags, ttl);
      } else {
        await this.kvCache.set(cacheKey, responseData, ttl);
      }
    } catch (error) {
      console.warn('Failed to cache API response:', error);
    }

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `public, max-age=${ttl}`);
    headers.set('X-Cache-Status', 'MISS');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Get cached API response
   */
  async getCachedAPIResponse(
    request: Request,
    varyBy?: string[]
  ): Promise<Response | null> {
    const url = new URL(request.url);
    const cacheKey = this.buildAPIKey(url, varyBy);
    
    const cached = await this.kvCache.get(cacheKey);
    if (!cached) return null;

    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Cache-Status': 'HIT',
    });

    return new Response(JSON.stringify(cached), {
      status: 200,
      headers,
    });
  }

  /**
   * Build cache key for API endpoints
   */
  private buildAPIKey(url: URL, varyBy?: string[]): string {
    let key = `api:${url.pathname}`;
    
    // Add query parameters
    const params = new URLSearchParams(url.search);
    if (params.size > 0) {
      key += `:${params.toString()}`;
    }
    
    // Add vary by headers
    if (varyBy && varyBy.length > 0) {
      key += `:${varyBy.join(':')}`;
    }
    
    return key;
  }

  /**
   * Get TTL based on API endpoint
   */
  private getAPITTL(pathname: string): number {
    const ttlMap: Record<string, number> = {
      '/api/menu': 3600, // 1 hour
      '/api/restaurant': 7200, // 2 hours
      '/api/orders': 300, // 5 minutes
      '/api/analytics': 1800, // 30 minutes
      '/api/user': 1800, // 30 minutes
    };

    for (const [pattern, ttl] of Object.entries(ttlMap)) {
      if (pathname.startsWith(pattern)) {
        return ttl;
      }
    }

    return 600; // 10 minutes default
  }
}

/**
 * Page Cache Manager
 * Handles caching for rendered pages
 */
export class PageCacheManager {
  private env: CloudflareEnv;

  constructor(env: CloudflareEnv) {
    this.env = env;
  }

  /**
   * Cache rendered page
   */
  async cachePage(
    request: Request,
    response: Response,
    options: {
      ttl?: number;
      varyBy?: string[];
      private?: boolean;
    } = {}
  ): Promise<Response> {
    if (options.private) {
      // Don't cache private pages
      return response;
    }

    const url = new URL(request.url);
    const ttl = options.ttl || this.getPageTTL(url.pathname);
    
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=60`);
    headers.set('X-Cache-Status', 'MISS');
    
    const cachedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    // Cache in Cloudflare edge
    const cache = caches.default;
    await cache.put(request, cachedResponse.clone());

    return cachedResponse;
  }

  /**
   * Get TTL for pages
   */
  private getPageTTL(pathname: string): number {
    const ttlMap: Record<string, number> = {
      '/': 3600, // Home page - 1 hour
      '/menu': 1800, // Menu pages - 30 minutes
      '/about': 86400, // Static pages - 1 day
      '/contact': 86400,
      '/privacy': 86400,
      '/terms': 86400,
    };

    for (const [pattern, ttl] of Object.entries(ttlMap)) {
      if (pathname === pattern || pathname.startsWith(pattern + '/')) {
        return ttl;
      }
    }

    return 600; // 10 minutes default
  }
}

/**
 * Cache utilities factory
 */
export function createCacheUtils(env: CloudflareEnv) {
  return {
    edge: new EdgeCacheManager(env),
    static: new StaticAssetCache(env),
    api: new APIResponseCache(env),
    page: new PageCacheManager(env),
  };
}

/**
 * Cache middleware for Next.js API routes
 */
export function withAPICache(
  handler: (req: Request, env: CloudflareEnv) => Promise<Response>,
  options: {
    ttl?: number;
    tags?: string[];
    varyBy?: string[];
  } = {}
) {
  return async (req: Request, env: CloudflareEnv): Promise<Response> => {
    const apiCache = new APIResponseCache(env);
    
    // Try to get from cache
    const cached = await apiCache.getCachedAPIResponse(req, options.varyBy);
    if (cached) return cached;
    
    // Execute handler
    const response = await handler(req, env);
    
    // Cache response if successful
    if (response.status === 200) {
      return await apiCache.cacheAPIResponse(req, response, options);
    }
    
    return response;
  };
}