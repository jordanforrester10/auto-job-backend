// backend/scripts/update-h1b-flags.js
const mongoose = require('mongoose');
const { Pool } = require('pg');
const H1BCompany = require('../models/mongodb/h1bCompany.model');
const companyMatchingService = require('../services/companyMatching.service');
require('dotenv').config();

// Database connections
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class H1BFlagUpdater {
  constructor() {
    this.stats = {
      totalPgCompanies: 0,
      totalH1bCompanies: 0,
      matchesFound: 0,
      flagsUpdated: 0,
      flagsRemoved: 0,
      errors: 0,
      startTime: null,
      endTime: null
    };
  }

  async connectDatabases() {
    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ MongoDB connected');

      // Test PostgreSQL connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ PostgreSQL connected');

    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async fetchH1BCompanies() {
    try {
      console.log('📥 Fetching H1B companies from MongoDB...');
      
      const h1bCompanies = await H1BCompany.find(
        { 
          'h1bData.isActive': true, 
          isActive: true,
          companyName: { $exists: true, $ne: null, $ne: '' }
        },
        { 
          companyName: 1, 
          searchableNames: 1, 
          website: 1,
          primaryIndustry: 1,
          employeeRange: 1,
          headquarters: 1,
          _id: 1 
        }
      ).lean();

      this.stats.totalH1bCompanies = h1bCompanies.length;
      console.log(`✅ Fetched ${h1bCompanies.length} H1B companies`);
      
      return h1bCompanies;
    } catch (error) {
      console.error('❌ Error fetching H1B companies:', error);
      throw error;
    }
  }

  async fetchPostgreSQLCompanies() {
    try {
      console.log('📥 Fetching companies from PostgreSQL...');
      
      const query = `
        SELECT 
          id, 
          name, 
          website, 
          industry_id,
          employee_range,
          is_h1b_sponsor,
          h1b_matched_company_id
        FROM companies 
        WHERE name IS NOT NULL 
          AND name != ''
        ORDER BY id
      `;

      const result = await pool.query(query);
      this.stats.totalPgCompanies = result.rows.length;
      
      console.log(`✅ Fetched ${result.rows.length} PostgreSQL companies`);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching PostgreSQL companies:', error);
      throw error;
    }
  }

  async processMatching(options = {}) {
    const {
      threshold = 0.85,
      batchSize = 1000,
      dryRun = false,
      resetFlags = false
    } = options;

    try {
      this.stats.startTime = new Date();
      console.log(`🚀 Starting H1B flag update process (threshold: ${threshold}, dryRun: ${dryRun})`);

      // Reset all flags if requested
      if (resetFlags && !dryRun) {
        console.log('🔄 Resetting all H1B flags...');
        await pool.query(`
          UPDATE companies 
          SET is_h1b_sponsor = FALSE, 
              h1b_flag_updated_at = NOW(),
              h1b_matched_company_id = NULL
        `);
        console.log('✅ All H1B flags reset');
      }

      // Fetch data
      const [h1bCompanies, pgCompanies] = await Promise.all([
        this.fetchH1BCompanies(),
        this.fetchPostgreSQLCompanies()
      ]);

      if (h1bCompanies.length === 0) {
        throw new Error('No H1B companies found in MongoDB');
      }

      if (pgCompanies.length === 0) {
        throw new Error('No companies found in PostgreSQL');
      }

      // Create lookup table for faster matching
      console.log('🔍 Creating company name lookup table...');
      const lookupTable = companyMatchingService.createLookupTable(h1bCompanies);

      // Process companies in batches
      const matches = [];
      const errors = [];

      for (let i = 0; i < pgCompanies.length; i += batchSize) {
        const batch = pgCompanies.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(pgCompanies.length / batchSize);

        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} companies)`);

        for (const pgCompany of batch) {
          try {
            // Fast lookup first
            const candidates = companyMatchingService.fastLookup(pgCompany.name, lookupTable);
            
            if (candidates.length > 0) {
              // Find best match among candidates
              const match = companyMatchingService.findBestMatch(
                pgCompany.name, 
                candidates, 
                threshold
              );

              if (match) {
                matches.push({
                  pgCompanyId: pgCompany.id,
                  pgCompanyName: pgCompany.name,
                  h1bCompanyId: match.company._id.toString(),
                  h1bCompanyName: match.company.companyName,
                  similarity: match.score,
                  wasAlreadyFlagged: pgCompany.is_h1b_sponsor
                });

                this.stats.matchesFound++;
                
                if (this.stats.matchesFound % 50 === 0) {
                  console.log(`✅ Found ${this.stats.matchesFound} matches so far...`);
                }
              }
            }
          } catch (error) {
            console.error(`❌ Error processing company ${pgCompany.name}:`, error.message);
            errors.push({
              companyId: pgCompany.id,
              companyName: pgCompany.name,
              error: error.message
            });
            this.stats.errors++;
          }
        }
      }

      console.log(`🎯 Matching complete! Found ${matches.length} matches with ${errors.length} errors`);

      // Update database if not dry run
      if (!dryRun && matches.length > 0) {
        console.log('💾 Updating PostgreSQL with H1B flags...');
        await this.updateH1BFlags(matches);
      }

      // Generate report
      await this.generateReport(matches, errors, options);

      this.stats.endTime = new Date();
      const duration = (this.stats.endTime - this.stats.startTime) / 1000;
      
      console.log(`🏁 Process completed in ${duration.toFixed(2)} seconds`);
      return {
        matches,
        errors,
        stats: this.stats
      };

    } catch (error) {
      console.error('❌ Fatal error in H1B flag update process:', error);
      throw error;
    }
  }

  async updateH1BFlags(matches) {
    const batchSize = 100;
    let updated = 0;

    try {
      for (let i = 0; i < matches.length; i += batchSize) {
        const batch = matches.slice(i, i + batchSize);
        
        // Build batch update query
        const values = batch.map(match => 
          `(${match.pgCompanyId}, TRUE, NOW(), '${match.h1bCompanyId}')`
        ).join(',');

        const query = `
          UPDATE companies 
          SET is_h1b_sponsor = data.is_h1b_sponsor,
              h1b_flag_updated_at = data.h1b_flag_updated_at,
              h1b_matched_company_id = data.h1b_matched_company_id
          FROM (VALUES ${values}) AS data(id, is_h1b_sponsor, h1b_flag_updated_at, h1b_matched_company_id)
          WHERE companies.id = data.id
        `;

        await pool.query(query);
        updated += batch.length;

        if (updated % 500 === 0 || updated === matches.length) {
          console.log(`💾 Updated ${updated}/${matches.length} companies`);
        }
      }

      this.stats.flagsUpdated = updated;
      console.log(`✅ Successfully updated ${updated} companies with H1B flags`);

    } catch (error) {
      console.error('❌ Error updating H1B flags:', error);
      throw error;
    }
  }

  async generateReport(matches, errors, options) {
    const report = {
      timestamp: new Date().toISOString(),
      options: options,
      statistics: this.stats,
      summary: {
        processingTime: this.stats.endTime ? 
          `${((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2)} seconds` : 
          'In progress',
        matchRate: this.stats.totalPgCompanies > 0 ? 
          `${((this.stats.matchesFound / this.stats.totalPgCompanies) * 100).toFixed(2)}%` : 
          '0%',
        errorRate: this.stats.totalPgCompanies > 0 ? 
          `${((this.stats.errors / this.stats.totalPgCompanies) * 100).toFixed(2)}%` : 
          '0%'
      },
      topMatches: matches
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
        .map(match => ({
          pgCompany: match.pgCompanyName,
          h1bCompany: match.h1bCompanyName,
          similarity: `${(match.similarity * 100).toFixed(1)}%`
        })),
      errorSample: errors.slice(0, 10)
    };

    console.log('\n📊 H1B FLAG UPDATE REPORT');
    console.log('='.repeat(50));
    console.log(`📈 Total PostgreSQL Companies: ${this.stats.totalPgCompanies.toLocaleString()}`);
    console.log(`🏢 Total H1B Companies: ${this.stats.totalH1bCompanies.toLocaleString()}`);
    console.log(`🎯 Matches Found: ${this.stats.matchesFound.toLocaleString()}`);
    console.log(`💾 Flags Updated: ${this.stats.flagsUpdated.toLocaleString()}`);
    console.log(`❌ Errors: ${this.stats.errors.toLocaleString()}`);
    console.log(`📊 Match Rate: ${report.summary.matchRate}`);
    console.log(`⏱️  Processing Time: ${report.summary.processingTime}`);

    if (matches.length > 0) {
      console.log('\n🏆 TOP MATCHES:');
      report.topMatches.forEach((match, index) => {
        console.log(`${index + 1}. "${match.pgCompany}" → "${match.h1bCompany}" (${match.similarity})`);
      });
    }

    if (errors.length > 0) {
      console.log('\n⚠️  SAMPLE ERRORS:');
      report.errorSample.forEach((error, index) => {
        console.log(`${index + 1}. ${error.companyName}: ${error.error}`);
      });
    }

    // Save report to file
    const fs = require('fs').promises;
    const reportPath = `h1b_update_report_${new Date().toISOString().split('T')[0]}.json`;
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to save report:', error.message);
    }
  }

  async getH1BStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_companies,
          COUNT(CASE WHEN is_h1b_sponsor = TRUE THEN 1 END) as h1b_companies,
          COUNT(CASE WHEN h1b_matched_company_id IS NOT NULL THEN 1 END) as matched_companies,
          MAX(h1b_flag_updated_at) as last_update
        FROM companies
      `;

      const result = await pool.query(query);
      const stats = result.rows[0];

      console.log('\n📊 CURRENT H1B FLAG STATISTICS');
      console.log('='.repeat(40));
      console.log(`Total Companies: ${parseInt(stats.total_companies).toLocaleString()}`);
      console.log(`H1B Sponsors: ${parseInt(stats.h1b_companies).toLocaleString()}`);
      console.log(`Matched Companies: ${parseInt(stats.matched_companies).toLocaleString()}`);
      console.log(`Last Update: ${stats.last_update || 'Never'}`);
      
      if (stats.total_companies > 0) {
        const percentage = ((stats.h1b_companies / stats.total_companies) * 100).toFixed(2);
        console.log(`H1B Coverage: ${percentage}%`);
      }

      return stats;
    } catch (error) {
      console.error('❌ Error fetching H1B stats:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await mongoose.connection.close();
      await pool.end();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    threshold: 0.85,
    batchSize: 1000,
    dryRun: false,
    resetFlags: false,
    statsOnly: false
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--threshold':
        options.threshold = parseFloat(args[++i]) || 0.85;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || 1000;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--reset-flags':
        options.resetFlags = true;
        break;
      case '--stats-only':
        options.statsOnly = true;
        break;
      case '--help':
        console.log(`
H1B Flag Update Script
=====================

Usage: node update-h1b-flags.js [options]

Options:
  --threshold <number>     Similarity threshold for matching (default: 0.85)
  --batch-size <number>    Batch size for processing (default: 1000)
  --dry-run               Run without updating database
  --reset-flags           Reset all H1B flags before processing
  --stats-only            Only show current statistics
  --help                  Show this help message

Examples:
  node update-h1b-flags.js --dry-run
  node update-h1b-flags.js --threshold 0.9 --batch-size 500
  node update-h1b-flags.js --reset-flags
  node update-h1b-flags.js --stats-only
        `);
        process.exit(0);
    }
  }

  const updater = new H1BFlagUpdater();

  try {
    await updater.connectDatabases();

    if (options.statsOnly) {
      await updater.getH1BStats();
    } else {
      await updater.processMatching(options);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await updater.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = H1BFlagUpdater;