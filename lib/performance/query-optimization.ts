/**
 * Database query optimization and caching layer
 * Implements intelligent query caching, connection pooling, and performance monitoring
 */

import { cacheManager, CacheStrategy } from './cache-manager';

export interface QueryConfig {
  cacheKey?: string;
  ttl?: number;
  strategy?: CacheStrategy;
  tags?: string[];
  skipCache?: boolean;
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface ConnectionConfig {
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableReadReplicas: boolean;
}

export interface QueryMetrics {
  query: string;
  duration: number;
  cacheHit: boolean;
  connectionPool: string;
  timestamp: number;
  errorCount: number;
}

export interface QueryPlan {
  sql: string;
  params: any[];
  estimatedCost: number;
  estimatedRows: number;
  indexes: string[];
  optimizations: string[];
}

class QueryOptimizer {
  private metrics: QueryMetrics[] = [];
  private preparedStatements = new Map<string, any>();
  private connectionPools = new Map<string, any>();
  private queryPlanCache = new Map<string, QueryPlan>();
  private slowQueryThreshold = 1000; // 1 second
  private maxMetricsHistory = 1000;

  constructor(private config: ConnectionConfig) {
    this.initializeConnectionPools();
  }

  /**
   * Initialize connection pools for read/write operations
   */
  private initializeConnectionPools(): void {
    // This would be implemented based on your database client
    // Example for Supabase/PostgreSQL connection pooling
    console.log('Initializing connection pools with config:', this.config);
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(sql: string, params: any[]): string {
    const normalizedSql = this.normalizeSql(sql);
    const paramsHash = this.hashParams(params);
    return `query:${this.hashString(normalizedSql)}:${paramsHash}`;
  }

  /**
   * Normalize SQL for consistent caching
   */
  private normalizeSql(sql: string): string {
    return sql
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Hash parameters for cache key
   */
  private hashParams(params: any[]): string {
    return this.hashString(JSON.stringify(params));
  }

  /**
   * Simple hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Execute optimized query with caching
   */
  async executeQuery<T>(
    sql: string,
    params: any[] = [],
    options: QueryConfig = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    const cacheKey = options.cacheKey || this.generateCacheKey(sql, params);
    
    // Try cache first if enabled
    if (!options.skipCache) {
      const cached = await cacheManager.get<T[]>(cacheKey);
      if (cached) {
        this.recordMetrics(sql, Date.now() - startTime, true, 'cache');
        return cached;
      }
    }

    try {
      // Execute query with optimizations
      const result = await this.executeWithOptimizations<T>(sql, params, options);
      
      // Cache result if successful
      if (!options.skipCache && result) {
        await cacheManager.set(cacheKey, result, {
          ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
          tags: options.tags
        });
      }

      const duration = Date.now() - startTime;
      this.recordMetrics(sql, duration, false, 'database');
      
      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow query detected (${duration}ms):`, sql);
        this.analyzeSlowQuery(sql, params, duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetrics(sql, duration, false, 'error');
      throw error;
    }
  }

  /**
   * Execute query with performance optimizations
   */
  private async executeWithOptimizations<T>(
    sql: string,
    params: any[],
    options: QueryConfig
  ): Promise<T[]> {
    // Use prepared statement if available
    const statementKey = this.hashString(sql);
    if (this.preparedStatements.has(statementKey)) {
      return this.executeWithPreparedStatement<T>(statementKey, params, options);
    }

    // Analyze query plan for optimization opportunities
    await this.analyzeQueryPlan(sql, params);

    // Route to appropriate connection pool
    const pool = this.selectConnectionPool(sql, options);
    
    // Execute with timeout and retries
    return this.executeWithRetries<T>(sql, params, options, pool);
  }

  /**
   * Execute query with prepared statement
   */
  private async executeWithPreparedStatement<T>(
    statementKey: string,
    params: any[],
    options: QueryConfig
  ): Promise<T[]> {
    // Implementation would depend on your database client
    // This is a simplified example
    console.log('Executing with prepared statement:', statementKey);
    
    // Return mock data for now
    return [] as T[];
  }

  /**
   * Select appropriate connection pool
   */
  private selectConnectionPool(sql: string, options: QueryConfig): string {
    const isReadQuery = this.isReadOnlyQuery(sql);
    
    if (isReadQuery && this.config.enableReadReplicas) {
      return 'read-replica';
    }
    
    return options.priority === 'high' ? 'priority' : 'default';
  }

  /**
   * Check if query is read-only
   */
  private isReadOnlyQuery(sql: string): boolean {
    const normalizedSql = sql.trim().toLowerCase();
    return normalizedSql.startsWith('select') ||
           normalizedSql.startsWith('with') ||
           normalizedSql.startsWith('show') ||
           normalizedSql.startsWith('explain');
  }

  /**
   * Execute query with retry logic
   */
  private async executeWithRetries<T>(
    sql: string,
    params: any[],
    options: QueryConfig,
    pool: string
  ): Promise<T[]> {
    const maxRetries = options.retries || this.config.retryAttempts;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRawQuery<T>(sql, params, pool, options.timeout);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on syntax errors or constraint violations
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute raw query against database
   */
  private async executeRawQuery<T>(
    sql: string,
    params: any[],
    pool: string,
    timeout?: number
  ): Promise<T[]> {
    // This would be implemented with your actual database client
    // Example for Supabase:
    /*
    const client = this.getPoolConnection(pool);
    const { data, error } = await client
      .rpc('execute_sql', { sql, params })
      .timeout(timeout || this.config.connectionTimeout);
    
    if (error) throw error;
    return data;
    */
    
    // Mock implementation
    return [] as T[];
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    const nonRetryableCodes = [
      'SYNTAX_ERROR',
      'CONSTRAINT_VIOLATION',
      'PERMISSION_DENIED',
      'INVALID_PARAMETER'
    ];
    
    return nonRetryableCodes.some(code => 
      error.code === code || error.message?.includes(code)
    );
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay || 100;
    return Math.min(baseDelay * Math.pow(2, attempt), 5000);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Analyze query plan for optimization opportunities
   */
  private async analyzeQueryPlan(sql: string, params: any[]): Promise<void> {
    const planKey = this.generateCacheKey(sql, []);
    
    if (this.queryPlanCache.has(planKey)) {
      return; // Plan already analyzed
    }

    try {
      // Get query execution plan
      const plan = await this.getQueryPlan(sql, params);
      this.queryPlanCache.set(planKey, plan);
      
      // Suggest optimizations
      const optimizations = this.suggestOptimizations(plan);
      if (optimizations.length > 0) {
        console.log(`Query optimization suggestions for: ${sql}`, optimizations);
      }
    } catch (error) {
      console.warn('Failed to analyze query plan:', error);
    }
  }

  /**
   * Get query execution plan
   */
  private async getQueryPlan(sql: string, params: any[]): Promise<QueryPlan> {
    // This would execute EXPLAIN on the query
    // Mock implementation
    return {
      sql,
      params,
      estimatedCost: Math.random() * 1000,
      estimatedRows: Math.floor(Math.random() * 10000),
      indexes: [],
      optimizations: []
    };
  }

  /**
   * Suggest query optimizations
   */
  private suggestOptimizations(plan: QueryPlan): string[] {
    const suggestions: string[] = [];
    
    if (plan.estimatedCost > 500) {
      suggestions.push('Consider adding indexes for high-cost operations');
    }
    
    if (plan.estimatedRows > 1000) {
      suggestions.push('Consider adding LIMIT clause for large result sets');
    }
    
    if (plan.sql.includes('select *')) {
      suggestions.push('Avoid SELECT * - specify only needed columns');
    }
    
    return suggestions;
  }

  /**
   * Analyze slow query for optimization
   */
  private async analyzeSlowQuery(sql: string, params: any[], duration: number): Promise<void> {
    const analysis = {
      sql: this.normalizeSql(sql),
      duration,
      timestamp: Date.now(),
      suggestions: this.suggestOptimizations({ 
        sql, 
        params, 
        estimatedCost: duration, 
        estimatedRows: 0, 
        indexes: [], 
        optimizations: [] 
      })
    };
    
    // Log to monitoring system
    console.log('Slow query analysis:', analysis);
    
    // Could send to external monitoring service
    // await this.sendToMonitoring('slow_query', analysis);
  }

  /**
   * Record query metrics
   */
  private recordMetrics(
    query: string,
    duration: number,
    cacheHit: boolean,
    connectionPool: string
  ): void {
    const metric: QueryMetrics = {
      query: this.normalizeSql(query),
      duration,
      cacheHit,
      connectionPool,
      timestamp: Date.now(),
      errorCount: 0
    };

    this.metrics.push(metric);

    // Keep metrics history bounded
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
  }

  /**
   * Batch execute multiple queries with optimization
   */
  async executeBatch<T>(
    queries: Array<{ sql: string; params: any[]; config?: QueryConfig }>,
    options: { 
      concurrent?: number;
      transaction?: boolean;
      stopOnError?: boolean;
    } = {}
  ): Promise<T[][]> {
    const concurrent = options.concurrent || 5;
    const results: T[][] = [];

    if (options.transaction) {
      return this.executeBatchTransaction<T>(queries);
    }

    // Execute in batches
    for (let i = 0; i < queries.length; i += concurrent) {
      const batch = queries.slice(i, i + concurrent);
      const batchPromises = batch.map(query => 
        this.executeQuery<T>(query.sql, query.params, query.config)
          .catch(error => {
            if (options.stopOnError) {
              throw error;
            }
            console.warn('Batch query failed:', error);
            return [] as T[];
          })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute batch queries in transaction
   */
  private async executeBatchTransaction<T>(
    queries: Array<{ sql: string; params: any[]; config?: QueryConfig }>
  ): Promise<T[][]> {
    // This would implement actual transaction logic
    // Mock implementation for now
    console.log('Executing batch transaction with', queries.length, 'queries');
    return [];
  }

  /**
   * Get query performance metrics
   */
  getMetrics(): {
    totalQueries: number;
    averageDuration: number;
    cacheHitRate: number;
    slowQueries: number;
    errorRate: number;
  } {
    const total = this.metrics.length;
    if (total === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        slowQueries: 0,
        errorRate: 0
      };
    }

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const slowQueries = this.metrics.filter(m => m.duration > this.slowQueryThreshold).length;
    const errors = this.metrics.reduce((sum, m) => sum + m.errorCount, 0);

    return {
      totalQueries: total,
      averageDuration: totalDuration / total,
      cacheHitRate: (cacheHits / total) * 100,
      slowQueries,
      errorRate: (errors / total) * 100
    };
  }

  /**
   * Invalidate cached queries by tags
   */
  async invalidateCache(tags: string[]): Promise<void> {
    await cacheManager.invalidateByTags(tags);
  }

  /**
   * Clear all query caches
   */
  async clearCache(): Promise<void> {
    await cacheManager.clear();
    this.queryPlanCache.clear();
  }

  /**
   * Get connection pool statistics
   */
  getConnectionStats(): Record<string, any> {
    // This would return actual connection pool statistics
    return {
      'default': { active: 5, idle: 3, waiting: 0 },
      'read-replica': { active: 2, idle: 8, waiting: 0 },
      'priority': { active: 1, idle: 4, waiting: 0 }
    };
  }

  /**
   * Optimize table for better performance
   */
  async optimizeTable(tableName: string): Promise<void> {
    // This would run database-specific optimization commands
    console.log(`Optimizing table: ${tableName}`);
    
    // Example PostgreSQL optimization
    const optimizationQueries = [
      `ANALYZE ${tableName}`,
      `VACUUM ANALYZE ${tableName}`,
      `REINDEX TABLE ${tableName}`
    ];

    for (const query of optimizationQueries) {
      try {
        await this.executeQuery(query, [], { skipCache: true });
      } catch (error) {
        console.warn(`Failed to execute optimization query: ${query}`, error);
      }
    }
  }
}

// Default connection configuration
const defaultConnectionConfig: ConnectionConfig = {
  maxConnections: 20,
  idleTimeout: 30000,
  connectionTimeout: 5000,
  retryAttempts: 3,
  retryDelay: 100,
  enableReadReplicas: true
};

// Export singleton instance
export const queryOptimizer = new QueryOptimizer(defaultConnectionConfig);

// Export utility functions
export const executeOptimizedQuery = <T>(
  sql: string, 
  params?: any[], 
  config?: QueryConfig
) => queryOptimizer.executeQuery<T>(sql, params, config);

export const executeBatchQueries = <T>(
  queries: Array<{ sql: string; params: any[]; config?: QueryConfig }>,
  options?: { concurrent?: number; transaction?: boolean; stopOnError?: boolean }
) => queryOptimizer.executeBatch<T>(queries, options);

// Export types and classes
export { QueryOptimizer };
export type { 
  QueryConfig, 
  ConnectionConfig, 
  QueryMetrics, 
  QueryPlan 
};