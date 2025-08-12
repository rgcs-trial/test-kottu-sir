/**
 * Cloudflare KV Storage Utilities
 * Provides type-safe access to KV namespaces for sessions, caching, and rate limiting
 */

import type { CloudflareEnv } from '../../env';

export interface KVNamespace {
  get(key: string, options?: KVNamespaceGetOptions<undefined>): Promise<string | null>;
  get(key: string, type: 'text'): Promise<string | null>;
  get(key: string, type: 'json'): Promise<any>;
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  get(key: string, type: 'stream'): Promise<ReadableStream | null>;
  put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: KVNamespacePutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult<any, string>>;
}

interface KVNamespaceGetOptions<Type> {
  type?: Type;
  cacheTtl?: number;
}

interface KVNamespacePutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: any;
}

interface KVNamespaceListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
}

interface KVNamespaceListResult<Metadata, Key> {
  keys: Array<{
    name: Key;
    expiration?: number;
    metadata?: Metadata;
  }>;
  list_complete: boolean;
  cursor?: string;
}

/**
 * Session Storage using Cloudflare KV
 */
export class SessionStorage {
  private kv: KVNamespace;
  private prefix = 'session:';
  private defaultTtl = 86400; // 24 hours

  constructor(env: CloudflareEnv) {
    this.kv = env.SESSION_KV;
  }

  /**
   * Store session data
   */
  async set(sessionId: string, data: any, ttl?: number): Promise<void> {
    const key = this.prefix + sessionId;
    const value = JSON.stringify({
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttl || this.defaultTtl) * 1000,
    });

    await this.kv.put(key, value, {
      expirationTtl: ttl || this.defaultTtl,
    });
  }

  /**
   * Get session data
   */
  async get<T = any>(sessionId: string): Promise<T | null> {
    const key = this.prefix + sessionId;
    const value = await this.kv.get(key, 'json');

    if (!value) return null;

    // Check if session has expired
    if (value.expiresAt && value.expiresAt < Date.now()) {
      await this.delete(sessionId);
      return null;
    }

    return value.data;
  }

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<void> {
    const key = this.prefix + sessionId;
    await this.kv.delete(key);
  }

  /**
   * Update session TTL
   */
  async touch(sessionId: string, ttl?: number): Promise<void> {
    const data = await this.get(sessionId);
    if (data) {
      await this.set(sessionId, data, ttl);
    }
  }

  /**
   * List all sessions (admin use)
   */
  async listSessions(): Promise<string[]> {
    const result = await this.kv.list({ prefix: this.prefix });
    return result.keys.map(key => key.name.replace(this.prefix, ''));
  }
}

/**
 * General Purpose Cache using Cloudflare KV
 */
export class KVCache {
  private kv: KVNamespace;
  private defaultTtl = 3600; // 1 hour

  constructor(env: CloudflareEnv) {
    this.kv = env.CACHE_KV;
  }

  /**
   * Cache a value with automatic serialization
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.kv.put(key, serialized, {
      expirationTtl: ttl || this.defaultTtl,
    });
  }

  /**
   * Get cached value with automatic deserialization
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.kv.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      // Return as string if not valid JSON
      return value as unknown as T;
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.kv.get(key);
    return value !== null;
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Increment a numeric value (atomic)
   */
  async increment(key: string, delta = 1, ttl?: number): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + delta;
    await this.set(key, newValue, ttl);
    return newValue;
  }

  /**
   * Cache with tags for bulk invalidation
   */
  async setWithTags(key: string, value: any, tags: string[], ttl?: number): Promise<void> {
    // Store the main value
    await this.set(key, value, ttl);

    // Store tag mappings
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = await this.get<string[]>(tagKey) || [];
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        await this.set(tagKey, taggedKeys, ttl);
      }
    }
  }

  /**
   * Invalidate all keys with specific tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = await this.get<string[]>(tagKey) || [];
      
      // Delete all tagged keys
      for (const key of taggedKeys) {
        await this.delete(key);
      }
      
      // Delete the tag key itself
      await this.delete(tagKey);
    }
  }
}

/**
 * Rate Limiting using Cloudflare KV
 */
export class RateLimiter {
  private kv: KVNamespace;
  private prefix = 'ratelimit:';

  constructor(env: CloudflareEnv) {
    this.kv = env.RATE_LIMIT_KV;
  }

  /**
   * Check if request should be rate limited
   */
  async isRateLimited(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ limited: boolean; count: number; resetTime: number }> {
    const key = this.prefix + identifier;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Get current rate limit data
    const data = await this.kv.get<{
      count: number;
      windowStart: number;
    }>(key);

    let count = 0;
    let resetTime = now + windowSeconds * 1000;

    if (data && data.windowStart > windowStart) {
      // Within the same window
      count = data.count + 1;
      resetTime = data.windowStart + windowSeconds * 1000;
    } else {
      // New window
      count = 1;
      resetTime = now + windowSeconds * 1000;
    }

    // Update the counter
    await this.kv.put(
      key,
      JSON.stringify({
        count,
        windowStart: data?.windowStart > windowStart ? data.windowStart : now,
      }),
      { expirationTtl: windowSeconds }
    );

    return {
      limited: count > limit,
      count,
      resetTime,
    };
  }

  /**
   * Get current rate limit status
   */
  async getStatus(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ count: number; remaining: number; resetTime: number }> {
    const key = this.prefix + identifier;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    const data = await this.kv.get<{
      count: number;
      windowStart: number;
    }>(key);

    if (!data || data.windowStart <= windowStart) {
      return {
        count: 0,
        remaining: limit,
        resetTime: now + windowSeconds * 1000,
      };
    }

    return {
      count: data.count,
      remaining: Math.max(0, limit - data.count),
      resetTime: data.windowStart + windowSeconds * 1000,
    };
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = this.prefix + identifier;
    await this.kv.delete(key);
  }
}

/**
 * Multi-tenant KV utilities
 */
export class TenantKVStorage {
  private cache: KVCache;
  private tenantId: string;

  constructor(env: CloudflareEnv, tenantId: string) {
    this.cache = new KVCache(env);
    this.tenantId = tenantId;
  }

  private getTenantKey(key: string): string {
    return `tenant:${this.tenantId}:${key}`;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    return this.cache.set(this.getTenantKey(key), value, ttl);
  }

  async get<T = any>(key: string): Promise<T | null> {
    return this.cache.get<T>(this.getTenantKey(key));
  }

  async delete(key: string): Promise<void> {
    return this.cache.delete(this.getTenantKey(key));
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    return this.cache.getOrSet(this.getTenantKey(key), fetcher, ttl);
  }

  /**
   * Invalidate all cache for this tenant
   */
  async invalidateAll(): Promise<void> {
    // List all keys for this tenant and delete them
    const prefix = `tenant:${this.tenantId}:`;
    const kv = this.cache['kv'] as KVNamespace;
    const result = await kv.list({ prefix });
    
    for (const key of result.keys) {
      await kv.delete(key.name);
    }
  }
}

/**
 * KV utilities factory
 */
export function createKVUtils(env: CloudflareEnv) {
  return {
    sessions: new SessionStorage(env),
    cache: new KVCache(env),
    rateLimiter: new RateLimiter(env),
    createTenantStorage: (tenantId: string) => new TenantKVStorage(env, tenantId),
  };
}