/**
 * Advanced data prefetching hook with intelligent caching and prioritization
 * Implements aggressive prefetching strategies for optimal performance
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cacheManager, CacheStrategy } from '@/lib/performance/cache-manager';

export interface PrefetchOptions {
  enabled?: boolean;
  priority?: 'low' | 'normal' | 'high';
  strategy?: 'immediate' | 'idle' | 'hover' | 'viewport' | 'manual';
  cache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  dependencies?: any[];
  retries?: number;
  timeout?: number;
  background?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  condition?: () => boolean;
}

export interface PrefetchState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isPrefetched: boolean;
  lastFetched: number | null;
  hitCount: number;
}

export interface PrefetchEntry<T> {
  data: T;
  timestamp: number;
  hitCount: number;
  priority: number;
}

class PrefetchManager {
  private cache = new Map<string, PrefetchEntry<any>>();
  private requests = new Map<string, Promise<any>>();
  private priorities = new Map<string, number>();
  private maxCacheSize = 100;
  private backgroundTasks = new Set<string>();

  /**
   * Execute prefetch request
   */
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: PrefetchOptions = {}
  ): Promise<T> {
    const {
      priority = 'normal',
      cache = true,
      cacheTTL = 5 * 60 * 1000, // 5 minutes
      retries = 2,
      timeout = 10000,
      background = false,
      onSuccess,
      onError,
      condition
    } = options;

    // Check condition before proceeding
    if (condition && !condition()) {
      throw new Error('Prefetch condition not met');
    }

    // Check cache first
    if (cache) {
      const cached = await this.getCached<T>(key);
      if (cached) {
        onSuccess?.(cached);
        return cached;
      }
    }

    // Check if request is already in progress
    if (this.requests.has(key)) {
      return this.requests.get(key)!;
    }

    // Set priority
    const priorityValue = this.getPriorityValue(priority);
    this.priorities.set(key, priorityValue);

    // Create request promise
    const requestPromise = this.executeWithRetries(
      fetcher,
      retries,
      timeout,
      background
    );

    this.requests.set(key, requestPromise);

    if (background) {
      this.backgroundTasks.add(key);
    }

    try {
      const data = await requestPromise;
      
      // Cache the result
      if (cache) {
        await this.setCached(key, data, cacheTTL);
      }

      onSuccess?.(data);
      return data;
    } catch (error) {
      onError?.(error as Error);
      throw error;
    } finally {
      this.requests.delete(key);
      this.backgroundTasks.delete(key);
    }
  }

  /**
   * Execute request with retries and timeout
   */
  private async executeWithRetries<T>(
    fetcher: () => Promise<T>,
    retries: number,
    timeout: number,
    background: boolean
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );

        const result = await Promise.race([
          fetcher(),
          timeoutPromise
        ]);

        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's a background task and fails
        if (background && attempt === 0) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Get cached data
   */
  private async getCached<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.cache.get(key);
    if (memoryEntry && this.isValidEntry(memoryEntry)) {
      memoryEntry.hitCount++;
      return memoryEntry.data;
    }

    // Check persistent cache
    try {
      const cached = await cacheManager.get<T>(key);
      if (cached) {
        // Update memory cache
        this.cache.set(key, {
          data: cached,
          timestamp: Date.now(),
          hitCount: 1,
          priority: this.priorities.get(key) || 1
        });
        return cached;
      }
    } catch (error) {
      console.warn('Failed to get cached data:', error);
    }

    return null;
  }

  /**
   * Set cached data
   */
  private async setCached<T>(key: string, data: T, ttl: number): Promise<void> {
    // Set in memory cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hitCount: 1,
      priority: this.priorities.get(key) || 1
    });

    // Evict if cache is too large
    this.evictIfNeeded();

    // Set in persistent cache
    try {
      await cacheManager.set(key, data, { ttl });
    } catch (error) {
      console.warn('Failed to set cached data:', error);
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isValidEntry(entry: PrefetchEntry<any>): boolean {
    const age = Date.now() - entry.timestamp;
    const maxAge = 10 * 60 * 1000; // 10 minutes for memory cache
    return age < maxAge;
  }

  /**
   * Get priority value
   */
  private getPriorityValue(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  /**
   * Evict least important entries
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // Sort by priority and hit count
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      const [, entryA] = a;
      const [, entryB] = b;
      
      // Lower priority and hit count = higher eviction priority
      const scoreA = entryA.priority * entryA.hitCount;
      const scoreB = entryB.priority * entryB.hitCount;
      
      return scoreA - scoreB;
    });

    // Remove 20% of entries
    const removeCount = Math.ceil(this.cache.size * 0.2);
    for (let i = 0; i < removeCount; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.cache.clear();
    this.requests.clear();
    this.priorities.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      activeRequests: this.requests.size,
      backgroundTasks: this.backgroundTasks.size,
      totalHits: Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hitCount, 0)
    };
  }
}

// Global prefetch manager
const prefetchManager = new PrefetchManager();

/**
 * Primary prefetch hook
 */
export const usePrefetch = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: PrefetchOptions = {}
): PrefetchState<T> & {
  prefetch: () => Promise<void>;
  invalidate: () => void;
} => {
  const [state, setState] = useState<PrefetchState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isFetching: false,
    isPrefetched: false,
    lastFetched: null,
    hitCount: 0
  });

  const {
    enabled = true,
    strategy = 'manual',
    dependencies = [],
    ...prefetchOptions
  } = options;

  const optionsRef = useRef(prefetchOptions);
  optionsRef.current = prefetchOptions;

  // Manual prefetch function
  const prefetch = useCallback(async () => {
    if (!enabled) return;

    setState(prev => ({ ...prev, isFetching: true, error: null }));

    try {
      const data = await prefetchManager.prefetch(key, fetcher, {
        ...optionsRef.current,
        onSuccess: (data) => {
          setState(prev => ({
            ...prev,
            data,
            isPrefetched: true,
            lastFetched: Date.now(),
            hitCount: prev.hitCount + 1,
            isFetching: false,
            error: null
          }));
          optionsRef.current.onSuccess?.(data);
        },
        onError: (error) => {
          setState(prev => ({
            ...prev,
            error,
            isFetching: false
          }));
          optionsRef.current.onError?.(error);
        }
      });

      setState(prev => ({
        ...prev,
        data,
        isPrefetched: true,
        lastFetched: Date.now(),
        hitCount: prev.hitCount + 1,
        isFetching: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isFetching: false
      }));
    }
  }, [key, fetcher, enabled]);

  // Invalidate function
  const invalidate = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isFetching: false,
      isPrefetched: false,
      lastFetched: null,
      hitCount: 0
    });
    cacheManager.delete(key);
  }, [key]);

  // Auto-prefetch based on strategy
  useEffect(() => {
    if (!enabled) return;

    switch (strategy) {
      case 'immediate':
        prefetch();
        break;

      case 'idle':
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => prefetch());
        } else {
          setTimeout(() => prefetch(), 100);
        }
        break;

      default:
        // Manual prefetch - do nothing
        break;
    }
  }, [enabled, strategy, prefetch, ...dependencies]);

  return {
    ...state,
    prefetch,
    invalidate
  };
};

/**
 * Prefetch on hover hook
 */
export const usePrefetchOnHover = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: PrefetchOptions = {}
) => {
  const { prefetch, ...state } = usePrefetch(key, fetcher, {
    ...options,
    strategy: 'manual'
  });

  const handleMouseEnter = useCallback(() => {
    if (!state.isPrefetched && !state.isFetching) {
      prefetch();
    }
  }, [prefetch, state.isPrefetched, state.isFetching]);

  return {
    ...state,
    prefetch,
    onMouseEnter: handleMouseEnter
  };
};

/**
 * Prefetch on viewport hook
 */
export const usePrefetchOnViewport = <T>(
  key: string,
  fetcher: () => Promise<T>,
  elementRef: React.RefObject<Element>,
  options: PrefetchOptions & {
    threshold?: number;
    rootMargin?: string;
  } = {}
) => {
  const { threshold = 0.1, rootMargin = '100px', ...prefetchOptions } = options;
  const { prefetch, ...state } = usePrefetch(key, fetcher, {
    ...prefetchOptions,
    strategy: 'manual'
  });

  // Use intersection observer
  useEffect(() => {
    if (!elementRef.current || state.isPrefetched) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !state.isFetching) {
            prefetch();
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [elementRef, prefetch, state.isPrefetched, state.isFetching, threshold, rootMargin]);

  return {
    ...state,
    prefetch
  };
};

/**
 * Batch prefetch hook
 */
export const useBatchPrefetch = <T>(
  requests: Array<{
    key: string;
    fetcher: () => Promise<T>;
    options?: PrefetchOptions;
  }>,
  options: {
    concurrent?: number;
    strategy?: 'immediate' | 'idle' | 'manual';
    enabled?: boolean;
  } = {}
) => {
  const { concurrent = 3, strategy = 'manual', enabled = true } = options;
  const [states, setStates] = useState<Record<string, PrefetchState<T>>>({});

  const prefetchAll = useCallback(async () => {
    if (!enabled) return;

    // Initialize states
    const initialStates: Record<string, PrefetchState<T>> = {};
    requests.forEach(({ key }) => {
      initialStates[key] = {
        data: null,
        error: null,
        isLoading: false,
        isFetching: true,
        isPrefetched: false,
        lastFetched: null,
        hitCount: 0
      };
    });
    setStates(initialStates);

    // Execute in batches
    for (let i = 0; i < requests.length; i += concurrent) {
      const batch = requests.slice(i, i + concurrent);
      
      await Promise.allSettled(
        batch.map(async ({ key, fetcher, options: reqOptions }) => {
          try {
            const data = await prefetchManager.prefetch(key, fetcher, reqOptions);
            
            setStates(prev => ({
              ...prev,
              [key]: {
                ...prev[key],
                data,
                isPrefetched: true,
                isFetching: false,
                lastFetched: Date.now(),
                hitCount: prev[key].hitCount + 1
              }
            }));
          } catch (error) {
            setStates(prev => ({
              ...prev,
              [key]: {
                ...prev[key],
                error: error as Error,
                isFetching: false
              }
            }));
          }
        })
      );
    }
  }, [requests, concurrent, enabled]);

  // Auto-prefetch based on strategy
  useEffect(() => {
    if (!enabled) return;

    switch (strategy) {
      case 'immediate':
        prefetchAll();
        break;

      case 'idle':
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => prefetchAll());
        } else {
          setTimeout(() => prefetchAll(), 100);
        }
        break;

      default:
        // Manual
        break;
    }
  }, [enabled, strategy, prefetchAll]);

  return {
    states,
    prefetchAll,
    isAllPrefetched: Object.values(states).every(state => state.isPrefetched),
    hasErrors: Object.values(states).some(state => state.error),
    progress: {
      total: requests.length,
      completed: Object.values(states).filter(state => state.isPrefetched).length,
      failed: Object.values(states).filter(state => state.error).length
    }
  };
};

/**
 * Smart prefetch hook that learns from user behavior
 */
export const useSmartPrefetch = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: PrefetchOptions & {
    learnFromInteractions?: boolean;
    minConfidence?: number;
  } = {}
) => {
  const { learnFromInteractions = true, minConfidence = 0.7, ...prefetchOptions } = options;
  const interactionHistory = useRef<number[]>([]);
  
  const { prefetch, ...state } = usePrefetch(key, fetcher, {
    ...prefetchOptions,
    strategy: 'manual'
  });

  // Learn from interactions
  const recordInteraction = useCallback(() => {
    if (!learnFromInteractions) return;

    const now = Date.now();
    interactionHistory.current.push(now);

    // Keep only recent interactions (last hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    interactionHistory.current = interactionHistory.current.filter(time => time > oneHourAgo);
  }, [learnFromInteractions]);

  // Predict if prefetch is needed
  const shouldPrefetch = useCallback(() => {
    if (!learnFromInteractions || interactionHistory.current.length < 3) {
      return false;
    }

    // Simple prediction based on interaction frequency
    const recentInteractions = interactionHistory.current.filter(
      time => time > Date.now() - 10 * 60 * 1000 // Last 10 minutes
    );

    const confidence = recentInteractions.length / 10; // Max 10 interactions in 10 minutes
    return confidence >= minConfidence;
  }, [learnFromInteractions, minConfidence]);

  // Auto-prefetch if prediction confidence is high
  useEffect(() => {
    if (shouldPrefetch() && !state.isPrefetched && !state.isFetching) {
      prefetch();
    }
  }, [shouldPrefetch, prefetch, state.isPrefetched, state.isFetching]);

  return {
    ...state,
    prefetch,
    recordInteraction,
    confidence: learnFromInteractions ? Math.min(interactionHistory.current.length / 10, 1) : 0
  };
};

// Export prefetch manager for external use
export { prefetchManager };
export default usePrefetch;