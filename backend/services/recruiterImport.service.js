// backend/services/recruiterImport.service.js - OPTIMIZED VERSION
const csv = require('csv-parser');
const fs = require('fs');
const db = require('../config/postgresql');

class RecruiterImportService {
  static async importFromCSV(filePath) {
    const companies = new Map();
    const recruiters = [];
    let processedCount = 0;
    let errorCount = 0;

    console.log('🚀 Starting recruiter import from CSV...');

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            // Process company data
            const companyData = this.extractCompanyData(row);
            const companyKey = `${companyData.name}_${companyData.website || 'no-website'}`;
            
            if (!companies.has(companyKey) && companyData.name) {
              companies.set(companyKey, companyData);
            }

            // Process recruiter data
            const recruiterData = this.extractRecruiterData(row, companyKey);
            if (recruiterData.firstName && recruiterData.lastName) {
              recruiters.push(recruiterData);
            }
            
            processedCount++;
            
            if (processedCount % 1000 === 0) {
              console.log(`📊 Processed ${processedCount} records...`);
            }
          } catch (error) {
            console.error(`❌ Error processing row ${processedCount}:`, error.message);
            errorCount++;
          }
        })
        .on('end', async () => {
          try {
            console.log(`📥 CSV parsing complete. Processing ${companies.size} companies and ${recruiters.length} recruiters...`);
            
            // Import to database
            const result = await this.bulkInsertData(Array.from(companies.values()), recruiters);
            
            resolve({
              companiesImported: result.companiesImported,
              recruitersImported: result.recruitersImported,
              totalProcessed: processedCount,
              errors: errorCount
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  static extractCompanyData(row) {
    return {
      name: row['Company Name'] || '',
      website: row['Website'] || '',
      foundedYear: this.parseInteger(row['Founded Year']),
      phone: row['Company HQ Phone'] || '',
      fax: row['Fax'] || '',
      stockTicker: row['Ticker'] || '',
      revenueRange: row['Revenue Range (in USD)'] || '',
      revenueUsdThousands: this.parseInteger(row['Revenue (in 000s USD)']),
      employeeCount: this.parseInteger(row['Employees']),
      employeeRange: row['Employee Range'] || '',
      ownershipType: row['Ownership Type'] || '',
      businessModel: row['Business Model'] || '',
      primaryIndustry: row['Primary Industry'] || '',
      subIndustry: row['Primary Sub-Industry'] || '',
      allIndustries: this.parseArray(row['All Industries']),
      allSubIndustries: this.parseArray(row['All Sub-Industries']),
      sicCodes: this.parseArray(row['SIC Codes']),
      naicsCodes: this.parseArray(row['NAICS Codes']),
      linkedinUrl: row['LinkedIn Company Profile URL'] || '',
      facebookUrl: row['Facebook Company Profile URL'] || '',
      twitterUrl: row['Twitter Company Profile URL'] || '',
      zoominfoUrl: row['ZoomInfo Company Profile URL'] || '',
      zoominfoId: row['ZoomInfo Company ID'] || '',
      alexaRank: this.parseInteger(row['Alexa Rank']),
      locationCount: this.parseInteger(row['Number of Locations']),
      fundingTotalUsdThousands: this.parseInteger(row['Total Funding Amount (in 000s USD)']),
      recentFundingUsdThousands: this.parseInteger(row['Recent Funding Amount (in 000s USD)']),
      recentFundingRound: row['Recent Funding Round'] || '',
      recentFundingDate: this.parseDate(row['Recent Funding Date']),
      recentInvestors: this.parseArray(row['Recent Investors']),
      allInvestors: this.parseArray(row['All Investors']),
      isCertifiedActive: row['Certified Active Company'] === 'Yes',
      certificationDate: this.parseDate(row['Certification Date'])
    };
  }

  static extractRecruiterData(row, companyKey) {
    return {
      firstName: row['First Name'] || '',
      lastName: row['Last Name'] || '',
      middleName: row['Middle Name'] || '',
      salutation: row['Salutation'] || '',
      suffix: row['Suffix'] || '',
      email: row['Email Address'] || '',
      emailDomain: row['Email Domain'] || '',
      supplementalEmail: row['Supplemental Email'] || '',
      mobilePhone: row['Mobile phone'] || '',
      directPhone: row['Direct Phone Number'] || '',
      title: row['Job Title'] || '',
      jobTitleHierarchyLevel: this.parseInteger(row['Job Title Hierarchy Level']),
      managementLevel: row['Management Level'] || '',
      jobStartDate: this.parseDate(row['Job Start Date']),
      jobFunction: row['Job Function'] || '',
      department: row['Department'] || '',
      companyDivision: row['Company Division Name'] || '',
      companyKey: companyKey,
      highestEducation: row['Highest Level of Education'] || '',
      contactAccuracyScore: this.parseInteger(row['Contact Accuracy Score']),
      contactAccuracyGrade: row['Contact Accuracy Grade'] || '',
      zoominfoProfileUrl: row['ZoomInfo Contact Profile URL'] || '',
      linkedinProfileUrl: row['LinkedIn Contact Profile URL'] || '',
      noticeProvidedDate: this.parseDate(row['Notice Provided Date']),
      personStreet: row['Person Street'] || '',
      personCity: row['Person City'] || '',
      personState: row['Person State'] || '',
      personZipCode: row['Person Zip Code'] || '',
      personCountry: row['Country'] || ''
    };
  }

  static async bulkInsertData(companies, recruiters) {
    let companiesImported = 0;
    let recruitersImported = 0;

    try {
      // First, insert/find industries in batch
      console.log('📥 Processing industries...');
      const industryMap = new Map();
      const uniqueIndustries = [...new Set(companies.map(c => c.primaryIndustry).filter(Boolean))];
      
      // Batch insert industries
      if (uniqueIndustries.length > 0) {
        const industryValues = uniqueIndustries.map((name, index) => 
          `($${index + 1}, $${index + 1})`
        ).join(', ');
        
        const industryQuery = `
          INSERT INTO industries (name, primary_category) 
          VALUES ${industryValues}
          ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
          RETURNING id, name
        `;
        
        const result = await db.query(industryQuery, uniqueIndustries);
        result.rows.forEach(row => {
          industryMap.set(row.name, row.id);
        });
        
        console.log(`✅ Processed ${uniqueIndustries.length} industries`);
      }

      // Insert companies in batches
      console.log('📥 Importing companies in batches...');
      const companyMap = new Map();
      const batchSize = 100; // Reduced batch size for stability
      
      for (let i = 0; i < companies.length; i += batchSize) {
        const batch = companies.slice(i, i + batchSize);
        
        try {
          // Build batch insert query
          const values = [];
          const placeholders = [];
          let paramCount = 0;
          
          for (const company of batch) {
            const industryId = industryMap.get(company.primaryIndustry);
            const emailDomain = company.website ? 
              company.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : 
              null;

            const companyValues = [
              company.name, company.website, company.foundedYear, company.phone,
              company.fax, company.stockTicker, company.revenueRange, company.revenueUsdThousands,
              company.employeeCount, company.employeeRange, company.ownershipType,
              company.businessModel, emailDomain, company.sicCodes, company.naicsCodes, 
              company.linkedinUrl, company.facebookUrl, company.twitterUrl, company.zoominfoUrl,
              company.zoominfoId, company.alexaRank, company.fundingTotalUsdThousands,
              company.recentFundingUsdThousands, company.recentFundingRound,
              company.recentFundingDate, company.recentInvestors, company.allInvestors,
              company.locationCount, company.isCertifiedActive, company.certificationDate,
              industryId
            ];

            values.push(...companyValues);
            
            const startParam = paramCount + 1;
            paramCount += companyValues.length;
            const endParam = paramCount;
            
            const placeholder = `($${Array.from({length: companyValues.length}, (_, j) => startParam + j).join(', $')})`;
            placeholders.push(placeholder);
          }

          const batchQuery = `
            INSERT INTO companies (
              name, website, founded_year, phone, fax, stock_ticker, revenue_range,
              revenue_usd_thousands, employee_count, employee_range, ownership_type,
              business_model, email_domain, sic_codes, naics_codes, linkedin_url,
              facebook_url, twitter_url, zoominfo_url, zoominfo_id, alexa_rank,
              funding_total_usd_thousands, recent_funding_usd_thousands, 
              recent_funding_round, recent_funding_date, recent_investors, 
              all_investors, location_count, is_certified_active, 
              certification_date, industry_id
            ) VALUES ${placeholders.join(', ')}
            ON CONFLICT (name, website) DO UPDATE SET 
              updated_at = NOW(),
              industry_id = EXCLUDED.industry_id,
              employee_count = EXCLUDED.employee_count,
              revenue_usd_thousands = EXCLUDED.revenue_usd_thousands
            RETURNING id, name, website
          `;

          const result = await db.query(batchQuery, values);
          
          // Map results back to company keys
          for (let j = 0; j < batch.length; j++) {
            const company = batch[j];
            const resultRow = result.rows[j];
            if (resultRow) {
              const companyKey = `${company.name}_${company.website || 'no-website'}`;
              companyMap.set(companyKey, resultRow.id);
              companiesImported++;
            }
          }

          console.log(`📊 Imported ${Math.min(i + batchSize, companies.length)} / ${companies.length} companies`);
          
        } catch (error) {
          console.error(`Error in company batch ${i}-${i + batchSize}:`, error.message);
          // Try individual inserts for this batch
          for (const company of batch) {
            try {
              const industryId = industryMap.get(company.primaryIndustry);
              const emailDomain = company.website ? 
                company.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : 
                null;

              const query = `
                INSERT INTO companies (
                  name, website, founded_year, phone, fax, stock_ticker, revenue_range,
                  revenue_usd_thousands, employee_count, employee_range, ownership_type,
                  business_model, email_domain, sic_codes, naics_codes, linkedin_url,
                  facebook_url, twitter_url, zoominfo_url, zoominfo_id, alexa_rank,
                  funding_total_usd_thousands, recent_funding_usd_thousands, 
                  recent_funding_round, recent_funding_date, recent_investors, 
                  all_investors, location_count, is_certified_active, 
                  certification_date, industry_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
                ON CONFLICT (name, website) DO UPDATE SET 
                  updated_at = NOW(),
                  industry_id = EXCLUDED.industry_id,
                  employee_count = EXCLUDED.employee_count,
                  revenue_usd_thousands = EXCLUDED.revenue_usd_thousands
                RETURNING id
              `;

              const values = [
                company.name, company.website, company.foundedYear, company.phone,
                company.fax, company.stockTicker, company.revenueRange, company.revenueUsdThousands,
                company.employeeCount, company.employeeRange, company.ownershipType,
                company.businessModel, emailDomain, company.sicCodes, company.naicsCodes, 
                company.linkedinUrl, company.facebookUrl, company.twitterUrl, company.zoominfoUrl,
                company.zoominfoId, company.alexaRank, company.fundingTotalUsdThousands,
                company.recentFundingUsdThousands, company.recentFundingRound,
                company.recentFundingDate, company.recentInvestors, company.allInvestors,
                company.locationCount, company.isCertifiedActive, company.certificationDate,
                industryId
              ];

              const result = await db.query(query, values);
              const companyKey = `${company.name}_${company.website || 'no-website'}`;
              companyMap.set(companyKey, result.rows[0].id);
              companiesImported++;

            } catch (individualError) {
              // Skip this company
              console.log(`Skipping company ${company.name}: ${individualError.message}`);
            }
          }
        }
      }

      // Insert recruiters in batches
      console.log('📥 Importing recruiters in batches...');
      const recruiterBatchSize = 500;
      
      for (let i = 0; i < recruiters.length; i += recruiterBatchSize) {
        const batch = recruiters.slice(i, i + recruiterBatchSize);
        
        for (const recruiter of batch) {
          try {
            const companyId = companyMap.get(recruiter.companyKey);
            
            const query = `
              INSERT INTO recruiters (
                first_name, last_name, middle_name, salutation, suffix,
                email, email_domain, supplemental_email, mobile_phone,
                direct_phone, title, job_title_hierarchy_level,
                management_level, job_start_date, job_function, department,
                company_division, current_company_id, highest_education,
                contact_accuracy_score, contact_accuracy_grade,
                zoominfo_profile_url, linkedin_profile_url,
                notice_provided_date, person_street, person_city, person_state,
                person_zip_code, person_country
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
              ON CONFLICT (email) DO UPDATE SET 
                title = EXCLUDED.title,
                current_company_id = EXCLUDED.current_company_id,
                updated_at = NOW()
            `;

            const values = [
              recruiter.firstName, recruiter.lastName, recruiter.middleName,
              recruiter.salutation, recruiter.suffix, recruiter.email,
              recruiter.emailDomain, recruiter.supplementalEmail,
              recruiter.mobilePhone, recruiter.directPhone, recruiter.title,
              recruiter.jobTitleHierarchyLevel, recruiter.managementLevel,
              recruiter.jobStartDate, recruiter.jobFunction, recruiter.department,
              recruiter.companyDivision, companyId, recruiter.highestEducation,
              recruiter.contactAccuracyScore, recruiter.contactAccuracyGrade,
              recruiter.zoominfoProfileUrl, recruiter.linkedinProfileUrl,
              recruiter.noticeProvidedDate, recruiter.personStreet,
              recruiter.personCity, recruiter.personState, recruiter.personZipCode,
              recruiter.personCountry
            ];

            await db.query(query, values);
            recruitersImported++;

          } catch (error) {
            // Skip duplicates and other errors
            if (!error.message.includes('duplicate key')) {
              console.error(`Error inserting recruiter ${recruiter.firstName} ${recruiter.lastName}:`, error.message);
            }
          }
        }

        console.log(`📊 Imported ${Math.min(i + recruiterBatchSize, recruiters.length)} / ${recruiters.length} recruiters`);
      }

      console.log('✅ Import completed successfully');
      return { companiesImported, recruitersImported };

    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  }

  // Helper methods
  static parseInteger(value) {
    if (!value || value === '') return null;
    const parsed = parseInt(value.toString().replace(/[^\d]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  static parseDate(value) {
    if (!value || value === '') return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  static parseArray(value) {
    if (!value || value === '') return [];
    return value.split(';').map(item => item.trim()).filter(item => item !== '');
  }
}

module.exports = RecruiterImportService;