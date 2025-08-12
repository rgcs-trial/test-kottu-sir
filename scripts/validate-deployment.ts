#!/usr/bin/env tsx
/**
 * Deployment Validation Script for Restaurant SaaS
 * Comprehensive validation of deployment health and functionality
 */

import { execSync } from 'child_process';

interface ValidationConfig {
  environment: 'development' | 'staging' | 'production';
  timeout?: number;
  retries?: number;
  verbose?: boolean;
}

interface ValidationResult {
  success: boolean;
  score: number;
  duration: number;
  tests: Array<{
    name: string;
    status: 'passed' | 'failed' | 'warning';
    duration: number;
    message?: string;
    details?: any;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

class DeploymentValidator {
  private config: ValidationConfig;
  private baseUrl: string;
  private startTime: number = 0;
  private tests: Array<{ name: string; status: 'passed' | 'failed' | 'warning'; duration: number; message?: string; details?: any }> = [];

  constructor(config: ValidationConfig) {
    this.config = config;
    this.baseUrl = this.getBaseUrl();
  }

  /**
   * Run complete validation suite
   */
  async validate(): Promise<ValidationResult> {
    this.startTime = Date.now();
    this.log('🔍 Starting deployment validation...', 'info');
    this.log(`Environment: ${this.config.environment}`, 'info');
    this.log(`Base URL: ${this.baseUrl}`, 'info');

    // Core infrastructure tests
    await this.runTest('Worker availability', () => this.testWorkerAvailability());
    await this.runTest('Health endpoint', () => this.testHealthEndpoint());
    await this.runTest('Static assets', () => this.testStaticAssets());
    
    // Cloudflare service tests
    await this.runTest('KV storage', () => this.testKVStorage());
    await this.runTest('R2 buckets', () => this.testR2Buckets());
    await this.runTest('Durable Objects', () => this.testDurableObjects());
    await this.runTest('Queue bindings', () => this.testQueueBindings());
    
    // Application functionality tests
    await this.runTest('Database connectivity', () => this.testDatabaseConnectivity());
    await this.runTest('Authentication system', () => this.testAuthentication());
    await this.runTest('API endpoints', () => this.testAPIEndpoints());
    await this.runTest('File uploads', () => this.testFileUploads());
    
    // External service tests
    await this.runTest('Stripe integration', () => this.testStripeIntegration());
    await this.runTest('Supabase connectivity', () => this.testSupabaseConnectivity());
    
    // Performance tests
    await this.runTest('Response times', () => this.testResponseTimes());
    await this.runTest('Cache headers', () => this.testCacheHeaders());
    
    // Security tests
    await this.runTest('Security headers', () => this.testSecurityHeaders());
    await this.runTest('SSL/TLS configuration', () => this.testSSLConfiguration());
    await this.runTest('Rate limiting', () => this.testRateLimiting());

    const duration = Date.now() - this.startTime;
    const summary = this.calculateSummary();
    const score = this.calculateScore(summary);

    this.log(`\n📊 Validation completed in ${duration}ms`, 'info');
    this.log(`Score: ${score}% (${summary.passed}/${summary.total} tests passed)`, 
             score >= 90 ? 'success' : score >= 70 ? 'warning' : 'error');

    return {
      success: score >= 70,
      score,
      duration,
      tests: this.tests,
      summary,
    };
  }

  /**
   * Test Worker availability
   */
  private async testWorkerAvailability(): Promise<void> {
    const response = await this.makeRequest('/');
    if (response.status !== 200) {
      throw new Error(`Worker not responding. Status: ${response.status}`);
    }
  }

  /**
   * Test health endpoint
   */
  private async testHealthEndpoint(): Promise<void> {
    const response = await this.makeRequest('/api/health');
    if (response.status !== 200) {
      throw new Error(`Health endpoint failed. Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'healthy') {
      throw new Error(`Health check failed: ${data.message || 'Unknown error'}`);
    }
  }

  /**
   * Test static assets
   */
  private async testStaticAssets(): Promise<void> {
    const assets = ['/favicon.ico', '/_next/static/css/globals.css'];
    
    for (const asset of assets) {
      try {
        const response = await this.makeRequest(asset);
        if (response.status === 404) {
          // Some assets might not exist, that's okay
          continue;
        }
        if (!response.ok) {
          throw new Error(`Asset ${asset} failed with status ${response.status}`);
        }
      } catch (error) {
        // Log warning but don't fail the test
        this.log(`⚠️  Asset ${asset} not available: ${error}`, 'warning');
      }
    }
  }

  /**
   * Test KV storage
   */
  private async testKVStorage(): Promise<void> {
    const response = await this.makeRequest('/api/test/kv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'validation' }),
    });

    if (!response.ok) {
      throw new Error(`KV storage test failed. Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(`KV storage test failed: ${data.error}`);
    }
  }

  /**
   * Test R2 buckets
   */
  private async testR2Buckets(): Promise<void> {
    const response = await this.makeRequest('/api/test/r2');
    
    if (!response.ok) {
      throw new Error(`R2 bucket test failed. Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(`R2 bucket test failed: ${data.error}`);
    }
  }

  /**
   * Test Durable Objects
   */
  private async testDurableObjects(): Promise<void> {
    const response = await this.makeRequest('/api/test/durable-objects');
    
    if (!response.ok) {
      throw new Error(`Durable Objects test failed. Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(`Durable Objects test failed: ${data.error}`);
    }
  }

  /**
   * Test queue bindings
   */
  private async testQueueBindings(): Promise<void> {
    const response = await this.makeRequest('/api/test/queues');
    
    if (!response.ok) {
      throw new Error(`Queue bindings test failed. Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(`Queue bindings test failed: ${data.error}`);
    }
  }

  /**
   * Test database connectivity
   */
  private async testDatabaseConnectivity(): Promise<void> {
    const response = await this.makeRequest('/api/test/database');
    
    if (!response.ok) {
      throw new Error(`Database connectivity test failed. Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.connected) {
      throw new Error(`Database not connected: ${data.error}`);
    }
  }

  /**
   * Test authentication system
   */
  private async testAuthentication(): Promise<void> {
    // Test public access to auth endpoints
    const loginResponse = await this.makeRequest('/api/auth/status');
    
    if (!loginResponse.ok && loginResponse.status !== 401) {
      throw new Error(`Auth system test failed. Status: ${loginResponse.status}`);
    }
    
    // 401 is expected for unauthenticated requests
    if (loginResponse.status === 401) {
      return; // Authentication is working (rejecting unauthenticated requests)
    }
  }

  /**
   * Test API endpoints
   */
  private async testAPIEndpoints(): Promise<void> {
    const endpoints = [
      '/api/restaurants',
      '/api/menu',
      '/api/orders',
    ];

    for (const endpoint of endpoints) {
      const response = await this.makeRequest(endpoint);
      
      // Most endpoints should return 401 (unauthorized) or 200
      if (response.status !== 200 && response.status !== 401) {
        throw new Error(`API endpoint ${endpoint} failed. Status: ${response.status}`);
      }
    }
  }

  /**
   * Test file uploads
   */
  private async testFileUploads(): Promise<void> {
    // Create a small test file
    const testFile = new Blob(['test file content'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', testFile, 'test.txt');

    const response = await this.makeRequest('/api/test/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`File upload test failed. Status: ${response.status}`);
    }
  }

  /**
   * Test Stripe integration
   */
  private async testStripeIntegration(): Promise<void> {
    const response = await this.makeRequest('/api/test/stripe');
    
    if (!response.ok) {
      throw new Error(`Stripe integration test failed. Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.configured) {
      throw new Error(`Stripe not properly configured: ${data.error}`);
    }
  }

  /**
   * Test Supabase connectivity
   */
  private async testSupabaseConnectivity(): Promise<void> {
    const response = await this.makeRequest('/api/test/supabase');
    
    if (!response.ok) {
      throw new Error(`Supabase connectivity test failed. Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.connected) {
      throw new Error(`Supabase not connected: ${data.error}`);
    }
  }

  /**
   * Test response times
   */
  private async testResponseTimes(): Promise<void> {
    const maxResponseTime = 2000; // 2 seconds
    const endpoints = ['/', '/api/health', '/api/restaurants'];

    for (const endpoint of endpoints) {
      const start = Date.now();
      const response = await this.makeRequest(endpoint);
      const duration = Date.now() - start;

      if (duration > maxResponseTime) {
        throw new Error(`${endpoint} response time too slow: ${duration}ms > ${maxResponseTime}ms`);
      }

      if (duration > maxResponseTime * 0.8) {
        this.log(`⚠️  ${endpoint} response time warning: ${duration}ms`, 'warning');
      }
    }
  }

  /**
   * Test cache headers
   */
  private async testCacheHeaders(): Promise<void> {
    const response = await this.makeRequest('/');
    const cacheControl = response.headers.get('cache-control');
    
    if (!cacheControl) {
      throw new Error('Missing cache-control header');
    }

    // Check for appropriate cache headers on static assets
    const staticResponse = await this.makeRequest('/favicon.ico');
    if (staticResponse.ok) {
      const staticCache = staticResponse.headers.get('cache-control');
      if (!staticCache || !staticCache.includes('max-age')) {
        throw new Error('Static assets missing cache headers');
      }
    }
  }

  /**
   * Test security headers
   */
  private async testSecurityHeaders(): Promise<void> {
    const response = await this.makeRequest('/');
    
    const requiredHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy',
    ];

    for (const header of requiredHeaders) {
      if (!response.headers.get(header)) {
        throw new Error(`Missing security header: ${header}`);
      }
    }

    // Check for CSP header
    const csp = response.headers.get('content-security-policy');
    if (!csp) {
      this.log('⚠️  Missing Content-Security-Policy header', 'warning');
    }
  }

  /**
   * Test SSL/TLS configuration
   */
  private async testSSLConfiguration(): Promise<void> {
    if (!this.baseUrl.startsWith('https://')) {
      throw new Error('Site not served over HTTPS');
    }

    // Test that HTTP redirects to HTTPS
    const httpUrl = this.baseUrl.replace('https://', 'http://');
    try {
      const response = await fetch(httpUrl, { redirect: 'manual' });
      if (response.status !== 301 && response.status !== 302) {
        this.log('⚠️  HTTP to HTTPS redirect not configured', 'warning');
      }
    } catch (error) {
      // This is expected if HTTP is blocked
    }
  }

  /**
   * Test rate limiting
   */
  private async testRateLimiting(): Promise<void> {
    const response = await this.makeRequest('/api/test/rate-limit');
    
    if (!response.ok) {
      throw new Error(`Rate limiting test failed. Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.configured) {
      this.log('⚠️  Rate limiting not configured', 'warning');
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(path: string, options?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const timeout = this.config.timeout || 10000;
    const retries = this.config.retries || 3;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;

      } catch (error) {
        if (attempt === retries) {
          throw new Error(`Request failed after ${retries} attempts: ${error}`);
        }
        
        await this.sleep(1000 * attempt); // Exponential backoff
      }
    }

    throw new Error('Request failed');
  }

  /**
   * Run a single test with error handling
   */
  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const testStart = Date.now();
    this.log(`\n🔬 ${testName}...`, 'info');

    try {
      await testFunction();
      const duration = Date.now() - testStart;
      this.tests.push({ name: testName, status: 'passed', duration });
      this.log(`✅ ${testName} passed (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - testStart;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.tests.push({ name: testName, status: 'failed', duration, message });
      this.log(`❌ ${testName} failed: ${message}`, 'error');
    }
  }

  /**
   * Calculate validation summary
   */
  private calculateSummary() {
    const total = this.tests.length;
    const passed = this.tests.filter(t => t.status === 'passed').length;
    const failed = this.tests.filter(t => t.status === 'failed').length;
    const warnings = this.tests.filter(t => t.status === 'warning').length;

    return { total, passed, failed, warnings };
  }

  /**
   * Calculate validation score
   */
  private calculateScore(summary: { total: number; passed: number; failed: number; warnings: number }): number {
    if (summary.total === 0) return 0;
    
    const baseScore = (summary.passed / summary.total) * 100;
    const warningPenalty = (summary.warnings / summary.total) * 10;
    
    return Math.max(0, Math.round(baseScore - warningPenalty));
  }

  /**
   * Get base URL for environment
   */
  private getBaseUrl(): string {
    const urls = {
      production: 'https://restaurantsaas.com',
      staging: 'https://staging.restaurantsaas.com',
      development: 'https://dev.restaurantsaas.com',
    };

    return urls[this.config.environment];
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message with timestamp and color
   */
  private log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    if (!this.config.verbose && level === 'info') return;

    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
    };
    const reset = '\x1b[0m';
    
    console.log(`${colors[level]}[${timestamp}] ${message}${reset}`);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): ValidationConfig {
  const args = process.argv.slice(2);
  const config: ValidationConfig = {
    environment: 'development',
    timeout: 10000,
    retries: 3,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--env':
        config.environment = args[++i] as 'development' | 'staging' | 'production';
        break;
      case '--timeout':
        config.timeout = parseInt(args[++i]);
        break;
      case '--retries':
        config.retries = parseInt(args[++i]);
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
Restaurant SaaS Deployment Validation Script

Usage: tsx scripts/validate-deployment.ts [options]

Options:
  --env <environment>    Environment to validate (development|staging|production)
  --timeout <ms>         Request timeout in milliseconds (default: 10000)
  --retries <number>     Number of retries for failed requests (default: 3)
  --verbose             Show detailed output
  --help                Show this help message

Examples:
  tsx scripts/validate-deployment.ts --env production
  tsx scripts/validate-deployment.ts --env staging --verbose
  tsx scripts/validate-deployment.ts --env development --timeout 5000
  `);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const config = parseArgs();
  const validator = new DeploymentValidator(config);
  
  const result = await validator.validate();
  
  // Write validation result to file
  const resultFile = `validation-${config.environment}-${Date.now()}.json`;
  require('fs').writeFileSync(resultFile, JSON.stringify(result, null, 2));
  
  console.log(`\n📄 Validation result saved to: ${resultFile}`);
  
  if (result.success) {
    console.log(`\n✅ Deployment validation passed!`);
    console.log(`📊 Score: ${result.score}%`);
    process.exit(0);
  } else {
    console.log(`\n❌ Deployment validation failed!`);
    console.log(`📊 Score: ${result.score}%`);
    console.log(`❌ Failed tests: ${result.summary.failed}`);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Validation script failed:', error);
    process.exit(1);
  });
}

export { DeploymentValidator, type ValidationConfig, type ValidationResult };