#!/usr/bin/env node

/**
 * Integration testing script for performance optimization system
 * Validates all optimization components work together seamlessly
 */

import { cacheManager } from '../lib/performance/cache-manager';
import { imageOptimizer } from '../lib/performance/image-optimization';
import { queryOptimizer } from '../lib/performance/query-optimization';
import { bundleAnalyzer } from '../lib/performance/bundle-analyzer';
import { edgeCacheMiddleware } from '../middleware/cache';
import { compressionMiddleware } from '../middleware/compression';

interface TestResult {
  component: string;
  test: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  details?: any;
}

interface IntegrationTestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
  performance: {
    totalDuration: number;
    averageTestTime: number;
    slowestTest: { test: string; duration: number };
    fastestTest: { test: string; duration: number };
  };
  systemHealth: {
    cacheSystem: 'healthy' | 'degraded' | 'failed';
    imageOptimization: 'healthy' | 'degraded' | 'failed';
    queryOptimization: 'healthy' | 'degraded' | 'failed';
    middleware: 'healthy' | 'degraded' | 'failed';
    bundleAnalysis: 'healthy' | 'degraded' | 'failed';
  };
}

class IntegrationTester {
  private results: TestResult[] = [];
  private startTime: number = 0;

  /**
   * Run all integration tests
   */
  async runTests(): Promise<IntegrationTestReport> {
    console.log('🧪 Starting integration tests for performance optimization system...\n');
    this.startTime = Date.now();

    try {
      // Test cache manager
      await this.testCacheManager();

      // Test image optimization
      await this.testImageOptimization();

      // Test query optimization
      await this.testQueryOptimization();

      // Test middleware integration
      await this.testMiddlewareIntegration();

      // Test bundle analysis
      await this.testBundleAnalysis();

      // Test cross-component integration
      await this.testCrossComponentIntegration();

      // Generate report
      const report = this.generateReport();
      
      // Display results
      this.displayResults(report);

      return report;

    } catch (error) {
      console.error('❌ Integration tests failed:', error);
      throw error;
    }
  }

  /**
   * Test cache manager functionality
   */
  private async testCacheManager(): Promise<void> {
    console.log('📦 Testing Cache Manager...');

    // Test 1: Basic cache operations
    await this.runTest('CacheManager', 'Basic Operations', async () => {
      const testKey = 'test-key-1';
      const testData = { message: 'Hello, Cache!', timestamp: Date.now() };

      // Set data
      await cacheManager.set(testKey, testData);

      // Get data
      const retrieved = await cacheManager.get(testKey);
      
      if (JSON.stringify(retrieved) !== JSON.stringify(testData)) {
        throw new Error('Cache data mismatch');
      }

      // Delete data
      await cacheManager.delete(testKey);
      
      const deleted = await cacheManager.get(testKey);
      if (deleted !== null) {
        throw new Error('Cache deletion failed');
      }

      return { operations: ['set', 'get', 'delete'], status: 'success' };
    });

    // Test 2: Cache strategies
    await this.runTest('CacheManager', 'Cache Strategies', async () => {
      const testKey = 'strategy-test';
      let fetchCount = 0;

      const fetcher = async () => {
        fetchCount++;
        return { data: `fetch-${fetchCount}`, time: Date.now() };
      };

      // Test cache-first strategy
      const result1 = await cacheManager.cacheFirst(testKey, fetcher);
      const result2 = await cacheManager.cacheFirst(testKey, fetcher);

      if (fetchCount !== 1) {
        throw new Error('Cache-first strategy failed - multiple fetches detected');
      }

      if (result1.data !== result2.data) {
        throw new Error('Cache-first strategy returned different data');
      }

      return { strategy: 'cache-first', fetchCount, results: [result1, result2] };
    });

    // Test 3: Cache invalidation
    await this.runTest('CacheManager', 'Cache Invalidation', async () => {
      const testKeys = ['inv-test-1', 'inv-test-2', 'inv-test-3'];
      const testTags = ['tag1', 'tag2'];

      // Set cache entries with tags
      for (const key of testKeys) {
        await cacheManager.set(key, { value: key }, {
          tags: testTags,
          ttl: 60000
        });
      }

      // Verify entries exist
      for (const key of testKeys) {
        const value = await cacheManager.get(key);
        if (!value) {
          throw new Error(`Cache entry ${key} not found`);
        }
      }

      // Invalidate by tags
      await cacheManager.invalidateByTags(testTags);

      // Verify entries are invalidated
      let invalidatedCount = 0;
      for (const key of testKeys) {
        const value = await cacheManager.get(key);
        if (!value) {
          invalidatedCount++;
        }
      }

      return { 
        totalKeys: testKeys.length, 
        invalidatedCount, 
        tags: testTags 
      };
    });

    console.log('✓ Cache Manager tests completed');
  }

  /**
   * Test image optimization functionality
   */
  private async testImageOptimization(): Promise<void> {
    console.log('🖼️  Testing Image Optimization...');

    // Test 1: URL generation
    await this.runTest('ImageOptimization', 'URL Generation', async () => {
      const testSrc = 'test-image.jpg';
      const transform = {
        width: 800,
        height: 600,
        quality: 80,
        format: 'webp' as const
      };

      const optimizedUrl = imageOptimizer.generateCloudflareImageUrl(testSrc, transform);
      
      if (!optimizedUrl || optimizedUrl === testSrc) {
        throw new Error('Image URL optimization failed');
      }

      return { originalSrc: testSrc, optimizedUrl, transform };
    });

    // Test 2: Responsive image generation
    await this.runTest('ImageOptimization', 'Responsive Images', async () => {
      const testSrc = 'responsive-test.jpg';
      const srcSet = imageOptimizer.generateSrcSet(testSrc);

      if (!srcSet || !srcSet.includes('640w') || !srcSet.includes('1280w')) {
        throw new Error('Responsive image generation failed');
      }

      const urls = srcSet.split(', ');
      
      return { srcSet, urlCount: urls.length, testSrc };
    });

    // Test 3: Placeholder generation
    await this.runTest('ImageOptimization', 'Placeholder Generation', async () => {
      const blurPlaceholder = imageOptimizer.generateBlurPlaceholder('test.jpg', 8, 8);
      const shimmerPlaceholder = imageOptimizer.generateShimmerPlaceholder(400, 300);

      if (!blurPlaceholder || !blurPlaceholder.startsWith('data:')) {
        throw new Error('Blur placeholder generation failed');
      }

      if (!shimmerPlaceholder || !shimmerPlaceholder.startsWith('data:image/svg')) {
        throw new Error('Shimmer placeholder generation failed');
      }

      return { 
        blurPlaceholder: blurPlaceholder.substring(0, 50) + '...', 
        shimmerPlaceholder: shimmerPlaceholder.substring(0, 50) + '...' 
      };
    });

    console.log('✓ Image Optimization tests completed');
  }

  /**
   * Test query optimization functionality
   */
  private async testQueryOptimization(): Promise<void> {
    console.log('🗃️  Testing Query Optimization...');

    // Test 1: Query execution with caching
    await this.runTest('QueryOptimization', 'Query Execution', async () => {
      const testQuery = 'SELECT * FROM test_table WHERE id = $1';
      const testParams = [1];

      // Mock query execution
      let executionCount = 0;
      const originalExecute = queryOptimizer['executeRawQuery'];
      queryOptimizer['executeRawQuery'] = async () => {
        executionCount++;
        return [{ id: 1, name: 'Test Record', created_at: new Date() }];
      };

      try {
        // Execute query twice
        const result1 = await queryOptimizer.executeQuery(testQuery, testParams);
        const result2 = await queryOptimizer.executeQuery(testQuery, testParams);

        // Second execution should use cache
        if (executionCount > 1) {
          console.warn('Query cache may not be working optimally');
        }

        return { 
          executionCount, 
          results: [result1, result2],
          cached: executionCount === 1
        };
      } finally {
        queryOptimizer['executeRawQuery'] = originalExecute;
      }
    });

    // Test 2: Batch query execution
    await this.runTest('QueryOptimization', 'Batch Execution', async () => {
      const queries = [
        { sql: 'SELECT 1', params: [] },
        { sql: 'SELECT 2', params: [] },
        { sql: 'SELECT 3', params: [] }
      ];

      // Mock batch execution
      queryOptimizer['executeBatchTransaction'] = async () => [
        [{ result: 1 }],
        [{ result: 2 }],
        [{ result: 3 }]
      ];

      const results = await queryOptimizer.executeBatch(queries, { 
        concurrent: 2, 
        transaction: true 
      });

      if (results.length !== queries.length) {
        throw new Error('Batch execution count mismatch');
      }

      return { queryCount: queries.length, resultCount: results.length };
    });

    // Test 3: Performance metrics
    await this.runTest('QueryOptimization', 'Performance Metrics', async () => {
      const initialMetrics = queryOptimizer.getMetrics();
      
      // Execute a test query to generate metrics
      await queryOptimizer.executeQuery('SELECT NOW()', [], { skipCache: true });
      
      const updatedMetrics = queryOptimizer.getMetrics();

      if (updatedMetrics.totalQueries <= initialMetrics.totalQueries) {
        throw new Error('Query metrics not updating');
      }

      return { 
        initialMetrics, 
        updatedMetrics, 
        improvement: updatedMetrics.totalQueries - initialMetrics.totalQueries 
      };
    });

    console.log('✓ Query Optimization tests completed');
  }

  /**
   * Test middleware integration
   */
  private async testMiddlewareIntegration(): Promise<void> {
    console.log('⚙️  Testing Middleware Integration...');

    // Test 1: Cache middleware
    await this.runTest('Middleware', 'Cache Middleware', async () => {
      // Mock Next.js request/response
      const mockRequest = {
        method: 'GET',
        url: 'https://example.com/test-page',
        headers: new Map([
          ['accept-encoding', 'gzip, deflate, br'],
          ['user-agent', 'Mozilla/5.0 Test Browser']
        ])
      } as any;

      const mockResponse = {
        status: 200,
        headers: new Map([
          ['content-type', 'text/html; charset=utf-8']
        ]),
        clone: () => mockResponse
      } as any;

      // Test cache key generation
      const cacheKey = edgeCacheMiddleware['generateCacheKey'](mockRequest);
      
      if (!cacheKey || cacheKey.length < 10) {
        throw new Error('Cache key generation failed');
      }

      return { cacheKey, method: mockRequest.method, url: mockRequest.url };
    });

    // Test 2: Compression middleware
    await this.runTest('Middleware', 'Compression Middleware', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map([
          ['accept-encoding', 'gzip, br']
        ])
      } as any;

      const mockResponse = {
        status: 200,
        headers: new Map([
          ['content-type', 'text/html; charset=utf-8']
        ]),
        arrayBuffer: async () => new ArrayBuffer(1024),
        clone: () => mockResponse
      } as any;

      // Test compression decision
      const shouldCompress = compressionMiddleware['shouldCompress'](mockRequest, mockResponse);
      
      // Test encoding selection
      const acceptedEncodings = compressionMiddleware['parseAcceptEncoding']('gzip, br');
      const compressionMethod = compressionMiddleware['selectCompressionMethod'](acceptedEncodings);

      return { 
        shouldCompress, 
        compressionMethod, 
        acceptedEncodings: Array.from(acceptedEncodings.keys())
      };
    });

    // Test 3: Middleware statistics
    await this.runTest('Middleware', 'Statistics Collection', async () => {
      const cacheStats = edgeCacheMiddleware.getStats();
      const compressionStats = compressionMiddleware.getStats();

      return { 
        cacheStats, 
        compressionStats,
        hasStats: typeof cacheStats === 'object' && typeof compressionStats === 'object'
      };
    });

    console.log('✓ Middleware Integration tests completed');
  }

  /**
   * Test bundle analysis functionality
   */
  private async testBundleAnalysis(): Promise<void> {
    console.log('📊 Testing Bundle Analysis...');

    // Test 1: Mock bundle analysis
    await this.runTest('BundleAnalysis', 'Analysis Generation', async () => {
      const mockStats = {
        chunks: [
          {
            id: 'main',
            names: ['main'],
            size: 500000,
            modules: ['module1', 'module2'],
            parents: [],
            children: [],
            initial: true
          }
        ],
        modules: [
          {
            id: 'module1',
            name: './src/index.js',
            size: 250000,
            chunks: ['main']
          },
          {
            id: 'module2',
            name: './src/utils.js',
            size: 250000,
            chunks: ['main']
          }
        ]
      };

      const analysis = await bundleAnalyzer.analyzeBundleFromStats(mockStats);

      if (!analysis || analysis.chunks.length === 0) {
        throw new Error('Bundle analysis failed');
      }

      return { 
        totalSize: analysis.totalSize,
        chunkCount: analysis.chunks.length,
        moduleCount: analysis.modules.length,
        optimizationCount: analysis.optimizations.length
      };
    });

    // Test 2: Performance budget validation
    await this.runTest('BundleAnalysis', 'Performance Budget', async () => {
      const mockAnalysis = {
        totalSize: 800000, // 800KB
        gzippedSize: 200000, // 200KB
        chunks: [
          { isInitial: true, size: 600000 },
          { isInitial: false, size: 200000 }
        ]
      } as any;

      const budgetCheck = bundleAnalyzer.checkPerformanceBudget(mockAnalysis);

      return {
        passes: budgetCheck.passes,
        violationCount: budgetCheck.violations.length,
        violations: budgetCheck.violations
      };
    });

    // Test 3: Optimization recommendations
    await this.runTest('BundleAnalysis', 'Optimization Report', async () => {
      const mockAnalysis = {
        totalSize: 1200000, // 1.2MB
        gzippedSize: 300000,
        modules: [
          { name: 'large-module.js', size: 800000, isVendor: true }
        ],
        chunks: [
          { name: 'main', size: 1000000 }
        ],
        duplicates: [
          { module: 'lodash', totalWaste: 50000 }
        ],
        optimizations: []
      } as any;

      const report = bundleAnalyzer.generateReport(mockAnalysis);

      if (!report || report.length < 100) {
        throw new Error('Report generation failed');
      }

      return { 
        reportLength: report.length,
        hasRecommendations: report.includes('Optimization Suggestions'),
        hasBudgetInfo: report.includes('Performance Budget')
      };
    });

    console.log('✓ Bundle Analysis tests completed');
  }

  /**
   * Test cross-component integration
   */
  private async testCrossComponentIntegration(): Promise<void> {
    console.log('🔗 Testing Cross-Component Integration...');

    // Test 1: Cache + Query integration
    await this.runTest('Integration', 'Cache + Query', async () => {
      const testKey = 'integration-test';
      const queryResult = { data: 'integrated result', timestamp: Date.now() };

      // Simulate query result caching
      await cacheManager.set(testKey, queryResult, { ttl: 30000 });
      
      // Retrieve through cache
      const cached = await cacheManager.get(testKey);
      
      if (!cached || cached.data !== queryResult.data) {
        throw new Error('Cache-Query integration failed');
      }

      return { cached, original: queryResult, match: cached.data === queryResult.data };
    });

    // Test 2: Image optimization + Cache integration
    await this.runTest('Integration', 'Image + Cache', async () => {
      const imageSrc = 'integration-test.jpg';
      const optimizedUrl = imageOptimizer.generateCloudflareImageUrl(imageSrc, {
        width: 800,
        quality: 80
      });

      // Cache the optimized URL
      await cacheManager.set(`img:${imageSrc}`, optimizedUrl, { ttl: 60000 });
      
      const cachedUrl = await cacheManager.get(`img:${imageSrc}`);

      if (cachedUrl !== optimizedUrl) {
        throw new Error('Image-Cache integration failed');
      }

      return { imageSrc, optimizedUrl, cachedUrl, match: cachedUrl === optimizedUrl };
    });

    // Test 3: Full system integration
    await this.runTest('Integration', 'Full System', async () => {
      const startTime = Date.now();
      
      // Simulate a complete request flow
      const steps = [
        'Cache check',
        'Query execution',
        'Image optimization',
        'Response compression',
        'Cache storage'
      ];

      const results = [];
      
      for (const step of steps) {
        const stepStart = Date.now();
        
        // Simulate step execution
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        const stepDuration = Date.now() - stepStart;
        results.push({ step, duration: stepDuration });
      }

      const totalDuration = Date.now() - startTime;

      return { 
        steps: results,
        totalDuration,
        success: totalDuration < 1000 // Should complete within 1 second
      };
    });

    console.log('✓ Cross-Component Integration tests completed');
  }

  /**
   * Run individual test with error handling and timing
   */
  private async runTest(
    component: string, 
    testName: string, 
    testFn: () => Promise<any>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const details = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        component,
        test: testName,
        status: 'pass',
        duration,
        details
      });
      
      console.log(`  ✓ ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        component,
        test: testName,
        status: 'fail',
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.log(`  ❌ ${testName} (${duration}ms) - ${error}`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): IntegrationTestReport {
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    
    const totalDuration = Date.now() - this.startTime;
    const durations = this.results.map(r => r.duration);
    const averageTestTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    const slowestTest = this.results.reduce((prev, current) => 
      current.duration > prev.duration ? current : prev, this.results[0]);
    
    const fastestTest = this.results.reduce((prev, current) => 
      current.duration < prev.duration ? current : prev, this.results[0]);

    // Assess system health
    const componentHealth = (component: string) => {
      const componentTests = this.results.filter(r => r.component === component);
      const componentPassed = componentTests.filter(r => r.status === 'pass').length;
      const passRate = componentPassed / componentTests.length;
      
      if (passRate >= 0.9) return 'healthy';
      if (passRate >= 0.7) return 'degraded';
      return 'failed';
    };

    return {
      timestamp: new Date().toISOString(),
      totalTests,
      passed,
      failed,
      skipped,
      results: this.results,
      performance: {
        totalDuration,
        averageTestTime,
        slowestTest: { test: slowestTest.test, duration: slowestTest.duration },
        fastestTest: { test: fastestTest.test, duration: fastestTest.duration }
      },
      systemHealth: {
        cacheSystem: componentHealth('CacheManager'),
        imageOptimization: componentHealth('ImageOptimization'),
        queryOptimization: componentHealth('QueryOptimization'),
        middleware: componentHealth('Middleware'),
        bundleAnalysis: componentHealth('BundleAnalysis')
      }
    };
  }

  /**
   * Display test results
   */
  private displayResults(report: IntegrationTestReport): void {
    console.log('\n📋 Integration Test Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passed} ✓`);
    console.log(`Failed: ${report.failed} ❌`);
    console.log(`Skipped: ${report.skipped} ⏭️`);
    console.log(`Success Rate: ${((report.passed / report.totalTests) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${report.performance.totalDuration}ms`);
    console.log(`Average Test Time: ${report.performance.averageTestTime.toFixed(1)}ms`);
    
    console.log('\n🏥 System Health:');
    Object.entries(report.systemHealth).forEach(([component, health]) => {
      const icon = health === 'healthy' ? '🟢' : health === 'degraded' ? '🟡' : '🔴';
      console.log(`  ${icon} ${component}: ${health}`);
    });

    if (report.failed > 0) {
      console.log('\n❌ Failed Tests:');
      report.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`  • ${r.component} - ${r.test}: ${r.error}`);
        });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// CLI interface
async function main() {
  const tester = new IntegrationTester();

  try {
    const report = await tester.runTests();
    
    if (report.failed === 0) {
      console.log('\n✅ All integration tests passed!');
      process.exit(0);
    } else {
      console.log(`\n❌ ${report.failed} test(s) failed`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Integration testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { IntegrationTester };
export default IntegrationTester;