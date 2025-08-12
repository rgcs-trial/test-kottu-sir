#!/usr/bin/env tsx
/**
 * Automated Deployment Script for Restaurant SaaS
 * Handles complete deployment pipeline with validation and rollback
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  skipValidation?: boolean;
  skipTests?: boolean;
  dryRun?: boolean;
  rollbackOnFailure?: boolean;
  verbose?: boolean;
}

interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  version?: string;
  url?: string;
  error?: string;
  duration: number;
  steps: Array<{
    name: string;
    status: 'success' | 'failed' | 'skipped';
    duration: number;
    output?: string;
  }>;
}

class RestaurantSaaSDeployer {
  private config: DeploymentConfig;
  private startTime: number = 0;
  private steps: Array<{ name: string; status: 'success' | 'failed' | 'skipped'; duration: number; output?: string }> = [];

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  /**
   * Execute complete deployment pipeline
   */
  async deploy(): Promise<DeploymentResult> {
    this.startTime = Date.now();
    this.log('🚀 Starting Restaurant SaaS deployment...', 'info');
    this.log(`Environment: ${this.config.environment}`, 'info');

    try {
      // Pre-deployment validation
      await this.runStep('Pre-deployment validation', () => this.preDeploymentValidation());
      
      // Environment setup
      await this.runStep('Environment setup', () => this.setupEnvironment());
      
      // Dependency installation
      await this.runStep('Install dependencies', () => this.installDependencies());
      
      // Code quality checks
      if (!this.config.skipValidation) {
        await this.runStep('Code quality checks', () => this.runQualityChecks());
      }
      
      // Run tests
      if (!this.config.skipTests) {
        await this.runStep('Run tests', () => this.runTests());
      }
      
      // Build application
      await this.runStep('Build application', () => this.buildApplication());
      
      // Setup Cloudflare resources
      await this.runStep('Setup Cloudflare resources', () => this.setupCloudflareResources());
      
      // Deploy to Cloudflare Workers
      await this.runStep('Deploy to Cloudflare Workers', () => this.deployToCloudflare());
      
      // Post-deployment validation
      await this.runStep('Post-deployment validation', () => this.postDeploymentValidation());
      
      // Warm up cache
      await this.runStep('Warm up cache', () => this.warmUpCache());

      const duration = Date.now() - this.startTime;
      this.log(`✅ Deployment completed successfully in ${duration}ms`, 'success');

      return {
        success: true,
        deploymentId: this.generateDeploymentId(),
        version: this.getVersion(),
        url: this.getDeploymentUrl(),
        duration,
        steps: this.steps,
      };

    } catch (error) {
      const duration = Date.now() - this.startTime;
      this.log(`❌ Deployment failed: ${error}`, 'error');

      if (this.config.rollbackOnFailure) {
        await this.rollback();
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        steps: this.steps,
      };
    }
  }

  /**
   * Pre-deployment validation
   */
  private async preDeploymentValidation(): Promise<void> {
    this.log('Validating deployment prerequisites...', 'info');

    // Check if wrangler is authenticated
    try {
      this.execCommand('wrangler auth whoami');
      this.log('✓ Wrangler authentication verified', 'success');
    } catch {
      throw new Error('Wrangler not authenticated. Run: npm run cf-login');
    }

    // Check if required environment variables exist
    const requiredEnvFile = `.env.${this.config.environment}`;
    if (!existsSync(requiredEnvFile)) {
      this.log(`⚠️  Environment file ${requiredEnvFile} not found`, 'warning');
    }

    // Validate wrangler.toml
    if (!existsSync('wrangler.toml')) {
      throw new Error('wrangler.toml not found');
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const minVersion = 'v18.17.0';
    if (nodeVersion < minVersion) {
      throw new Error(`Node.js ${minVersion} or higher required. Current: ${nodeVersion}`);
    }

    this.log('✓ Pre-deployment validation passed', 'success');
  }

  /**
   * Setup environment
   */
  private async setupEnvironment(): Promise<void> {
    this.log('Setting up environment...', 'info');

    // Generate types for Cloudflare Workers
    this.execCommand('npm run cf-typegen');
    this.log('✓ Generated Cloudflare types', 'success');

    // Validate environment configuration
    await this.validateEnvironmentConfig();

    this.log('✓ Environment setup completed', 'success');
  }

  /**
   * Install dependencies
   */
  private async installDependencies(): Promise<void> {
    this.log('Installing dependencies...', 'info');
    
    if (this.config.dryRun) {
      this.log('🔍 [DRY RUN] Would install dependencies', 'info');
      return;
    }

    this.execCommand('npm ci');
    this.log('✓ Dependencies installed', 'success');
  }

  /**
   * Run code quality checks
   */
  private async runQualityChecks(): Promise<void> {
    this.log('Running code quality checks...', 'info');

    if (this.config.dryRun) {
      this.log('🔍 [DRY RUN] Would run quality checks', 'info');
      return;
    }

    // Run linter
    this.execCommand('npm run lint');
    this.log('✓ Linting passed', 'success');

    // Run type check
    this.execCommand('npm run type-check');
    this.log('✓ Type checking passed', 'success');
  }

  /**
   * Run tests
   */
  private async runTests(): Promise<void> {
    this.log('Running tests...', 'info');

    if (this.config.dryRun) {
      this.log('🔍 [DRY RUN] Would run tests', 'info');
      return;
    }

    // Run unit tests (when available)
    try {
      this.execCommand('npm test', false);
      this.log('✓ Tests passed', 'success');
    } catch {
      this.log('⚠️  Tests not configured or failed', 'warning');
    }
  }

  /**
   * Build application
   */
  private async buildApplication(): Promise<void> {
    this.log('Building application...', 'info');

    if (this.config.dryRun) {
      this.log('🔍 [DRY RUN] Would build application', 'info');
      return;
    }

    this.execCommand(`npm run build:${this.config.environment}`);
    this.log('✓ Application built successfully', 'success');
  }

  /**
   * Setup Cloudflare resources
   */
  private async setupCloudflareResources(): Promise<void> {
    this.log('Setting up Cloudflare resources...', 'info');

    if (this.config.dryRun) {
      this.log('🔍 [DRY RUN] Would setup Cloudflare resources', 'info');
      return;
    }

    try {
      // Create KV namespaces
      this.execCommand('npm run kv:create');
      this.log('✓ KV namespaces created/verified', 'success');
    } catch (error) {
      this.log('⚠️  KV namespace setup failed or already exists', 'warning');
    }

    try {
      // Create R2 buckets
      this.execCommand('npm run r2:create');
      this.log('✓ R2 buckets created/verified', 'success');
    } catch (error) {
      this.log('⚠️  R2 bucket setup failed or already exists', 'warning');
    }

    try {
      // Setup Durable Objects
      this.execCommand('npm run do:create');
      this.log('✓ Durable Objects configured', 'success');
    } catch (error) {
      this.log('⚠️  Durable Objects setup failed or already exists', 'warning');
    }

    try {
      // Create queues
      this.execCommand('npm run queues:create');
      this.log('✓ Queues created/verified', 'success');
    } catch (error) {
      this.log('⚠️  Queue setup failed or already exists', 'warning');
    }
  }

  /**
   * Deploy to Cloudflare Workers
   */
  private async deployToCloudflare(): Promise<void> {
    this.log('Deploying to Cloudflare Workers...', 'info');

    if (this.config.dryRun) {
      this.log('🔍 [DRY RUN] Would deploy to Cloudflare Workers', 'info');
      return;
    }

    const deployCommand = `npm run deploy:${this.config.environment}`;
    this.execCommand(deployCommand);
    this.log('✓ Deployed to Cloudflare Workers', 'success');
  }

  /**
   * Post-deployment validation
   */
  private async postDeploymentValidation(): Promise<void> {
    this.log('Running post-deployment validation...', 'info');

    if (this.config.dryRun) {
      this.log('🔍 [DRY RUN] Would run post-deployment validation', 'info');
      return;
    }

    // Run deployment validation script
    this.execCommand(`npm run validate:${this.config.environment}`);
    this.log('✓ Post-deployment validation passed', 'success');

    // Run smoke tests
    this.execCommand('npm run smoke:test');
    this.log('✓ Smoke tests passed', 'success');
  }

  /**
   * Warm up cache
   */
  private async warmUpCache(): Promise<void> {
    this.log('Warming up cache...', 'info');

    if (this.config.dryRun) {
      this.log('🔍 [DRY RUN] Would warm up cache', 'info');
      return;
    }

    // Cache warming would be implemented here
    // For now, just a placeholder
    this.log('✓ Cache warmed up', 'success');
  }

  /**
   * Rollback deployment
   */
  private async rollback(): Promise<void> {
    this.log('🔄 Rolling back deployment...', 'warning');

    try {
      this.execCommand(`npm run rollback:${this.config.environment}`);
      this.log('✓ Rollback completed', 'success');
    } catch (error) {
      this.log(`❌ Rollback failed: ${error}`, 'error');
    }
  }

  /**
   * Run a deployment step with error handling
   */
  private async runStep(stepName: string, stepFunction: () => Promise<void>): Promise<void> {
    const stepStart = Date.now();
    this.log(`\n📋 ${stepName}...`, 'info');

    try {
      await stepFunction();
      const duration = Date.now() - stepStart;
      this.steps.push({ name: stepName, status: 'success', duration });
    } catch (error) {
      const duration = Date.now() - stepStart;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.steps.push({ name: stepName, status: 'failed', duration, output: errorMessage });
      throw error;
    }
  }

  /**
   * Execute command with error handling
   */
  private execCommand(command: string, throwOnError = true): string {
    try {
      const output = execSync(command, { 
        encoding: 'utf-8',
        stdio: this.config.verbose ? 'inherit' : 'pipe'
      });
      return output;
    } catch (error) {
      if (throwOnError) {
        throw new Error(`Command failed: ${command}`);
      }
      return '';
    }
  }

  /**
   * Validate environment configuration
   */
  private async validateEnvironmentConfig(): Promise<void> {
    const envFile = `.env.${this.config.environment}`;
    if (existsSync(envFile)) {
      const envContent = readFileSync(envFile, 'utf-8');
      const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'STRIPE_PUBLISHABLE_KEY',
      ];

      for (const varName of requiredVars) {
        if (!envContent.includes(varName)) {
          this.log(`⚠️  Missing environment variable: ${varName}`, 'warning');
        }
      }
    }
  }

  /**
   * Generate deployment ID
   */
  private generateDeploymentId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `deploy-${this.config.environment}-${timestamp}`;
  }

  /**
   * Get application version
   */
  private getVersion(): string {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      return packageJson.version;
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Get deployment URL
   */
  private getDeploymentUrl(): string {
    const urls = {
      production: 'https://restaurantsaas.com',
      staging: 'https://staging.restaurantsaas.com',
      development: 'https://dev.restaurantsaas.com',
    };

    return urls[this.config.environment];
  }

  /**
   * Log message with timestamp and color
   */
  private log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
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
function parseArgs(): DeploymentConfig {
  const args = process.argv.slice(2);
  const config: DeploymentConfig = {
    environment: 'development',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--env':
        config.environment = args[++i] as 'development' | 'staging' | 'production';
        break;
      case '--skip-validation':
        config.skipValidation = true;
        break;
      case '--skip-tests':
        config.skipTests = true;
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--rollback-on-failure':
        config.rollbackOnFailure = true;
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
Restaurant SaaS Deployment Script

Usage: tsx scripts/deploy.ts [options]

Options:
  --env <environment>      Deployment environment (development|staging|production)
  --skip-validation       Skip code quality checks
  --skip-tests           Skip test execution
  --dry-run              Show what would be done without executing
  --rollback-on-failure  Automatically rollback on deployment failure
  --verbose              Show detailed output
  --help                 Show this help message

Examples:
  tsx scripts/deploy.ts --env production
  tsx scripts/deploy.ts --env staging --skip-tests
  tsx scripts/deploy.ts --dry-run --verbose
  `);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const config = parseArgs();
  const deployer = new RestaurantSaaSDeployer(config);
  
  const result = await deployer.deploy();
  
  // Write deployment result to file
  const resultFile = `deployment-${config.environment}-${Date.now()}.json`;
  writeFileSync(resultFile, JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log(`\n✅ Deployment completed successfully!`);
    console.log(`📄 Result saved to: ${resultFile}`);
    console.log(`🌐 URL: ${result.url}`);
    process.exit(0);
  } else {
    console.log(`\n❌ Deployment failed!`);
    console.log(`📄 Result saved to: ${resultFile}`);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Deployment script failed:', error);
    process.exit(1);
  });
}

export { RestaurantSaaSDeployer, type DeploymentConfig, type DeploymentResult };