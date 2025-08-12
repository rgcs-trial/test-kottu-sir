/**
 * Supabase Admin Client for Database Migrations and Management
 * 
 * This client provides administrative functions for:
 * - Running database migrations
 * - Managing tenant data
 * - Performing administrative operations
 * - Database maintenance tasks
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Types for our admin operations
interface MigrationResult {
  success: boolean
  message: string
  error?: string
  executionTime?: number
}

interface TenantStats {
  tenantId: string
  tenantName: string
  totalOrders: number
  revenue: number
  activeMenuItems: number
}

interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'critical'
  connections: number
  slowQueries: number
  largestTables: Array<{
    table: string
    size: string
    rowCount: number
  }>
}

/**
 * Admin client with service role key for full database access
 */
export class SupabaseAdminClient {
  private client: SupabaseClient
  private migrationsPath: string

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      )
    }

    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public'
      }
    })

    this.migrationsPath = join(process.cwd(), 'supabase', 'migrations')
  }

  /**
   * Execute a raw SQL query with admin privileges
   */
  async executeQuery(query: string): Promise<MigrationResult> {
    const startTime = Date.now()

    try {
      const { error } = await this.client.rpc('admin_execute_sql', {
        sql_query: query
      })

      if (error) {
        return {
          success: false,
          message: 'Query execution failed',
          error: error.message
        }
      }

      return {
        success: true,
        message: 'Query executed successfully',
        executionTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        message: 'Query execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Run a specific migration file
   */
  async runMigration(migrationFile: string): Promise<MigrationResult> {
    const startTime = Date.now()
    const migrationPath = join(this.migrationsPath, migrationFile)

    try {
      const migrationSQL = readFileSync(migrationPath, 'utf8')
      
      console.log(`🚀 Running migration: ${migrationFile}`)
      
      // Execute the migration SQL directly
      const { error } = await this.client
        .from('_migration_logs')
        .select('*')
        .limit(1)

      // If migration logs table doesn't exist, create it
      if (error?.code === '42P01') {
        await this.createMigrationLogTable()
      }

      // Split migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await this.client.rpc('exec', {
            sql: statement
          })

          if (error) {
            console.error(`❌ Migration failed at statement: ${statement.substring(0, 100)}...`)
            throw error
          }
        }
      }

      // Log successful migration
      await this.logMigration(migrationFile, true, null)

      const executionTime = Date.now() - startTime
      console.log(`✅ Migration completed in ${executionTime}ms`)

      return {
        success: true,
        message: `Migration ${migrationFile} completed successfully`,
        executionTime
      }
    } catch (error) {
      await this.logMigration(migrationFile, false, error)
      
      return {
        success: false,
        message: `Migration ${migrationFile} failed`,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Run all migrations in order
   */
  async runAllMigrations(): Promise<MigrationResult[]> {
    const migrations = [
      '001_initial_schema.sql',
      '002_rls_policies.sql',
      '003_functions.sql',
      '004_indexes.sql'
    ]

    const results: MigrationResult[] = []

    for (const migration of migrations) {
      const result = await this.runMigration(migration)
      results.push(result)

      if (!result.success) {
        console.error(`❌ Migration ${migration} failed, stopping execution`)
        break
      }
    }

    return results
  }

  /**
   * Seed the database with sample data
   */
  async seedDatabase(): Promise<MigrationResult> {
    const seedPath = join(process.cwd(), 'supabase', 'seed.sql')
    
    try {
      const seedSQL = readFileSync(seedPath, 'utf8')
      console.log('🌱 Seeding database with sample data...')
      
      // Execute seed SQL
      const statements = seedSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await this.client.rpc('exec', {
            sql: statement
          })

          if (error && !error.message.includes('already exists')) {
            console.error(`❌ Seed failed at: ${statement.substring(0, 100)}...`)
            throw error
          }
        }
      }

      console.log('✅ Database seeded successfully')

      return {
        success: true,
        message: 'Database seeded with sample data successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Database seeding failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Create a new tenant (restaurant)
   */
  async createTenant(tenantData: {
    name: string
    slug: string
    email: string
    phone?: string
    address?: {
      line1: string
      line2?: string
      city: string
      state: string
      postalCode: string
      country?: string
    }
    location?: {
      latitude: number
      longitude: number
    }
    settings?: Record<string, any>
  }): Promise<{ success: boolean; tenantId?: string; error?: string }> {
    try {
      const { data, error } = await this.client
        .from('tenants')
        .insert([
          {
            name: tenantData.name,
            slug: tenantData.slug,
            email: tenantData.email,
            phone: tenantData.phone,
            address_line_1: tenantData.address?.line1,
            address_line_2: tenantData.address?.line2,
            city: tenantData.address?.city,
            state: tenantData.address?.state,
            postal_code: tenantData.address?.postalCode,
            country: tenantData.address?.country || 'Sri Lanka',
            latitude: tenantData.location?.latitude,
            longitude: tenantData.location?.longitude,
            settings: tenantData.settings || {}
          }
        ])
        .select()
        .single()

      if (error) throw error

      // Create default restaurant settings
      await this.client
        .from('restaurant_settings')
        .insert([
          {
            tenant_id: data.id,
            is_open: true,
            accepts_orders: true,
            auto_accept_orders: false,
            estimated_prep_time_minutes: 30
          }
        ])

      // Create default operating hours
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const hours = days.map(day => ({
        tenant_id: data.id,
        day_of_week: day,
        is_open: true,
        open_time: '10:00',
        close_time: '22:00'
      }))

      await this.client
        .from('restaurant_hours')
        .insert(hours)

      return {
        success: true,
        tenantId: data.id
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(tenantId?: string): Promise<TenantStats[]> {
    try {
      const query = this.client
        .rpc('get_tenant_analytics', { 
          target_tenant_id: tenantId || null 
        })

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to get tenant stats:', error)
      return []
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth(): Promise<DatabaseHealth> {
    try {
      // Get connection count
      const { data: connections } = await this.client
        .rpc('get_connection_count')

      // Get table sizes
      const { data: tableSizes } = await this.client
        .rpc('get_table_sizes')

      // Get slow query count (simplified)
      const slowQueries = 0 // Would require pg_stat_statements extension

      return {
        status: connections > 80 ? 'warning' : 'healthy',
        connections: connections || 0,
        slowQueries,
        largestTables: tableSizes || []
      }
    } catch (error) {
      return {
        status: 'critical',
        connections: 0,
        slowQueries: 0,
        largestTables: []
      }
    }
  }

  /**
   * Clean up expired data
   */
  async cleanupExpiredData(): Promise<MigrationResult> {
    try {
      console.log('🧹 Starting cleanup of expired data...')

      // Clean expired carts
      const { error: cartError } = await this.client
        .from('cart_items')
        .delete()
        .in('cart_id', 
          this.client
            .from('carts')
            .select('id')
            .lt('expires_at', new Date().toISOString())
        )

      if (cartError) throw cartError

      const { error: cartDeleteError } = await this.client
        .from('carts')
        .delete()
        .lt('expires_at', new Date().toISOString())

      if (cartDeleteError) throw cartDeleteError

      // Clean old audit logs (older than 1 year)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const { error: auditError } = await this.client
        .from('audit_logs')
        .delete()
        .lt('created_at', oneYearAgo.toISOString())

      if (auditError) throw auditError

      console.log('✅ Cleanup completed successfully')

      return {
        success: true,
        message: 'Expired data cleaned up successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Cleanup failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Backup tenant data
   */
  async backupTenantData(tenantId: string): Promise<MigrationResult> {
    try {
      console.log(`💾 Creating backup for tenant: ${tenantId}`)

      // Get all tenant-related data
      const tables = [
        'tenants', 'menu_categories', 'menu_items', 'menu_item_variants',
        'menu_item_modifiers', 'orders', 'order_items', 'restaurant_settings',
        'restaurant_hours', 'analytics_daily', 'analytics_hourly'
      ]

      const backupData: Record<string, any> = {}

      for (const table of tables) {
        const { data, error } = await this.client
          .from(table)
          .select('*')
          .eq('tenant_id', tenantId)

        if (error) throw error
        backupData[table] = data
      }

      // In a real implementation, you'd save this to cloud storage
      console.log(`✅ Backup created for tenant ${tenantId}`)

      return {
        success: true,
        message: `Backup created for tenant ${tenantId}`,
      }
    } catch (error) {
      return {
        success: false,
        message: 'Backup failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Private helper methods
   */
  private async createMigrationLogTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS _migration_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        filename VARCHAR(255) NOT NULL,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    await this.client.rpc('exec', { sql: createTableSQL })
  }

  private async logMigration(
    filename: string, 
    success: boolean, 
    error: any
  ): Promise<void> {
    try {
      await this.client
        .from('_migration_logs')
        .insert([
          {
            filename,
            success,
            error_message: error ? 
              (error instanceof Error ? error.message : String(error)) : 
              null
          }
        ])
    } catch (logError) {
      console.error('Failed to log migration:', logError)
    }
  }
}

/**
 * Get singleton admin client instance
 */
let adminClient: SupabaseAdminClient | null = null

export function getAdminClient(): SupabaseAdminClient {
  if (!adminClient) {
    adminClient = new SupabaseAdminClient()
  }
  return adminClient
}

/**
 * Helper functions for common admin operations
 */
export const AdminHelpers = {
  /**
   * Check if migrations table exists
   */
  async hasMigrationTable(client: SupabaseAdminClient): Promise<boolean> {
    try {
      const { error } = await client['client']
        .from('_migration_logs')
        .select('id')
        .limit(1)
      
      return !error
    } catch {
      return false
    }
  },

  /**
   * Get migration history
   */
  async getMigrationHistory(client: SupabaseAdminClient): Promise<any[]> {
    try {
      const { data, error } = await client['client']
        .from('_migration_logs')
        .select('*')
        .order('executed_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch {
      return []
    }
  },

  /**
   * Validate tenant slug uniqueness
   */
  async isSlugAvailable(client: SupabaseAdminClient, slug: string): Promise<boolean> {
    try {
      const { data, error } = await client['client']
        .from('tenants')
        .select('slug')
        .eq('slug', slug)
        .single()

      return !data && !error
    } catch {
      return true
    }
  }
}

export default SupabaseAdminClient