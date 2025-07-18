// backend/scripts/run-h1b-migration.js
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class DatabaseMigrator {
  constructor() {
    this.migrationPath = path.join(__dirname, '..', 'migrations');
  }

  async runMigration() {
    let client;
    
    try {
      client = await pool.connect();
      console.log('✅ Connected to PostgreSQL for migration');

      // Check if migration has already been run
      const migrationCheck = await this.checkMigrationStatus(client);
      
      if (migrationCheck.hasH1BColumns) {
        console.log('⚠️ H1B columns already exist. Checking if they need updates...');
        await this.updateExistingMigration(client);
      } else {
        console.log('🚀 Running H1B flag migration...');
        await this.runFullMigration(client);
      }

      // Verify migration success
      await this.verifyMigration(client);
      
      console.log('✅ H1B flag migration completed successfully!');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async checkMigrationStatus(client) {
    try {
      console.log('🔍 Checking current migration status...');

      // Check if H1B columns exist
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
          AND column_name IN ('is_h1b_sponsor', 'h1b_flag_updated_at', 'h1b_matched_company_id')
      `);

      const existingColumns = columnCheck.rows.map(row => row.column_name);
      
      // Check if indexes exist
      const indexCheck = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'companies' 
          AND indexname IN ('idx_companies_h1b_sponsor', 'idx_companies_h1b_industry', 'idx_companies_h1b_updated')
      `);

      const existingIndexes = indexCheck.rows.map(row => row.indexname);

      const status = {
        hasH1BColumns: existingColumns.length > 0,
        existingColumns: existingColumns,
        existingIndexes: existingIndexes,
        needsUpdate: existingColumns.length > 0 && existingColumns.length < 3
      };

      console.log(`📊 Migration Status:`, status);
      return status;

    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      throw error;
    }
  }

  async runFullMigration(client) {
    try {
      console.log('📝 Adding H1B columns to companies table...');

      // Begin transaction
      await client.query('BEGIN');

      // Add the is_h1b_sponsor column
      await client.query(`
        ALTER TABLE companies 
        ADD COLUMN IF NOT EXISTS is_h1b_sponsor BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added is_h1b_sponsor column');

      // Add metadata columns
      await client.query(`
        ALTER TABLE companies 
        ADD COLUMN IF NOT EXISTS h1b_flag_updated_at TIMESTAMP
      `);
      console.log('✅ Added h1b_flag_updated_at column');

      await client.query(`
        ALTER TABLE companies 
        ADD COLUMN IF NOT EXISTS h1b_matched_company_id VARCHAR(24)
      `);
      console.log('✅ Added h1b_matched_company_id column');

      // Create indexes
      console.log('📝 Creating H1B indexes...');

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_companies_h1b_sponsor 
        ON companies(is_h1b_sponsor)
      `);
      console.log('✅ Created H1B sponsor index');

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_companies_h1b_industry 
        ON companies(is_h1b_sponsor, industry_id)
      `);
      console.log('✅ Created H1B industry compound index');

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_companies_h1b_updated 
        ON companies(h1b_flag_updated_at)
      `);
      console.log('✅ Created H1B update tracking index');

      // Add column comments
      await client.query(`
        COMMENT ON COLUMN companies.is_h1b_sponsor 
        IS 'Boolean flag indicating if company sponsors H1B visas based on government data'
      `);

      await client.query(`
        COMMENT ON COLUMN companies.h1b_flag_updated_at 
        IS 'Timestamp when H1B flag was last updated'
      `);

      await client.query(`
        COMMENT ON COLUMN companies.h1b_matched_company_id 
        IS 'Reference to MongoDB H1B company document that matched this company'
      `);

      // Commit transaction
      await client.query('COMMIT');
      console.log('✅ Full migration completed successfully');

    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('❌ Migration failed, rolling back:', error);
      throw error;
    }
  }

  async updateExistingMigration(client) {
    try {
      console.log('🔄 Updating existing H1B migration...');

      // Check what's missing and add it
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
          AND column_name IN ('is_h1b_sponsor', 'h1b_flag_updated_at', 'h1b_matched_company_id')
      `);

      const existingColumns = new Set(columnCheck.rows.map(row => row.column_name));

      await client.query('BEGIN');

      if (!existingColumns.has('is_h1b_sponsor')) {
        await client.query(`
          ALTER TABLE companies 
          ADD COLUMN is_h1b_sponsor BOOLEAN DEFAULT FALSE
        `);
        console.log('✅ Added missing is_h1b_sponsor column');
      }

      if (!existingColumns.has('h1b_flag_updated_at')) {
        await client.query(`
          ALTER TABLE companies 
          ADD COLUMN h1b_flag_updated_at TIMESTAMP
        `);
        console.log('✅ Added missing h1b_flag_updated_at column');
      }

      if (!existingColumns.has('h1b_matched_company_id')) {
        await client.query(`
          ALTER TABLE companies 
          ADD COLUMN h1b_matched_company_id VARCHAR(24)
        `);
        console.log('✅ Added missing h1b_matched_company_id column');
      }

      // Create missing indexes
      const indexQueries = [
        {
          name: 'idx_companies_h1b_sponsor',
          query: 'CREATE INDEX IF NOT EXISTS idx_companies_h1b_sponsor ON companies(is_h1b_sponsor)'
        },
        {
          name: 'idx_companies_h1b_industry',
          query: 'CREATE INDEX IF NOT EXISTS idx_companies_h1b_industry ON companies(is_h1b_sponsor, industry_id)'
        },
        {
          name: 'idx_companies_h1b_updated',
          query: 'CREATE INDEX IF NOT EXISTS idx_companies_h1b_updated ON companies(h1b_flag_updated_at)'
        }
      ];

      for (const index of indexQueries) {
        try {
          await client.query(index.query);
          console.log(`✅ Created/verified index: ${index.name}`);
        } catch (indexError) {
          console.log(`⚠️ Index ${index.name} might already exist: ${indexError.message}`);
        }
      }

      await client.query('COMMIT');
      console.log('✅ Migration update completed');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Migration update failed:', error);
      throw error;
    }
  }

  async verifyMigration(client) {
    try {
      console.log('🔍 Verifying migration results...');

      // Check columns
      const columnCheck = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
          AND column_name IN ('is_h1b_sponsor', 'h1b_flag_updated_at', 'h1b_matched_company_id')
        ORDER BY column_name
      `);

      console.log('📊 H1B Columns:');
      columnCheck.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
      });

      // Check indexes
      const indexCheck = await client.query(`
        SELECT 
          indexname, 
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'companies' 
          AND indexname LIKE '%h1b%'
        ORDER BY indexname
      `);

      console.log('📊 H1B Indexes:');
      indexCheck.rows.forEach(idx => {
        console.log(`  ${idx.indexname}: ${idx.indexdef}`);
      });

      // Check sample data
      const sampleCheck = await client.query(`
        SELECT 
          COUNT(*) as total_companies,
          COUNT(CASE WHEN is_h1b_sponsor = TRUE THEN 1 END) as h1b_companies,
          COUNT(CASE WHEN h1b_flag_updated_at IS NOT NULL THEN 1 END) as updated_companies
        FROM companies
      `);

      const stats = sampleCheck.rows[0];
      console.log('📊 Current H1B Statistics:');
      console.log(`  Total Companies: ${stats.total_companies}`);
      console.log(`  H1B Companies: ${stats.h1b_companies}`);
      console.log(`  Updated Companies: ${stats.updated_companies}`);

      // Verify the migration is ready for use
      if (columnCheck.rows.length !== 3) {
        throw new Error('Migration verification failed: Not all H1B columns were created');
      }

      if (indexCheck.rows.length < 3) {
        console.log('⚠️ Warning: Some H1B indexes may be missing, but migration can proceed');
      }

      console.log('✅ Migration verification passed');

    } catch (error) {
      console.error('❌ Migration verification failed:', error);
      throw error;
    }
  }

  async showMigrationStatus() {
    let client;
    
    try {
      client = await pool.connect();
      console.log('📊 H1B MIGRATION STATUS');
      console.log('='.repeat(40));

      const status = await this.checkMigrationStatus(client);
      
      if (status.hasH1BColumns) {
        console.log('✅ H1B migration has been applied');
        console.log(`📝 Existing columns: ${status.existingColumns.join(', ')}`);
        console.log(`📚 Existing indexes: ${status.existingIndexes.join(', ')}`);
        
        if (status.needsUpdate) {
          console.log('⚠️ Migration needs updates (missing some columns)');
        } else {
          console.log('✅ Migration is complete');
        }
      } else {
        console.log('❌ H1B migration has not been applied');
        console.log('💡 Run: node run-h1b-migration.js migrate');
      }

      await this.verifyMigration(client);

    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async cleanup() {
    try {
      await pool.end();
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  const migrator = new DatabaseMigrator();

  try {
    switch (command) {
      case 'migrate':
        await migrator.runMigration();
        break;
        
      case 'status':
        await migrator.showMigrationStatus();
        break;
        
      case 'verify':
        const client = await pool.connect();
        await migrator.verifyMigration(client);
        client.release();
        break;
        
      case 'help':
        console.log(`
H1B Migration Runner
====================

Usage: node run-h1b-migration.js [command]

Commands:
  migrate    Run the H1B flag migration
  status     Show current migration status
  verify     Verify migration completeness
  help       Show this help message

Examples:
  node run-h1b-migration.js migrate
  node run-h1b-migration.js status
        `);
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Use "node run-h1b-migration.js help" for usage information');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  } finally {
    await migrator.cleanup();
  }
}

// Export for use in other scripts
module.exports = DatabaseMigrator;

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}