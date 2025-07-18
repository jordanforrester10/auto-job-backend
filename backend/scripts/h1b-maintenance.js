// backend/scripts/h1b-maintenance.js
const mongoose = require('mongoose');
const { Pool } = require('pg');
const H1BCompany = require('../models/mongodb/h1bCompany.model');
const H1BFlagUpdater = require('./update-h1b-flags');
require('dotenv').config();

// Database connections
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class H1BMaintenanceService {
  constructor() {
    this.maintenanceLog = [];
  }

  async connectDatabases() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ MongoDB connected for maintenance');

      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ PostgreSQL connected for maintenance');

    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Check if H1B flags need updating
   */
  async checkMaintenanceNeeds() {
    try {
      console.log('🔍 Checking H1B maintenance needs...');

      // Check last update time
      const lastUpdateQuery = `
        SELECT 
          MAX(h1b_flag_updated_at) as last_update,
          COUNT(*) as total_companies,
          COUNT(CASE WHEN is_h1b_sponsor = TRUE THEN 1 END) as h1b_companies,
          COUNT(CASE WHEN h1b_matched_company_id IS NOT NULL THEN 1 END) as matched_companies
        FROM companies
      `;

      const result = await pool.query(lastUpdateQuery);
      const stats = result.rows[0];

      const lastUpdate = stats.last_update ? new Date(stats.last_update) : null;
      const now = new Date();
      const daysSinceUpdate = lastUpdate ? 
        Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24)) : 
        Infinity;

      // Check MongoDB H1B companies count
      const mongoH1BCount = await H1BCompany.countDocuments({
        'h1bData.isActive': true,
        isActive: true
      });

      const maintenanceNeeds = {
        lastUpdate: lastUpdate,
        daysSinceUpdate: daysSinceUpdate,
        needsUpdate: false,
        reasons: [],
        stats: {
          totalCompanies: parseInt(stats.total_companies),
          h1bCompanies: parseInt(stats.h1b_companies),
          matchedCompanies: parseInt(stats.matched_companies),
          mongoH1BCount: mongoH1BCount
        }
      };

      // Determine if update is needed
      if (daysSinceUpdate >= 30) {
        maintenanceNeeds.needsUpdate = true;
        maintenanceNeeds.reasons.push('Monthly maintenance due');
      }

      if (!lastUpdate) {
        maintenanceNeeds.needsUpdate = true;
        maintenanceNeeds.reasons.push('No previous H1B flag updates found');
      }

      if (stats.h1b_companies === 0 && mongoH1BCount > 0) {
        maintenanceNeeds.needsUpdate = true;
        maintenanceNeeds.reasons.push('No H1B flags set but MongoDB has H1B companies');
      }

      const matchRate = stats.total_companies > 0 ? 
        (stats.matched_companies / stats.total_companies) * 100 : 0;

      if (matchRate < 5 && mongoH1BCount > 1000) {
        maintenanceNeeds.needsUpdate = true;
        maintenanceNeeds.reasons.push('Low match rate suggests incomplete flagging');
      }

      console.log(`📊 Maintenance Check Results:`);
      console.log(`  Last Update: ${lastUpdate || 'Never'}`);
      console.log(`  Days Since Update: ${daysSinceUpdate}`);
      console.log(`  Needs Update: ${maintenanceNeeds.needsUpdate}`);
      console.log(`  Reasons: ${maintenanceNeeds.reasons.join(', ')}`);

      return maintenanceNeeds;

    } catch (error) {
      console.error('❌ Error checking maintenance needs:', error);
      throw error;
    }
  }

  /**
   * Perform incremental H1B flag updates
   */
  async performIncrementalUpdate() {
    try {
      console.log('🔄 Starting incremental H1B flag update...');

      // Find companies that haven't been checked recently
      const staleCompaniesQuery = `
        SELECT id, name, website, h1b_flag_updated_at
        FROM companies 
        WHERE (h1b_flag_updated_at IS NULL OR h1b_flag_updated_at < NOW() - INTERVAL '30 days')
          AND name IS NOT NULL 
          AND name != ''
        ORDER BY h1b_flag_updated_at ASC NULLS FIRST
        LIMIT 1000
      `;

      const staleResult = await pool.query(staleCompaniesQuery);
      const staleCompanies = staleResult.rows;

      if (staleCompanies.length === 0) {
        console.log('✅ No stale companies found - all flags are up to date');
        return { updated: 0, message: 'All flags up to date' };
      }

      console.log(`📦 Found ${staleCompanies.length} companies needing flag updates`);

      // Get H1B companies for matching
      const h1bCompanies = await H1BCompany.find(
        { 
          'h1bData.isActive': true, 
          isActive: true,
          companyName: { $exists: true, $ne: null, $ne: '' }
        },
        { 
          companyName: 1, 
          searchableNames: 1, 
          _id: 1 
        }
      ).lean();

      const companyMatchingService = require('../services/companyMatching.service');
      const lookupTable = companyMatchingService.createLookupTable(h1bCompanies);

      let updated = 0;
      const threshold = 0.85;

      for (const company of staleCompanies) {
        try {
          // Fast lookup for matches
          const candidates = companyMatchingService.fastLookup(company.name, lookupTable);
          
          let isH1BSponsor = false;
          let matchedCompanyId = null;

          if (candidates.length > 0) {
            const match = companyMatchingService.findBestMatch(
              company.name, 
              candidates, 
              threshold
            );

            if (match) {
              isH1BSponsor = true;
              matchedCompanyId = match.company._id.toString();
              console.log(`✅ Match: "${company.name}" → "${match.company.companyName}"`);
            }
          }

          // Update the flag
          const updateQuery = `
            UPDATE companies 
            SET is_h1b_sponsor = $1,
                h1b_flag_updated_at = NOW(),
                h1b_matched_company_id = $2
            WHERE id = $3
          `;

          await pool.query(updateQuery, [isH1BSponsor, matchedCompanyId, company.id]);
          updated++;

          if (updated % 100 === 0) {
            console.log(`📊 Progress: ${updated}/${staleCompanies.length}`);
          }

        } catch (error) {
          console.error(`❌ Error processing company ${company.name}:`, error.message);
        }
      }

      console.log(`✅ Incremental update complete: ${updated} companies processed`);
      return { updated, total: staleCompanies.length };

    } catch (error) {
      console.error('❌ Error in incremental update:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned flags
   */
  async cleanupOrphanedFlags() {
    try {
      console.log('🧹 Cleaning up orphaned H1B flags...');

      // Find companies with H1B flags but invalid matched company IDs
      const orphanedQuery = `
        SELECT id, name, h1b_matched_company_id
        FROM companies 
        WHERE is_h1b_sponsor = TRUE 
          AND h1b_matched_company_id IS NOT NULL
      `;

      const orphanedResult = await pool.query(orphanedQuery);
      const flaggedCompanies = orphanedResult.rows;

      if (flaggedCompanies.length === 0) {
        console.log('✅ No flagged companies to validate');
        return { cleaned: 0 };
      }

      console.log(`🔍 Validating ${flaggedCompanies.length} H1B flagged companies...`);

      let cleaned = 0;
      const batchSize = 100;

      for (let i = 0; i < flaggedCompanies.length; i += batchSize) {
        const batch = flaggedCompanies.slice(i, i + batchSize);
        const mongoIds = batch.map(c => c.h1b_matched_company_id).filter(id => id);

        if (mongoIds.length === 0) continue;

        // Check which MongoDB H1B companies still exist
        const existingH1BCompanies = await H1BCompany.find(
          { 
            _id: { $in: mongoIds },
            'h1bData.isActive': true,
            isActive: true
          },
          { _id: 1 }
        ).lean();

        const existingIds = new Set(existingH1BCompanies.map(c => c._id.toString()));

        // Find orphaned entries
        const orphanedInBatch = batch.filter(company => 
          company.h1b_matched_company_id && 
          !existingIds.has(company.h1b_matched_company_id)
        );

        if (orphanedInBatch.length > 0) {
          console.log(`🧹 Found ${orphanedInBatch.length} orphaned flags in batch`);

          // Reset orphaned flags
          const orphanedIds = orphanedInBatch.map(c => c.id);
          const cleanupQuery = `
            UPDATE companies 
            SET is_h1b_sponsor = FALSE,
                h1b_matched_company_id = NULL,
                h1b_flag_updated_at = NOW()
            WHERE id = ANY($1)
          `;

          await pool.query(cleanupQuery, [orphanedIds]);
          cleaned += orphanedIds.length;

          for (const company of orphanedInBatch) {
            console.log(`🧹 Cleaned orphaned flag: ${company.name}`);
          }
        }
      }

      console.log(`✅ Cleanup complete: ${cleaned} orphaned flags removed`);
      return { cleaned };

    } catch (error) {
      console.error('❌ Error in cleanup:', error);
      throw error;
    }
  }

  /**
   * Generate maintenance report
   */
  async generateMaintenanceReport() {
    try {
      console.log('📊 Generating H1B maintenance report...');

      const reportQuery = `
        SELECT 
          COUNT(*) as total_companies,
          COUNT(CASE WHEN is_h1b_sponsor = TRUE THEN 1 END) as h1b_companies,
          COUNT(CASE WHEN h1b_matched_company_id IS NOT NULL THEN 1 END) as matched_companies,
          COUNT(CASE WHEN h1b_flag_updated_at IS NULL THEN 1 END) as never_updated,
          COUNT(CASE WHEN h1b_flag_updated_at < NOW() - INTERVAL '30 days' THEN 1 END) as stale_flags,
          MAX(h1b_flag_updated_at) as last_update,
          MIN(h1b_flag_updated_at) as first_update
        FROM companies
      `;

      const result = await pool.query(reportQuery);
      const stats = result.rows[0];

      // Get MongoDB stats
      const mongoH1BCount = await H1BCompany.countDocuments({
        'h1bData.isActive': true,
        isActive: true
      });

      const report = {
        timestamp: new Date().toISOString(),
        postgresql: {
          totalCompanies: parseInt(stats.total_companies),
          h1bCompanies: parseInt(stats.h1b_companies),
          matchedCompanies: parseInt(stats.matched_companies),
          neverUpdated: parseInt(stats.never_updated),
          staleFlags: parseInt(stats.stale_flags),
          lastUpdate: stats.last_update,
          firstUpdate: stats.first_update
        },
        mongodb: {
          h1bCompanies: mongoH1BCount
        },
        metrics: {
          h1bCoverage: stats.total_companies > 0 ? 
            ((stats.h1b_companies / stats.total_companies) * 100).toFixed(2) + '%' : '0%',
          matchRate: stats.total_companies > 0 ? 
            ((stats.matched_companies / stats.total_companies) * 100).toFixed(2) + '%' : '0%',
          dataIntegrity: stats.h1b_companies > 0 ? 
            ((stats.matched_companies / stats.h1b_companies) * 100).toFixed(2) + '%' : '100%'
        },
        recommendations: []
      };

      // Add recommendations
      if (report.postgresql.neverUpdated > 0) {
        report.recommendations.push(`Run full update for ${report.postgresql.neverUpdated} companies that have never been processed`);
      }

      if (report.postgresql.staleFlags > 1000) {
        report.recommendations.push(`${report.postgresql.staleFlags} companies have stale flags (>30 days old)`);
      }

      if (mongoH1BCount > report.postgresql.h1bCompanies * 2) {
        report.recommendations.push('MongoDB has significantly more H1B companies than PostgreSQL flags suggest');
      }

      console.log('\n📊 H1B MAINTENANCE REPORT');
      console.log('='.repeat(50));
      console.log(`📈 Total Companies: ${report.postgresql.totalCompanies.toLocaleString()}`);
      console.log(`🏢 H1B Companies: ${report.postgresql.h1bCompanies.toLocaleString()}`);
      console.log(`🔗 Matched Companies: ${report.postgresql.matchedCompanies.toLocaleString()}`);
      console.log(`📊 H1B Coverage: ${report.metrics.h1bCoverage}`);
      console.log(`🎯 Match Rate: ${report.metrics.matchRate}`);
      console.log(`🔍 Data Integrity: ${report.metrics.dataIntegrity}`);
      console.log(`⏰ Last Update: ${report.postgresql.lastUpdate || 'Never'}`);

      if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }

      return report;

    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  }

  /**
   * Run automated maintenance
   */
  async runAutomatedMaintenance() {
    try {
      console.log('🤖 Starting automated H1B maintenance...');
      
      const maintenanceNeeds = await this.checkMaintenanceNeeds();
      
      if (!maintenanceNeeds.needsUpdate) {
        console.log('✅ No maintenance needed at this time');
        return await this.generateMaintenanceReport();
      }

      console.log(`🔧 Maintenance needed: ${maintenanceNeeds.reasons.join(', ')}`);

      // Perform incremental update
      const updateResult = await this.performIncrementalUpdate();
      
      // Clean up orphaned flags
      const cleanupResult = await this.cleanupOrphanedFlags();
      
      // Generate final report
      const report = await this.generateMaintenanceReport();
      
      console.log(`✅ Automated maintenance complete:`);
      console.log(`  - Updated: ${updateResult.updated} companies`);
      console.log(`  - Cleaned: ${cleanupResult.cleaned} orphaned flags`);
      
      return {
        ...report,
        maintenanceResults: {
          updated: updateResult.updated,
          cleaned: cleanupResult.cleaned,
          reasons: maintenanceNeeds.reasons
        }
      };

    } catch (error) {
      console.error('❌ Error in automated maintenance:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await mongoose.connection.close();
      await pool.end();
      console.log('✅ Maintenance database connections closed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  const service = new H1BMaintenanceService();

  try {
    await service.connectDatabases();

    switch (command) {
      case 'check':
        await service.checkMaintenanceNeeds();
        break;
        
      case 'update':
        await service.performIncrementalUpdate();
        break;
        
      case 'cleanup':
        await service.cleanupOrphanedFlags();
        break;
        
      case 'report':
        await service.generateMaintenanceReport();
        break;
        
      case 'auto':
        await service.runAutomatedMaintenance();
        break;
        
      case 'full-update':
        console.log('🚀 Running full H1B flag update...');
        const updater = new H1BFlagUpdater();
        await updater.connectDatabases();
        await updater.processMatching({ threshold: 0.85, resetFlags: false });
        await updater.cleanup();
        break;
        
      case 'help':
        console.log(`
H1B Maintenance Script
======================

Usage: node h1b-maintenance.js [command]

Commands:
  check        Check if maintenance is needed
  update       Perform incremental flag updates
  cleanup      Clean up orphaned flags
  report       Generate maintenance report
  auto         Run automated maintenance (default)
  full-update  Run complete H1B flag update
  help         Show this help message

Examples:
  node h1b-maintenance.js check
  node h1b-maintenance.js auto
  node h1b-maintenance.js full-update
        `);
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Use "node h1b-maintenance.js help" for usage information');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Maintenance script failed:', error);
    process.exit(1);
  } finally {
    await service.cleanup();
  }
}

// Schedule automated maintenance (for use with cron or task scheduler)
async function scheduledMaintenance() {
  const service = new H1BMaintenanceService();
  
  try {
    console.log('⏰ Running scheduled H1B maintenance...');
    await service.connectDatabases();
    
    const result = await service.runAutomatedMaintenance();
    
    // Save results to log file
    const fs = require('fs').promises;
    const logPath = `h1b_maintenance_log_${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(logPath, JSON.stringify(result, null, 2));
    
    console.log(`📄 Maintenance log saved to: ${logPath}`);
    
  } catch (error) {
    console.error('❌ Scheduled maintenance failed:', error);
    
    // You could add email notification here for production
    // await sendMaintenanceAlert(error);
    
  } finally {
    await service.cleanup();
  }
}

// Export for use in other scripts or cron jobs
module.exports = {
  H1BMaintenanceService,
  scheduledMaintenance
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}