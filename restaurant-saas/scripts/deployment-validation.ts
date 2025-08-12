#!/usr/bin/env node

/**
 * Deployment readiness validation for Cloudflare Workers
 * Ensures all performance optimizations are production-ready
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface ValidationResult {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: any;
  impact: 'critical' | 'high' | 'medium' | 'low';
}

interface DeploymentReport {
  timestamp: string;
  environment: string;
  readinessScore: number;
  validations: ValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    critical: number;
    blockers: number;
  };
  recommendations: string[];
  deployment: {
    ready: boolean;
    blockers: string[];
    requirements: string[];
  };
}

class DeploymentValidator {
  private projectRoot: string;
  private environment: string;
  private validations: ValidationResult[] = [];

  constructor(environment = 'production') {
    this.projectRoot = process.cwd();
    this.environment = environment;
  }

  /**
   * Run complete deployment validation
   */
  async validate(): Promise<DeploymentReport> {
    console.log(`🔍 Validating deployment readiness for ${this.environment}...\n`);

    try {
      // Core application validations
      await this.validateProjectStructure();
      await this.validateDependencies();
      await this.validateConfiguration();
      
      // Performance optimization validations
      await this.validateCacheSystem();
      await this.validateImageOptimization();
      await this.validateMiddleware();
      await this.validateBundleOptimization();
      
      // Cloudflare Workers specific validations
      await this.validateCloudflareCompatibility();
      await this.validateEdgeRuntime();
      await this.validateSecurityConfiguration();
      
      // Performance and monitoring validations
      await this.validatePerformanceOptimizations();
      await this.validateMonitoringSetup();
      
      // Generate deployment report
      const report = this.generateReport();
      
      // Display results
      this.displayResults(report);
      
      return report;

    } catch (error) {
      console.error('❌ Deployment validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate project structure and essential files
   */
  private async validateProjectStructure(): Promise<void> {
    console.log('📁 Validating project structure...');

    // Check essential files
    const essentialFiles = [
      'package.json',
      'next.config.mjs',
      'wrangler.toml',
      'tsconfig.json',
      'tailwind.config.ts'
    ];

    for (const file of essentialFiles) {
      await this.checkFile(file, 'critical');
    }

    // Check performance optimization files
    const performanceFiles = [
      'lib/performance/cache-manager.ts',
      'lib/performance/image-optimization.ts',
      'lib/performance/query-optimization.ts',
      'lib/performance/bundle-analyzer.ts',
      'middleware/cache.ts',
      'middleware/compression.ts'
    ];

    for (const file of performanceFiles) {
      await this.checkFile(file, 'high', 'Performance Optimization');
    }

    // Check optimized components
    const componentFiles = [
      'components/common/optimized-image.tsx',
      'components/common/lazy-load.tsx',
      'hooks/use-intersection-observer.tsx',
      'hooks/use-prefetch.tsx'
    ];

    for (const file of componentFiles) {
      await this.checkFile(file, 'medium', 'Optimized Components');
    }

    console.log('✓ Project structure validation completed');
  }

  /**
   * Validate dependencies and versions
   */
  private async validateDependencies(): Promise<void> {
    console.log('📦 Validating dependencies...');

    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf-8')
      );

      // Check critical dependencies
      const criticalDeps = [
        'next',
        'react',
        'react-dom',
        '@cloudflare/next-on-pages',
        'wrangler'
      ];

      for (const dep of criticalDeps) {
        if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
          this.addValidation('Dependencies', `Missing ${dep}`, 'fail', 
            `Critical dependency ${dep} is missing`, 'critical');
        } else {
          this.addValidation('Dependencies', `${dep} present`, 'pass', 
            `Dependency ${dep} is available`, 'low');
        }
      }

      // Check performance-related dependencies
      const performanceDeps = [
        'webpack-bundle-analyzer',
        'tsx'
      ];

      for (const dep of performanceDeps) {
        if (!packageJson.devDependencies?.[dep]) {
          this.addValidation('Dependencies', `Missing ${dep}`, 'warning', 
            `Performance dependency ${dep} is missing`, 'medium');
        } else {
          this.addValidation('Dependencies', `${dep} present`, 'pass', 
            `Performance dependency ${dep} is available`, 'low');
        }
      }

      // Check Next.js version compatibility
      const nextVersion = packageJson.dependencies?.next || packageJson.devDependencies?.next;
      if (nextVersion) {
        const version = nextVersion.replace(/[\^~]/, '');
        const majorVersion = parseInt(version.split('.')[0]);
        
        if (majorVersion >= 15) {
          this.addValidation('Dependencies', 'Next.js version', 'pass', 
            `Next.js ${version} is compatible with optimizations`, 'low');
        } else {
          this.addValidation('Dependencies', 'Next.js version', 'warning', 
            `Next.js ${version} may have limited optimization support`, 'medium');
        }
      }

    } catch (error) {
      this.addValidation('Dependencies', 'Package.json validation', 'fail', 
        'Could not read or parse package.json', 'critical');
    }

    console.log('✓ Dependencies validation completed');
  }

  /**
   * Validate configuration files
   */
  private async validateConfiguration(): Promise<void> {
    console.log('⚙️  Validating configuration...');

    // Validate Next.js config
    try {
      const nextConfigPath = path.join(this.projectRoot, 'next.config.mjs');
      const nextConfig = await fs.readFile(nextConfigPath, 'utf-8');
      
      // Check for performance optimizations
      const optimizations = [
        'swcMinify',
        'modularizeImports',
        'experimental',
        'webpack',
        'compress'
      ];

      for (const opt of optimizations) {
        if (nextConfig.includes(opt)) {
          this.addValidation('Configuration', `Next.js ${opt}`, 'pass', 
            `${opt} is configured`, 'low');
        } else {
          this.addValidation('Configuration', `Next.js ${opt}`, 'warning', 
            `${opt} optimization not found in config`, 'medium');
        }
      }

      // Check for bundle analyzer configuration
      if (nextConfig.includes('BundleAnalyzerPlugin')) {
        this.addValidation('Configuration', 'Bundle analyzer', 'pass', 
          'Bundle analyzer is configured', 'low');
      } else {
        this.addValidation('Configuration', 'Bundle analyzer', 'warning', 
          'Bundle analyzer not configured', 'medium');
      }

    } catch (error) {
      this.addValidation('Configuration', 'Next.js config', 'fail', 
        'Could not read next.config.mjs', 'high');
    }

    // Validate Wrangler config
    try {
      const wranglerConfigPath = path.join(this.projectRoot, 'wrangler.toml');
      const wranglerConfig = await fs.readFile(wranglerConfigPath, 'utf-8');
      
      if (wranglerConfig.includes('compatibility_date')) {
        this.addValidation('Configuration', 'Wrangler compatibility', 'pass', 
          'Compatibility date is set', 'low');
      } else {
        this.addValidation('Configuration', 'Wrangler compatibility', 'warning', 
          'Compatibility date not specified', 'medium');
      }

      if (wranglerConfig.includes('[env.')) {
        this.addValidation('Configuration', 'Environment config', 'pass', 
          'Environment-specific configuration found', 'low');
      }

    } catch (error) {
      this.addValidation('Configuration', 'Wrangler config', 'fail', 
        'Could not read wrangler.toml', 'critical');
    }

    console.log('✓ Configuration validation completed');
  }

  /**
   * Validate cache system implementation
   */
  private async validateCacheSystem(): Promise<void> {
    console.log('🗄️  Validating cache system...');

    try {
      const cacheManagerPath = path.join(this.projectRoot, 'lib/performance/cache-manager.ts');
      const cacheManager = await fs.readFile(cacheManagerPath, 'utf-8');

      // Check for essential cache features
      const cacheFeatures = [
        { name: 'Multi-layer caching', pattern: 'CacheLayer' },
        { name: 'Cache strategies', pattern: 'CacheStrategy' },
        { name: 'TTL management', pattern: 'ttl' },
        { name: 'Cache invalidation', pattern: 'invalidate' },
        { name: 'Stale-while-revalidate', pattern: 'staleWhileRevalidate' }
      ];

      for (const feature of cacheFeatures) {
        if (cacheManager.includes(feature.pattern)) {
          this.addValidation('Cache System', feature.name, 'pass', 
            `${feature.name} is implemented`, 'low');
        } else {
          this.addValidation('Cache System', feature.name, 'fail', 
            `${feature.name} is missing`, 'high');
        }
      }

      // Check for Cloudflare KV integration
      if (cacheManager.includes('CACHE_KV')) {
        this.addValidation('Cache System', 'Cloudflare KV', 'pass', 
          'Cloudflare KV integration is configured', 'medium');
      } else {
        this.addValidation('Cache System', 'Cloudflare KV', 'warning', 
          'Cloudflare KV integration not found', 'medium');
      }

    } catch (error) {
      this.addValidation('Cache System', 'Implementation', 'fail', 
        'Cache manager implementation not found', 'critical');
    }

    console.log('✓ Cache system validation completed');
  }

  /**
   * Validate image optimization
   */
  private async validateImageOptimization(): Promise<void> {
    console.log('🖼️  Validating image optimization...');

    try {
      const imageOptPath = path.join(this.projectRoot, 'lib/performance/image-optimization.ts');
      const imageOpt = await fs.readFile(imageOptPath, 'utf-8');

      // Check for image optimization features
      const imageFeatures = [
        { name: 'Cloudflare Images', pattern: 'generateCloudflareImageUrl' },
        { name: 'Responsive images', pattern: 'generateSrcSet' },
        { name: 'Format optimization', pattern: 'webp|avif' },
        { name: 'Lazy loading', pattern: 'lazy' },
        { name: 'Placeholder generation', pattern: 'generateBlurPlaceholder' }
      ];

      for (const feature of imageFeatures) {
        if (imageOpt.match(new RegExp(feature.pattern, 'i'))) {
          this.addValidation('Image Optimization', feature.name, 'pass', 
            `${feature.name} is implemented`, 'low');
        } else {
          this.addValidation('Image Optimization', feature.name, 'warning', 
            `${feature.name} may not be fully implemented`, 'medium');
        }
      }

      // Check optimized image component
      const optimizedImagePath = path.join(this.projectRoot, 'components/common/optimized-image.tsx');
      try {
        await fs.access(optimizedImagePath);
        this.addValidation('Image Optimization', 'Optimized component', 'pass', 
          'OptimizedImage component is available', 'medium');
      } catch {
        this.addValidation('Image Optimization', 'Optimized component', 'fail', 
          'OptimizedImage component not found', 'high');
      }

    } catch (error) {
      this.addValidation('Image Optimization', 'Implementation', 'fail', 
        'Image optimization implementation not found', 'high');
    }

    console.log('✓ Image optimization validation completed');
  }

  /**
   * Validate middleware implementation
   */
  private async validateMiddleware(): Promise<void> {
    console.log('🔄 Validating middleware...');

    // Check cache middleware
    try {
      const cacheMiddlewarePath = path.join(this.projectRoot, 'middleware/cache.ts');
      await fs.access(cacheMiddlewarePath);
      
      const cacheMiddleware = await fs.readFile(cacheMiddlewarePath, 'utf-8');
      
      if (cacheMiddleware.includes('EdgeCacheMiddleware')) {
        this.addValidation('Middleware', 'Cache middleware', 'pass', 
          'Edge cache middleware is implemented', 'medium');
      } else {
        this.addValidation('Middleware', 'Cache middleware', 'warning', 
          'Edge cache middleware may be incomplete', 'medium');
      }

    } catch (error) {
      this.addValidation('Middleware', 'Cache middleware', 'fail', 
        'Cache middleware not found', 'high');
    }

    // Check compression middleware
    try {
      const compressionMiddlewarePath = path.join(this.projectRoot, 'middleware/compression.ts');
      await fs.access(compressionMiddlewarePath);
      
      const compressionMiddleware = await fs.readFile(compressionMiddlewarePath, 'utf-8');
      
      const compressionFeatures = ['gzip', 'brotli', 'CompressionStream'];
      const implementedFeatures = compressionFeatures.filter(feature => 
        compressionMiddleware.includes(feature)
      );

      if (implementedFeatures.length >= 2) {
        this.addValidation('Middleware', 'Compression middleware', 'pass', 
          `Compression middleware supports ${implementedFeatures.join(', ')}`, 'medium');
      } else {
        this.addValidation('Middleware', 'Compression middleware', 'warning', 
          'Compression middleware may have limited support', 'medium');
      }

    } catch (error) {
      this.addValidation('Middleware', 'Compression middleware', 'fail', 
        'Compression middleware not found', 'high');
    }

    console.log('✓ Middleware validation completed');
  }

  /**
   * Validate bundle optimization
   */
  private async validateBundleOptimization(): Promise<void> {
    console.log('📊 Validating bundle optimization...');

    try {
      const bundleAnalyzerPath = path.join(this.projectRoot, 'lib/performance/bundle-analyzer.ts');
      await fs.access(bundleAnalyzerPath);
      
      this.addValidation('Bundle Optimization', 'Bundle analyzer', 'pass', 
        'Bundle analyzer is available', 'medium');

      // Check optimization scripts
      const optimizeBuildPath = path.join(this.projectRoot, 'scripts/optimize-build.ts');
      try {
        await fs.access(optimizeBuildPath);
        this.addValidation('Bundle Optimization', 'Optimization script', 'pass', 
          'Build optimization script is available', 'medium');
      } catch {
        this.addValidation('Bundle Optimization', 'Optimization script', 'warning', 
          'Build optimization script not found', 'medium');
      }

      // Check package.json scripts
      const packageJson = JSON.parse(
        await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf-8')
      );

      const optimizationScripts = ['analyze', 'bundle-analyzer', 'optimize-build'];
      const availableScripts = optimizationScripts.filter(script => 
        packageJson.scripts?.[script]
      );

      if (availableScripts.length >= 2) {
        this.addValidation('Bundle Optimization', 'NPM scripts', 'pass', 
          `Optimization scripts available: ${availableScripts.join(', ')}`, 'low');
      } else {
        this.addValidation('Bundle Optimization', 'NPM scripts', 'warning', 
          'Limited optimization scripts available', 'medium');
      }

    } catch (error) {
      this.addValidation('Bundle Optimization', 'Implementation', 'fail', 
        'Bundle optimization implementation not found', 'high');
    }

    console.log('✓ Bundle optimization validation completed');
  }

  /**
   * Validate Cloudflare Workers compatibility
   */
  private async validateCloudflareCompatibility(): Promise<void> {
    console.log('☁️  Validating Cloudflare compatibility...');

    try {
      // Check build configuration
      execSync('npm run build', { 
        stdio: 'pipe', 
        cwd: this.projectRoot,
        timeout: 120000 // 2 minutes
      });
      
      this.addValidation('Cloudflare Compatibility', 'Build process', 'pass', 
        'Application builds successfully', 'critical');

      // Check for .next output
      const nextBuildPath = path.join(this.projectRoot, '.next');
      try {
        await fs.access(nextBuildPath);
        this.addValidation('Cloudflare Compatibility', 'Build output', 'pass', 
          'Next.js build output exists', 'critical');
      } catch {
        this.addValidation('Cloudflare Compatibility', 'Build output', 'fail', 
          'Next.js build output not found', 'critical');
      }

      // Check for edge runtime compatibility
      const nextConfigPath = path.join(this.projectRoot, 'next.config.mjs');
      const nextConfig = await fs.readFile(nextConfigPath, 'utf-8');
      
      if (nextConfig.includes('experimental')) {
        this.addValidation('Cloudflare Compatibility', 'Edge runtime', 'pass', 
          'Edge runtime features are configured', 'high');
      } else {
        this.addValidation('Cloudflare Compatibility', 'Edge runtime', 'warning', 
          'Edge runtime configuration not found', 'medium');
      }

    } catch (error) {
      this.addValidation('Cloudflare Compatibility', 'Build process', 'fail', 
        `Build failed: ${error}`, 'critical');
    }

    console.log('✓ Cloudflare compatibility validation completed');
  }

  /**
   * Validate edge runtime requirements
   */
  private async validateEdgeRuntime(): Promise<void> {
    console.log('⚡ Validating edge runtime...');

    // Check for edge-incompatible APIs
    const incompatibleAPIs = [
      'fs.readFile',
      'fs.writeFile',
      'process.env',
      'Buffer.from',
      'crypto.randomBytes'
    ];

    try {
      const srcFiles = await this.findSourceFiles();
      let incompatibleCount = 0;

      for (const file of srcFiles.slice(0, 20)) { // Limit to first 20 files for performance
        try {
          const content = await fs.readFile(file, 'utf-8');
          
          for (const api of incompatibleAPIs) {
            if (content.includes(api)) {
              incompatibleCount++;
              this.addValidation('Edge Runtime', `Incompatible API: ${api}`, 'warning', 
                `Found ${api} in ${path.relative(this.projectRoot, file)}`, 'medium');
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }

      if (incompatibleCount === 0) {
        this.addValidation('Edge Runtime', 'API compatibility', 'pass', 
          'No obvious edge-incompatible APIs found', 'medium');
      } else {
        this.addValidation('Edge Runtime', 'API compatibility', 'warning', 
          `Found ${incompatibleCount} potential edge compatibility issues`, 'medium');
      }

    } catch (error) {
      this.addValidation('Edge Runtime', 'API validation', 'warning', 
        'Could not validate edge runtime compatibility', 'medium');
    }

    console.log('✓ Edge runtime validation completed');
  }

  /**
   * Validate security configuration
   */
  private async validateSecurityConfiguration(): Promise<void> {
    console.log('🔒 Validating security configuration...');

    try {
      const nextConfigPath = path.join(this.projectRoot, 'next.config.mjs');
      const nextConfig = await fs.readFile(nextConfigPath, 'utf-8');

      // Check security headers
      const securityHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy'
      ];

      const configuredHeaders = securityHeaders.filter(header => 
        nextConfig.includes(header)
      );

      if (configuredHeaders.length >= 3) {
        this.addValidation('Security', 'Security headers', 'pass', 
          `Security headers configured: ${configuredHeaders.join(', ')}`, 'high');
      } else {
        this.addValidation('Security', 'Security headers', 'warning', 
          'Some security headers may be missing', 'high');
      }

      // Check for HTTPS enforcement
      if (nextConfig.includes('poweredByHeader: false')) {
        this.addValidation('Security', 'X-Powered-By header', 'pass', 
          'X-Powered-By header is disabled', 'medium');
      } else {
        this.addValidation('Security', 'X-Powered-By header', 'warning', 
          'X-Powered-By header should be disabled', 'medium');
      }

    } catch (error) {
      this.addValidation('Security', 'Configuration', 'warning', 
        'Could not validate security configuration', 'medium');
    }

    console.log('✓ Security validation completed');
  }

  /**
   * Validate performance optimizations
   */
  private async validatePerformanceOptimizations(): Promise<void> {
    console.log('🚀 Validating performance optimizations...');

    // Check for performance hooks
    const performanceHooks = [
      'hooks/use-intersection-observer.tsx',
      'hooks/use-prefetch.tsx'
    ];

    for (const hook of performanceHooks) {
      try {
        await fs.access(path.join(this.projectRoot, hook));
        this.addValidation('Performance', `Hook: ${path.basename(hook)}`, 'pass', 
          `Performance hook ${path.basename(hook)} is available`, 'medium');
      } catch {
        this.addValidation('Performance', `Hook: ${path.basename(hook)}`, 'warning', 
          `Performance hook ${path.basename(hook)} not found`, 'medium');
      }
    }

    // Check for optimized components
    const optimizedComponents = [
      'components/common/optimized-image.tsx',
      'components/common/lazy-load.tsx'
    ];

    for (const component of optimizedComponents) {
      try {
        await fs.access(path.join(this.projectRoot, component));
        this.addValidation('Performance', `Component: ${path.basename(component)}`, 'pass', 
          `Optimized component ${path.basename(component)} is available`, 'medium');
      } catch {
        this.addValidation('Performance', `Component: ${path.basename(component)}`, 'fail', 
          `Optimized component ${path.basename(component)} not found`, 'high');
      }
    }

    console.log('✓ Performance optimizations validation completed');
  }

  /**
   * Validate monitoring setup
   */
  private async validateMonitoringSetup(): Promise<void> {
    console.log('📈 Validating monitoring setup...');

    // Check for testing scripts
    const testingScripts = [
      'scripts/performance-test.ts',
      'scripts/integration-test.ts'
    ];

    for (const script of testingScripts) {
      try {
        await fs.access(path.join(this.projectRoot, script));
        this.addValidation('Monitoring', `Script: ${path.basename(script)}`, 'pass', 
          `Monitoring script ${path.basename(script)} is available`, 'low');
      } catch {
        this.addValidation('Monitoring', `Script: ${path.basename(script)}`, 'warning', 
          `Monitoring script ${path.basename(script)} not found`, 'low');
      }
    }

    // Check package.json for monitoring scripts
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf-8')
      );

      const monitoringScripts = ['performance-test', 'integration-test'];
      const availableMonitoring = monitoringScripts.filter(script => 
        packageJson.scripts?.[script]
      );

      if (availableMonitoring.length >= 1) {
        this.addValidation('Monitoring', 'NPM scripts', 'pass', 
          `Monitoring scripts available: ${availableMonitoring.join(', ')}`, 'low');
      } else {
        this.addValidation('Monitoring', 'NPM scripts', 'warning', 
          'No monitoring scripts configured', 'medium');
      }

    } catch (error) {
      this.addValidation('Monitoring', 'Script configuration', 'warning', 
        'Could not validate monitoring script configuration', 'low');
    }

    console.log('✓ Monitoring setup validation completed');
  }

  /**
   * Helper method to check if file exists
   */
  private async checkFile(
    filePath: string, 
    impact: ValidationResult['impact'], 
    category = 'Project Structure'
  ): Promise<void> {
    try {
      await fs.access(path.join(this.projectRoot, filePath));
      this.addValidation(category, `File: ${filePath}`, 'pass', 
        `${filePath} exists`, impact);
    } catch {
      this.addValidation(category, `File: ${filePath}`, 'fail', 
        `${filePath} is missing`, impact);
    }
  }

  /**
   * Add validation result
   */
  private addValidation(
    category: string,
    check: string,
    status: ValidationResult['status'],
    message: string,
    impact: ValidationResult['impact'],
    details?: any
  ): void {
    this.validations.push({
      category,
      check,
      status,
      message,
      impact,
      details
    });
  }

  /**
   * Find source files for analysis
   */
  private async findSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    const searchDirs = ['lib', 'components', 'hooks', 'middleware', 'app'];
    
    for (const dir of searchDirs) {
      try {
        const dirPath = path.join(this.projectRoot, dir);
        await fs.access(dirPath);
        const dirFiles = await this.findFilesRecursive(dirPath, extensions);
        files.push(...dirFiles);
      } catch {
        // Directory doesn't exist, skip
      }
    }
    
    return files;
  }

  /**
   * Find files recursively
   */
  private async findFilesRecursive(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findFilesRecursive(fullPath, extensions);
          files.push(...subFiles);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory not accessible
    }
    
    return files;
  }

  /**
   * Generate deployment report
   */
  private generateReport(): DeploymentReport {
    const total = this.validations.length;
    const passed = this.validations.filter(v => v.status === 'pass').length;
    const failed = this.validations.filter(v => v.status === 'fail').length;
    const warnings = this.validations.filter(v => v.status === 'warning').length;
    const critical = this.validations.filter(v => v.impact === 'critical').length;
    const blockers = this.validations.filter(v => 
      v.status === 'fail' && (v.impact === 'critical' || v.impact === 'high')
    ).length;

    // Calculate readiness score (0-100)
    let score = 100;
    score -= failed * 10; // -10 for each failure
    score -= warnings * 5; // -5 for each warning
    score -= critical * 20; // Additional -20 for critical issues
    score = Math.max(0, score);

    // Determine if deployment is ready
    const isReady = blockers === 0 && critical === 0;
    
    // Get blockers and requirements
    const deploymentBlockers = this.validations
      .filter(v => v.status === 'fail' && (v.impact === 'critical' || v.impact === 'high'))
      .map(v => v.message);

    const requirements = this.validations
      .filter(v => v.status === 'warning' && v.impact === 'high')
      .map(v => v.message);

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      readinessScore: score,
      validations: this.validations,
      summary: {
        total,
        passed,
        failed,
        warnings,
        critical,
        blockers
      },
      recommendations,
      deployment: {
        ready: isReady,
        blockers: deploymentBlockers,
        requirements
      }
    };
  }

  /**
   * Generate deployment recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Critical issues
    const criticalFailures = this.validations.filter(v => 
      v.status === 'fail' && v.impact === 'critical'
    );
    
    if (criticalFailures.length > 0) {
      recommendations.push('Fix all critical issues before deployment');
    }

    // High-impact warnings
    const highWarnings = this.validations.filter(v => 
      v.status === 'warning' && v.impact === 'high'
    );
    
    if (highWarnings.length > 0) {
      recommendations.push('Address high-impact warnings for optimal performance');
    }

    // Performance optimizations
    const performanceIssues = this.validations.filter(v => 
      v.category === 'Performance' && v.status !== 'pass'
    );
    
    if (performanceIssues.length > 0) {
      recommendations.push('Complete performance optimization implementation');
    }

    // Monitoring setup
    const monitoringIssues = this.validations.filter(v => 
      v.category === 'Monitoring' && v.status !== 'pass'
    );
    
    if (monitoringIssues.length > 0) {
      recommendations.push('Set up comprehensive monitoring and testing');
    }

    // General recommendations
    recommendations.push('Run performance tests before deployment');
    recommendations.push('Verify all environment variables are configured');
    recommendations.push('Test deployment in staging environment first');

    return recommendations;
  }

  /**
   * Display validation results
   */
  private displayResults(report: DeploymentReport): void {
    console.log('\n🎯 Deployment Readiness Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Environment: ${report.environment}`);
    console.log(`Readiness Score: ${report.readinessScore}/100`);
    console.log(`Deployment Ready: ${report.deployment.ready ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n📊 Validation Summary:');
    console.log(`Total Checks: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed} ✅`);
    console.log(`Failed: ${report.summary.failed} ❌`);
    console.log(`Warnings: ${report.summary.warnings} ⚠️`);
    console.log(`Critical Issues: ${report.summary.critical} 🚨`);
    console.log(`Deployment Blockers: ${report.summary.blockers} 🚫`);

    // Show blockers if any
    if (report.deployment.blockers.length > 0) {
      console.log('\n🚫 Deployment Blockers:');
      report.deployment.blockers.forEach(blocker => {
        console.log(`  • ${blocker}`);
      });
    }

    // Show recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    // Show validation details by category
    const categories = [...new Set(report.validations.map(v => v.category))];
    
    console.log('\n📋 Detailed Results:');
    categories.forEach(category => {
      const categoryValidations = report.validations.filter(v => v.category === category);
      const categoryPassed = categoryValidations.filter(v => v.status === 'pass').length;
      const categoryTotal = categoryValidations.length;
      
      console.log(`\n${category} (${categoryPassed}/${categoryTotal} passed):`);
      
      categoryValidations.forEach(validation => {
        const icon = validation.status === 'pass' ? '✅' : 
                    validation.status === 'fail' ? '❌' : 
                    validation.status === 'warning' ? '⚠️' : 'ℹ️';
        
        console.log(`  ${icon} ${validation.check}: ${validation.message}`);
      });
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'production';
  
  const validator = new DeploymentValidator(environment);

  try {
    const report = await validator.validate();
    
    // Save report
    const reportPath = path.join(process.cwd(), 'reports', `deployment-readiness-${environment}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    if (report.deployment.ready) {
      console.log('\n✅ Deployment is ready!');
      process.exit(0);
    } else {
      console.log('\n❌ Deployment not ready - please address the issues above');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Deployment validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DeploymentValidator };
export default DeploymentValidator;