// backend/utils/recruiter-importer.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const db = require('../config/postgresql');

/**
 * Import recruiters from a CSV/TSV file
 * @param {string} filePath Path to the CSV/TSV file
 * @param {boolean} isHeaderRow Whether the first row is a header row
 * @param {string} delimiter Delimiter used in the file
 */
const importRecruitersFromFile = async (filePath, isHeaderRow = true, delimiter = '\t') => {
  try {
    console.log(`Importing recruiters from ${filePath}...`);
    
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV/TSV content
    const records = parse(fileContent, {
      delimiter,
      columns: isHeaderRow,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} records to import`);
    
    // Process each record
    for (const record of records) {
      await processRecruiterRecord(record);
    }
    
    console.log('Recruiter import completed successfully');
  } catch (error) {
    console.error('Error importing recruiters:', error);
    throw error;
  }
};

/**
 * Process a single recruiter record and insert into database
 * @param {Object} record The recruiter record from the CSV/TSV
 */
const processRecruiterRecord = async (record) => {
  try {
    // 1. First, process the company information
    const companyId = await processCompany(record);
    
    // 2. Process the location information
    const locationId = await processLocation(record);
    
    // 3. Process industry information
    const industryId = await processIndustry(record);
    
    // 4. Create or update the recruiter record
    await processRecruiter(record, companyId, locationId, industryId);
    
  } catch (error) {
    console.error(`Error processing recruiter record:`, error);
    console.error('Problematic record:', record);
  }
};

/**
 * Process company data from the record
 * @param {Object} record The recruiter record
 * @returns {number} The company ID
 */
const processCompany = async (record) => {
  try {
    // Check if company already exists
    const companyResult = await db.query(
      'SELECT id FROM companies WHERE name = $1',
      [record['Company Name']]
    );
    
    if (companyResult.rows.length > 0) {
      return companyResult.rows[0].id;
    }
    
    // Insert new company
    const result = await db.query(
      `INSERT INTO companies (
        name, website, employee_count, employee_range, founded_year,
        phone, revenue, revenue_range, ownership_type, business_model,
        stock_ticker, zoominfo_id, zoominfo_url, linkedin_url,
        facebook_url, twitter_url, email_domain
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id`,
      [
        record['Company Name'] || null,
        record['Website'] || null,
        parseInt(record['Employees']) || null,
        record['Employee Range'] || null,
        parseInt(record['Founded Year']) || null,
        record['Company HQ Phone'] || null,
        parseInt(record['Revenue (in 000s USD)']) || null,
        record['Revenue Range (in USD)'] || null,
        record['Ownership Type'] || null,
        record['Business Model'] || null,
        record['Ticker'] || null,
        record['ZoomInfo Company ID'] || null,
        record['ZoomInfo Company Profile URL'] || null,
        record['LinkedIn Company Profile URL'] || null,
        record['Facebook Company Profile URL'] || null,
        record['Twitter Company Profile URL'] || null,
        record['Email Domain'] || null
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error processing company:', error);
    throw error;
  }
};

/**
 * Process location data from the record
 * @param {Object} record The recruiter record
 * @returns {number} The location ID
 */
const processLocation = async (record) => {
  try {
    // Check for person location first, then company location
    let street = record['Person Street'] || record['Company Street Address'] || null;
    let city = record['Person City'] || record['Company City'] || null;
    let state = record['Person State'] || record['Company State'] || null;
    let postalCode = record['Person Zip Code'] || record['Company Zip Code'] || null;
    let country = record['Country'] || record['Company Country'] || null;
    
    if (!city && !state && !country) {
      return null;
    }
    
    // Check if location already exists
    const locationResult = await db.query(
      'SELECT id FROM locations WHERE city = $1 AND state = $2 AND country = $3 AND (postal_code = $4 OR $4 IS NULL)',
      [city, state, country, postalCode]
    );
    
    if (locationResult.rows.length > 0) {
      return locationResult.rows[0].id;
    }
    
    // Create full address
    let fullAddress = '';
    if (street) fullAddress += street + ', ';
    if (city) fullAddress += city + ', ';
    if (state) fullAddress += state + ', ';
    if (postalCode) fullAddress += postalCode + ', ';
    if (country) fullAddress += country;
    
    // Insert new location
    const result = await db.query(
      `INSERT INTO locations (
        street_address, city, state, postal_code, country, full_address
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [street, city, state, postalCode, country, fullAddress]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error processing location:', error);
    throw error;
  }
};

/**
 * Process industry data from the record
 * @param {Object} record The recruiter record
 * @returns {number} The industry ID
 */
const processIndustry = async (record) => {
  try {
    const primaryIndustry = record['Primary Industry'] || null;
    
    if (!primaryIndustry) {
      return null;
    }
    
    // Check if industry already exists
    const industryResult = await db.query(
      'SELECT id FROM industries WHERE name = $1',
      [primaryIndustry]
    );
    
    if (industryResult.rows.length > 0) {
      return industryResult.rows[0].id;
    }
    
    // Parse SIC and NAICS codes
    const sicCodes = [];
    if (record['SIC Code 1']) sicCodes.push(record['SIC Code 1']);
    if (record['SIC Code 2']) sicCodes.push(record['SIC Code 2']);
    if (record['SIC Codes']) {
      const additionalSIC = record['SIC Codes'].split(';').filter(Boolean);
      sicCodes.push(...additionalSIC);
    }
    
    const naicsCodes = [];
    if (record['NAICS Code 1']) naicsCodes.push(record['NAICS Code 1']);
    if (record['NAICS Code 2']) naicsCodes.push(record['NAICS Code 2']);
    if (record['NAICS Codes']) {
      const additionalNAICS = record['NAICS Codes'].split(';').filter(Boolean);
      naicsCodes.push(...additionalNAICS);
    }
    
    // Insert new industry
    const result = await db.query(
      `INSERT INTO industries (
        name, description, primary_category, sub_category, 
        hierarchical_category, sic_codes, naics_codes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        primaryIndustry,
        null,
        record['Primary Industry'] || null,
        record['Primary Sub-Industry'] || null,
        record['Industry Hierarchical Category'] || null,
        sicCodes.length > 0 ? sicCodes : null,
        naicsCodes.length > 0 ? naicsCodes : null
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error processing industry:', error);
    throw error;
  }
};

/**
 * Process recruiter data from the record
 * @param {Object} record The recruiter record
 * @param {number} companyId The company ID
 * @param {number} locationId The location ID
 * @param {number} industryId The industry ID
 */
const processRecruiter = async (record, companyId, locationId, industryId) => {
  try {
    // Check if recruiter already exists by email
    const email = record['Email Address'] || null;
    
    if (email) {
      const recruiterResult = await db.query(
        'SELECT id FROM recruiters WHERE email = $1',
        [email]
      );
      
      if (recruiterResult.rows.length > 0) {
        const recruiterId = recruiterResult.rows[0].id;
        await updateRecruiter(recruiterId, record, companyId, locationId, industryId);
        return;
      }
    }
    
    // Parse job start date
    let jobStartDate = null;
    if (record['Job Start Date']) {
      try {
        jobStartDate = new Date(record['Job Start Date']);
      } catch (e) {
        console.warn(`Could not parse job start date: ${record['Job Start Date']}`);
      }
    }
    
    // Parse notice provided date
    let noticeProvidedDate = null;
    if (record['Notice Provided Date']) {
      try {
        noticeProvidedDate = new Date(record['Notice Provided Date']);
      } catch (e) {
        console.warn(`Could not parse notice provided date: ${record['Notice Provided Date']}`);
      }
    }
    
    // Insert new recruiter
    const result = await db.query(
      `INSERT INTO recruiters (
        first_name, middle_name, last_name, salutation, suffix,
        email, email_domain, supplemental_email, direct_phone, mobile_phone,
        current_company_id, title, job_title_hierarchy_level, management_level,
        job_start_date, job_function, department, company_division,
        education_level, accuracy_score, accuracy_grade, zoominfo_url,
        linkedin_url, notice_provided_date, location_id, industry_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      RETURNING id`,
      [
        record['First Name'] || null,
        record['Middle Name'] || null,
        record['Last Name'] || null,
        record['Salutation'] || null,
        record['Suffix'] || null,
        email,
        record['Email Domain'] || null,
        record['Supplemental Email'] || null,
        record['Direct Phone Number'] || null,
        record['Mobile phone'] || null,
        companyId,
        record['Job Title'] || null,
        parseInt(record['Job Title Hierarchy Level']) || null,
        record['Management Level'] || null,
        jobStartDate,
        record['Job Function'] || null,
        record['Department'] || null,
        record['Company Division Name'] || null,
        record['Highest Level of Education'] || null,
        parseInt(record['Contact Accuracy Score']) || null,
        record['Contact Accuracy Grade'] || null,
        record['ZoomInfo Contact Profile URL'] || null,
        record['LinkedIn Contact Profile URL'] || null,
        noticeProvidedDate,
        locationId,
        industryId
      ]
    );
    
    console.log(`Created recruiter: ${record['First Name']} ${record['Last Name']}`);
  } catch (error) {
    console.error('Error processing recruiter:', error);
    throw error;
  }
};

/**
 * Update an existing recruiter
 * @param {number} recruiterId The recruiter ID
 * @param {Object} record The recruiter record
 * @param {number} companyId The company ID
 * @param {number} locationId The location ID
 * @param {number} industryId The industry ID
 */
const updateRecruiter = async (recruiterId, record, companyId, locationId, industryId) => {
  try {
    // Parse job start date
    let jobStartDate = null;
    if (record['Job Start Date']) {
      try {
        jobStartDate = new Date(record['Job Start Date']);
      } catch (e) {
        console.warn(`Could not parse job start date: ${record['Job Start Date']}`);
      }
    }
    
    // Parse notice provided date
    let noticeProvidedDate = null;
    if (record['Notice Provided Date']) {
      try {
        noticeProvidedDate = new Date(record['Notice Provided Date']);
      } catch (e) {
        console.warn(`Could not parse notice provided date: ${record['Notice Provided Date']}`);
      }
    }
    
    await db.query(
      `UPDATE recruiters SET
        first_name = $1, middle_name = $2, last_name = $3, salutation = $4,
        suffix = $5, email_domain = $6, supplemental_email = $7,
        direct_phone = $8, mobile_phone = $9, current_company_id = $10,
        title = $11, job_title_hierarchy_level = $12, management_level = $13,
        job_start_date = $14, job_function = $15, department = $16,
        company_division = $17, education_level = $18, accuracy_score = $19,
        accuracy_grade = $20, zoominfo_url = $21, linkedin_url = $22,
        notice_provided_date = $23, location_id = $24, industry_id = $25,
        updated_at = NOW()
      WHERE id = $26`,
      [
        record['First Name'] || null,
        record['Middle Name'] || null,
        record['Last Name'] || null,
        record['Salutation'] || null,
        record['Suffix'] || null,
        record['Email Domain'] || null,
        record['Supplemental Email'] || null,
        record['Direct Phone Number'] || null,
        record['Mobile phone'] || null,
        companyId,
        record['Job Title'] || null,
        parseInt(record['Job Title Hierarchy Level']) || null,
        record['Management Level'] || null,
        jobStartDate,
        record['Job Function'] || null,
        record['Department'] || null,
        record['Company Division Name'] || null,
        record['Highest Level of Education'] || null,
        parseInt(record['Contact Accuracy Score']) || null,
        record['Contact Accuracy Grade'] || null,
        record['ZoomInfo Contact Profile URL'] || null,
        record['LinkedIn Contact Profile URL'] || null,
        noticeProvidedDate,
        locationId,
        industryId,
        recruiterId
      ]
    );
    
    console.log(`Updated recruiter: ${record['First Name']} ${record['Last Name']}`);
  } catch (error) {
    console.error('Error updating recruiter:', error);
    throw error;
  }
};

module.exports = { importRecruitersFromFile };