#!/usr/bin/env tsx

/**
 * Database Setup Script for Restaurant SaaS Platform
 * 
 * This script handles:
 * - Running database migrations in order
 * - Seeding database with sample data
 * - Setting up required functions and policies
 * - Validating database health
 * - Creating admin users and tenants
 */

import { config } from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { getAdminClient, AdminHelpers } from '../lib/supabase/admin'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })
config() // Load .env as fallback

interface SetupOptions {
  runMigrations: boolean
  seedData: boolean
  force: boolean
  verbose: boolean
  migrationsOnly: boolean
  cleanup: boolean
}

interface SetupResult {
  success: boolean
  steps: Array<{
    step: string
    success: boolean
    message: string
    duration?: number
  }>
  totalDuration: number
}

/**
 * Main setup class
 */
class DatabaseSetup {
  private adminClient: any
  private verbose: boolean = false

  constructor(verbose: boolean = false) {
    this.verbose = verbose
    this.log('🚀 Initializing Database Setup...')
    
    try {
      this.adminClient = getAdminClient()
      this.log('✅ Admin client initialized')
    } catch (error) {
      throw new Error(`Failed to initialize admin client: ${error}`)
    }
  }

  /**
   * Run the complete database setup
   */
  async setup(options: SetupOptions): Promise<SetupResult> {
    const startTime = Date.now()
    const steps: SetupResult['steps'] = []

    this.log('🎯 Starting database setup with options:', JSON.stringify(options, null, 2))

    try {
      // Step 1: Validate environment
      const envStep = await this.validateEnvironment()
      steps.push(envStep)
      if (!envStep.success) {
        return { success: false, steps, totalDuration: Date.now() - startTime }
      }

      // Step 2: Test database connection
      const connectionStep = await this.testConnection()
      steps.push(connectionStep)
      if (!connectionStep.success) {
        return { success: false, steps, totalDuration: Date.now() - startTime }
      }

      // Step 3: Cleanup if requested
      if (options.cleanup) {
        const cleanupStep = await this.cleanupDatabase()
        steps.push(cleanupStep)
      }

      // Step 4: Run migrations
      if (options.runMigrations) {
        const migrationsStep = await this.runMigrations(options.force)
        steps.push(migrationsStep)
        if (!migrationsStep.success && !options.force) {
          return { success: false, steps, totalDuration: Date.now() - startTime }
        }
      }

      // Step 5: Setup required SQL functions for admin operations
      const functionsStep = await this.setupAdminFunctions()
      steps.push(functionsStep)

      // Step 6: Seed database with sample data
      if (options.seedData && !options.migrationsOnly) {
        const seedStep = await this.seedDatabase()
        steps.push(seedStep)
      }

      // Step 7: Validate setup
      const validationStep = await this.validateSetup()
      steps.push(validationStep)

      const totalDuration = Date.now() - startTime
      const allSuccessful = steps.every(step => step.success)

      if (allSuccessful) {
        this.log('🎉 Database setup completed successfully!')
        this.log(`⏱️  Total setup time: ${totalDuration}ms`)
      } else {
        this.log('❌ Database setup failed - check individual steps above')
      }

      return {
        success: allSuccessful,
        steps,
        totalDuration
      }

    } catch (error) {
      steps.push({
        step: 'Setup',
        success: false,
        message: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      return {
        success: false,
        steps,
        totalDuration: Date.now() - startTime
      }
    }
  }

  /**
   * Validate environment variables
   */
  private async validateEnvironment(): Promise<SetupResult['steps'][0]> {
    const stepStart = Date.now()
    this.log('🔍 Validating environment variables...')

    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    const missing = required.filter(key => !process.env[key])

    if (missing.length > 0) {
      return {
        step: 'Environment Validation',
        success: false,
        message: `Missing required environment variables: ${missing.join(', ')}`,
        duration: Date.now() - stepStart
      }
    }

    this.log('✅ Environment variables validated')
    return {
      step: 'Environment Validation',
      success: true,
      message: 'All required environment variables present',
      duration: Date.now() - stepStart
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<SetupResult['steps'][0]> {
    const stepStart = Date.now()
    this.log('🔗 Testing database connection...')

    try {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { error } = await client
        .from('information_schema.tables')
        .select('table_name')
        .limit(1)

      if (error) throw error

      this.log('✅ Database connection successful')
      return {
        step: 'Connection Test',
        success: true,
        message: 'Database connection established successfully',
        duration: Date.now() - stepStart
      }
    } catch (error) {
      return {
        step: 'Connection Test',
        success: false,
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - stepStart
      }
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(force: boolean): Promise<SetupResult['steps'][0]> {
    const stepStart = Date.now()
    this.log('📦 Running database migrations...')

    try {
      // Check if migrations have already been run
      const hasTable = await AdminHelpers.hasMigrationTable(this.adminClient)
      
      if (hasTable && !force) {
        const history = await AdminHelpers.getMigrationHistory(this.adminClient)
        if (history.length > 0) {
          this.log('ℹ️  Migrations already exist, use --force to re-run')
          return {
            step: 'Database Migrations',
            success: true,
            message: 'Migrations already exist (use --force to override)',
            duration: Date.now() - stepStart
          }
        }
      }

      const results = await this.adminClient.runAllMigrations()
      const allSuccess = results.every((r: any) => r.success)

      if (allSuccess) {
        this.log('✅ All migrations completed successfully')
        return {
          step: 'Database Migrations',
          success: true,
          message: `${results.length} migrations completed successfully`,
          duration: Date.now() - stepStart
        }
      } else {
        const failed = results.filter((r: any) => !r.success)
        return {
          step: 'Database Migrations',
          success: false,
          message: `${failed.length} migrations failed`,
          duration: Date.now() - stepStart
        }
      }
    } catch (error) {
      return {
        step: 'Database Migrations',
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - stepStart
      }
    }
  }

  /**
   * Setup admin functions required for operations
   */
  private async setupAdminFunctions(): Promise<SetupResult['steps'][0]> {
    const stepStart = Date.now()
    this.log('⚙️  Setting up admin functions...')

    try {
      // SQL functions needed for admin operations
      const adminFunctions = `
        -- Function to execute arbitrary SQL (for migrations)
        CREATE OR REPLACE FUNCTION exec(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;

        -- Function to get connection count
        CREATE OR REPLACE FUNCTION get_connection_count()
        RETURNS integer
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          SELECT count(*)::integer FROM pg_stat_activity WHERE state = 'active';
        $$;

        -- Function to get table sizes
        CREATE OR REPLACE FUNCTION get_table_sizes()
        RETURNS TABLE (
          table_name text,
          size text,
          row_count bigint
        )
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          SELECT 
            schemaname||'.'||tablename as table_name,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            n_tup_ins - n_tup_del as row_count
          FROM pg_tables t
          LEFT JOIN pg_stat_user_tables s ON s.relname = t.tablename
          WHERE schemaname = 'public'
          ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
          LIMIT 10;
        $$;

        -- Function to get tenant analytics
        CREATE OR REPLACE FUNCTION get_tenant_analytics(target_tenant_id uuid DEFAULT NULL)
        RETURNS TABLE (
          tenant_id uuid,
          tenant_name text,
          total_orders bigint,
          revenue numeric,
          active_menu_items bigint
        )
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          SELECT 
            t.id as tenant_id,
            t.name as tenant_name,
            COALESCE(order_stats.total_orders, 0) as total_orders,
            COALESCE(order_stats.revenue, 0) as revenue,
            COALESCE(menu_stats.active_items, 0) as active_menu_items
          FROM tenants t
          LEFT JOIN (
            SELECT 
              tenant_id,
              COUNT(*) as total_orders,
              SUM(total_amount) as revenue
            FROM orders
            WHERE status NOT IN ('cancelled', 'refunded')
            AND (target_tenant_id IS NULL OR tenant_id = target_tenant_id)
            GROUP BY tenant_id
          ) order_stats ON order_stats.tenant_id = t.id
          LEFT JOIN (
            SELECT 
              tenant_id,
              COUNT(*) as active_items
            FROM menu_items
            WHERE is_available = true AND deleted_at IS NULL
            GROUP BY tenant_id
          ) menu_stats ON menu_stats.tenant_id = t.id
          WHERE target_tenant_id IS NULL OR t.id = target_tenant_id;
        $$;
      `

      const result = await this.adminClient.executeQuery(adminFunctions)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      this.log('✅ Admin functions setup completed')
      return {
        step: 'Admin Functions',
        success: true,
        message: 'Admin functions created successfully',
        duration: Date.now() - stepStart
      }
    } catch (error) {
      return {
        step: 'Admin Functions',
        success: false,
        message: `Admin functions setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - stepStart
      }
    }
  }

  /**
   * Seed database with sample data
   */
  private async seedDatabase(): Promise<SetupResult['steps'][0]> {
    const stepStart = Date.now()
    this.log('🌱 Seeding database with sample data...')

    try {
      const result = await this.adminClient.seedDatabase()
      
      if (result.success) {
        this.log('✅ Database seeded successfully')
        return {
          step: 'Database Seeding',
          success: true,
          message: 'Sample data inserted successfully',
          duration: Date.now() - stepStart
        }
      } else {
        return {
          step: 'Database Seeding',
          success: false,
          message: result.error || 'Seeding failed',
          duration: Date.now() - stepStart
        }
      }
    } catch (error) {
      return {
        step: 'Database Seeding',
        success: false,
        message: `Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - stepStart
      }
    }
  }

  /**
   * Clean up database (remove all data)
   */
  private async cleanupDatabase(): Promise<SetupResult['steps'][0]> {
    const stepStart = Date.now()
    this.log('🧹 Cleaning up database...')

    try {
      const result = await this.adminClient.cleanupExpiredData()
      
      return {
        step: 'Database Cleanup',
        success: result.success,
        message: result.message,
        duration: Date.now() - stepStart
      }
    } catch (error) {
      return {
        step: 'Database Cleanup',
        success: false,
        message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - stepStart
      }
    }
  }

  /**
   * Validate the setup was successful
   */
  private async validateSetup(): Promise<SetupResult['steps'][0]> {
    const stepStart = Date.now()
    this.log('✅ Validating database setup...')

    try {
      const health = await this.adminClient.checkDatabaseHealth()
      
      if (health.status === 'critical') {
        return {
          step: 'Setup Validation',
          success: false,
          message: 'Database health check failed',
          duration: Date.now() - stepStart
        }
      }

      // Check if we have sample data
      const stats = await this.adminClient.getTenantStats()
      
      this.log(`📊 Found ${stats.length} tenants in database`)
      this.log(`🏥 Database health: ${health.status}`)
      this.log(`🔗 Active connections: ${health.connections}`)

      return {
        step: 'Setup Validation',
        success: true,
        message: `Setup validated - ${stats.length} tenants, health: ${health.status}`,
        duration: Date.now() - stepStart
      }
    } catch (error) {
      return {
        step: 'Setup Validation',
        success: false,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - stepStart
      }
    }
  }

  /**
   * Log with timestamp
   */
  private log(message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${message}`)
    if (data && this.verbose) {
      console.log(JSON.stringify(data, null, 2))
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): SetupOptions {
  const args = process.argv.slice(2)
  
  return {
    runMigrations: !args.includes('--no-migrations'),
    seedData: !args.includes('--no-seed'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose'),
    migrationsOnly: args.includes('--migrations-only'),
    cleanup: args.includes('--cleanup')
  }
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
🚀 Restaurant SaaS Database Setup Script

Usage: tsx scripts/setup-database.ts [options]

Options:
  --no-migrations     Skip running migrations
  --no-seed          Skip seeding with sample data
  --migrations-only  Run migrations only (no seeding)
  --force            Force re-run migrations even if they exist
  --cleanup          Clean up expired data before setup
  --verbose          Enable verbose logging
  --help             Show this help message

Examples:
  tsx scripts/setup-database.ts                    # Full setup
  tsx scripts/setup-database.ts --no-seed         # Setup without sample data
  tsx scripts/setup-database.ts --migrations-only # Migrations only
  tsx scripts/setup-database.ts --force           # Force re-run everything
  tsx scripts/setup-database.ts --cleanup         # Clean up then setup

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL      # Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY     # Your Supabase service role key

`)
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2)
    
    if (args.includes('--help')) {
      showHelp()
      process.exit(0)
    }

    const options = parseArgs()
    const setup = new DatabaseSetup(options.verbose)
    
    console.log('🎯 Restaurant SaaS Database Setup')
    console.log('==================================')
    
    const result = await setup.setup(options)
    
    console.log('\n📊 Setup Summary:')
    console.log('================')
    
    result.steps.forEach((step, index) => {
      const status = step.success ? '✅' : '❌'
      const duration = step.duration ? ` (${step.duration}ms)` : ''
      console.log(`${index + 1}. ${status} ${step.step}${duration}`)
      console.log(`   ${step.message}`)
    })
    
    console.log(`\n⏱️  Total time: ${result.totalDuration}ms`)
    console.log(`🎯 Overall result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`)

    if (!result.success) {
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Setup script failed:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main()
}

export { DatabaseSetup, parseArgs, showHelp }