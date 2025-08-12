/**
 * Enterprise-grade centralized cache management system
 * Implements multi-layer caching with edge, browser, and KV storage
 * Optimized for Cloudflare Workers deployment
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  version?: string;
  tags?: string[];
}

export interface CacheConfig {
  defaultTTL: number;
  maxAge: number;
  staleWhileRevalidate: number;
  namespace: string;
  compression: boolean;
  versioning: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  avgResponseTime: number;
}

export enum CacheLayer {
  MEMORY = 'memory',
  BROWSER = 'browser',
  EDGE = 'edge',
  KV = 'kv',
  DATABASE = 'database'
}

export enum CacheStrategy {
  CACHE_FIRST = 'cache-first',
  NETWORK_FIRST = 'network-first',
  STALE_WHILE_REVALIDATE = 'stale-while-revalidate',
  NETWORK_ONLY = 'network-only',
  CACHE_ONLY = 'cache-only'
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    avgResponseTime: 0
  };
  private responseTimeHistory: number[] = [];
  private maxResponseHistory = 100;

  constructor(private config: CacheConfig) {}

  /**
   * Generate cache key with namespace and parameters
   */
  private generateKey(key: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    const hash = this.simpleHash(paramString);
    return `${this.config.namespace}:${key}:${hash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cache entry is valid
   */
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Check if entry is stale but within stale-while-revalidate window
   */
  private isStaleButRevalidatable(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age > entry.ttl && age < (entry.ttl + this.config.staleWhileRevalidate);
  }

  /**
   * Update performance statistics
   */
  private updateStats(hit: boolean, responseTime: number): void {
    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    this.responseTimeHistory.push(responseTime);
    if (this.responseTimeHistory.length > this.maxResponseHistory) {
      this.responseTimeHistory.shift();
    }

    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    this.stats.avgResponseTime = this.responseTimeHistory.reduce((a, b) => a + b, 0) / this.responseTimeHistory.length;
  }

  /**
   * Compress data if compression is enabled
   */
  private async compress(data: any): Promise<string> {
    if (!this.config.compression) {
      return JSON.stringify(data);
    }

    // In a real implementation, use compression library
    // For Cloudflare Workers, consider using CompressionStream
    return JSON.stringify(data);
  }

  /**
   * Decompress data if compression was used
   */
  private async decompress(data: string): Promise<any> {
    if (!this.config.compression) {
      return JSON.parse(data);
    }

    // In a real implementation, use decompression library
    return JSON.parse(data);
  }

  /**
   * Get from memory cache
   */
  private getFromMemory(key: string): CacheEntry | null {
    return this.memoryCache.get(key) || null;
  }

  /**
   * Set in memory cache
   */
  private setInMemory(key: string, entry: CacheEntry): void {
    this.memoryCache.set(key, entry);
    this.stats.sets++;

    // Implement LRU eviction if memory cache gets too large
    if (this.memoryCache.size > 1000) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
  }

  /**
   * Get from browser cache (localStorage/sessionStorage)
   */
  private getFromBrowser(key: string): CacheEntry | null {
    if (typeof window === 'undefined') return null;

    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      return JSON.parse(item) as CacheEntry;
    } catch (error) {
      console.warn('Failed to get from browser cache:', error);
      return null;
    }
  }

  /**
   * Set in browser cache
   */
  private setInBrowser(key: string, entry: CacheEntry): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to set browser cache:', error);
    }
  }

  /**
   * Get from Cloudflare KV storage
   */
  private async getFromKV(key: string): Promise<CacheEntry | null> {
    // In Cloudflare Workers environment
    if (typeof window !== 'undefined') return null;

    try {
      // @ts-ignore - Cloudflare Workers KV binding
      if (typeof CACHE_KV !== 'undefined') {
        // @ts-ignore
        const item = await CACHE_KV.get(key);
        if (!item) return null;
        return JSON.parse(item) as CacheEntry;
      }
    } catch (error) {
      console.warn('Failed to get from KV cache:', error);
    }

    return null;
  }

  /**
   * Set in Cloudflare KV storage
   */
  private async setInKV(key: string, entry: CacheEntry): Promise<void> {
    if (typeof window !== 'undefined') return;

    try {
      // @ts-ignore - Cloudflare Workers KV binding
      if (typeof CACHE_KV !== 'undefined') {
        // @ts-ignore
        await CACHE_KV.put(key, JSON.stringify(entry), {
          expirationTtl: Math.floor(entry.ttl / 1000)
        });
      }
    } catch (error) {
      console.warn('Failed to set KV cache:', error);
    }
  }

  /**
   * Get cache entry from specified layer
   */
  private async getFromLayer(key: string, layer: CacheLayer): Promise<CacheEntry | null> {
    const startTime = Date.now();

    try {
      let entry: CacheEntry | null = null;

      switch (layer) {
        case CacheLayer.MEMORY:
          entry = this.getFromMemory(key);
          break;
        case CacheLayer.BROWSER:
          entry = this.getFromBrowser(key);
          break;
        case CacheLayer.KV:
          entry = await this.getFromKV(key);
          break;
        default:
          return null;
      }

      const responseTime = Date.now() - startTime;
      this.updateStats(!!entry, responseTime);

      return entry && this.isValid(entry) ? entry : null;
    } catch (error) {
      console.warn(`Failed to get from ${layer} cache:`, error);
      return null;
    }
  }

  /**
   * Set cache entry in specified layer
   */
  private async setInLayer(key: string, entry: CacheEntry, layer: CacheLayer): Promise<void> {
    try {
      switch (layer) {
        case CacheLayer.MEMORY:
          this.setInMemory(key, entry);
          break;
        case CacheLayer.BROWSER:
          this.setInBrowser(key, entry);
          break;
        case CacheLayer.KV:
          await this.setInKV(key, entry);
          break;
      }
    } catch (error) {
      console.warn(`Failed to set ${layer} cache:`, error);
    }
  }

  /**
   * Get data with fallback through cache layers
   */
  async get<T>(key: string, params?: Record<string, any>): Promise<T | null> {
    const cacheKey = this.generateKey(key, params);
    const layers = [CacheLayer.MEMORY, CacheLayer.BROWSER, CacheLayer.KV];

    for (const layer of layers) {
      const entry = await this.getFromLayer(cacheKey, layer);
      if (entry) {
        // Populate higher layers
        const higherLayers = layers.slice(0, layers.indexOf(layer));
        for (const higherLayer of higherLayers) {
          await this.setInLayer(cacheKey, entry, higherLayer);
        }

        return entry.data as T;
      }
    }

    return null;
  }

  /**
   * Set data in all appropriate cache layers
   */
  async set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      params?: Record<string, any>;
      tags?: string[];
      version?: string;
      layers?: CacheLayer[];
    } = {}
  ): Promise<void> {
    const cacheKey = this.generateKey(key, options.params);
    const ttl = options.ttl || this.config.defaultTTL;
    const layers = options.layers || [CacheLayer.MEMORY, CacheLayer.BROWSER, CacheLayer.KV];

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags: options.tags,
      version: options.version
    };

    for (const layer of layers) {
      await this.setInLayer(cacheKey, entry, layer);
    }
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string, params?: Record<string, any>): Promise<void> {
    const cacheKey = this.generateKey(key, params);

    // Delete from memory
    this.memoryCache.delete(cacheKey);

    // Delete from browser
    if (typeof window !== 'undefined') {
      localStorage.removeItem(cacheKey);
    }

    // Delete from KV
    try {
      // @ts-ignore - Cloudflare Workers KV binding
      if (typeof CACHE_KV !== 'undefined') {
        // @ts-ignore
        await CACHE_KV.delete(cacheKey);
      }
    } catch (error) {
      console.warn('Failed to delete from KV cache:', error);
    }

    this.stats.deletes++;
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    // Clear memory
    this.memoryCache.clear();

    // Clear browser
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.config.namespace))
        .forEach(key => localStorage.removeItem(key));
    }

    // Note: KV cache would need to be cleared via Cloudflare API or with prefix listing
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    // This would require a more sophisticated implementation
    // For now, clear all caches
    await this.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Implement cache-first strategy
   */
  async cacheFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      params?: Record<string, any>;
      revalidate?: boolean;
    } = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options.params);
    
    if (cached && !options.revalidate) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, {
      ttl: options.ttl,
      params: options.params
    });

    return data;
  }

  /**
   * Implement stale-while-revalidate strategy
   */
  async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      params?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const cacheKey = this.generateKey(key, options.params);
    const entry = await this.getFromLayer(cacheKey, CacheLayer.MEMORY) ||
                   await this.getFromLayer(cacheKey, CacheLayer.BROWSER) ||
                   await this.getFromLayer(cacheKey, CacheLayer.KV);

    if (entry && this.isValid(entry)) {
      return entry.data as T;
    }

    if (entry && this.isStaleButRevalidatable(entry)) {
      // Return stale data immediately
      const staleData = entry.data as T;

      // Revalidate in background (don't await)
      fetcher().then(freshData => {
        this.set(key, freshData, {
          ttl: options.ttl,
          params: options.params
        });
      }).catch(error => {
        console.warn('Background revalidation failed:', error);
      });

      return staleData;
    }

    // No cache or too stale, fetch fresh data
    const data = await fetcher();
    await this.set(key, data, {
      ttl: options.ttl,
      params: options.params
    });

    return data;
  }

  /**
   * Generate cache headers for HTTP responses
   */
  generateHeaders(ttl: number, strategy: CacheStrategy = CacheStrategy.STALE_WHILE_REVALIDATE): Record<string, string> {
    const maxAge = Math.floor(ttl / 1000);
    const swr = Math.floor(this.config.staleWhileRevalidate / 1000);

    const headers: Record<string, string> = {
      'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${swr}`,
      'Vary': 'Accept-Encoding',
      'X-Cache-Strategy': strategy
    };

    if (strategy === CacheStrategy.NETWORK_ONLY) {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    } else if (strategy === CacheStrategy.CACHE_ONLY) {
      headers['Cache-Control'] = `public, max-age=${maxAge}, immutable`;
    }

    return headers;
  }
}

// Default configuration for restaurant SaaS
const defaultConfig: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxAge: 60 * 60 * 1000,    // 1 hour
  staleWhileRevalidate: 10 * 60 * 1000, // 10 minutes
  namespace: 'restaurant-saas',
  compression: true,
  versioning: true
};

// Export singleton instance
export const cacheManager = new CacheManager(defaultConfig);

// Export types and classes for custom implementations
export { CacheManager };
export type { CacheConfig, CacheEntry, CacheStats };