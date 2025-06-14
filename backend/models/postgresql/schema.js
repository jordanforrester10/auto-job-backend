// backend/models/postgresql/schema.js
const db = require('../../config/postgresql');

const createTables = async () => {
  try {
    console.log('Creating PostgreSQL tables...');
    
    // Industries Table with additional classification codes
    await db.query(`
      CREATE TABLE IF NOT EXISTS industries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        sic_codes TEXT[],
        naics_codes TEXT[],
        primary_category VARCHAR(255),
        sub_category VARCHAR(255),
        hierarchical_category VARCHAR(255),
        all_industries TEXT[],
        all_sub_industries TEXT[],
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Locations Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        street_address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) NOT NULL,
        is_remote BOOLEAN DEFAULT FALSE,
        full_address TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Companies Table with expanded fields
    await db.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        industry_id INTEGER REFERENCES industries(id),
        company_size VARCHAR(50),
        employee_count INTEGER,
        employee_range VARCHAR(50),
        founded_year INTEGER,
        headquarters_location_id INTEGER REFERENCES locations(id),
        description TEXT,
        logo_url VARCHAR(255),
        phone VARCHAR(50),
        fax VARCHAR(50),
        email_domain VARCHAR(255),
        revenue DECIMAL(15,2),
        revenue_range VARCHAR(50),
        revenue_usd_thousands INTEGER,
        ownership_type VARCHAR(50),
        business_model VARCHAR(50),
        stock_ticker VARCHAR(20),
        alexa_rank INTEGER,
        zoominfo_id VARCHAR(50),
        zoominfo_url TEXT,
        linkedin_url TEXT,
        facebook_url TEXT,
        twitter_url TEXT,
        funding_total DECIMAL(15,2),
        funding_total_usd_thousands INTEGER,
        recent_funding DECIMAL(15,2),
        recent_funding_usd_thousands INTEGER,
        recent_funding_round VARCHAR(50),
        recent_funding_date DATE,
        recent_investors TEXT[],
        all_investors TEXT[],
        location_count INTEGER,
        sic_codes TEXT[],
        naics_codes TEXT[],
        is_certified_active BOOLEAN DEFAULT FALSE,
        certification_date DATE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Add missing columns to companies table if they don't exist
    console.log('Checking and adding missing columns to companies table...');
    
    const companyColumnsToAdd = [
      { name: 'revenue_usd_thousands', type: 'INTEGER' },
      { name: 'funding_total_usd_thousands', type: 'INTEGER' },
      { name: 'recent_funding_usd_thousands', type: 'INTEGER' },
      { name: 'sic_codes', type: 'TEXT[]' },
      { name: 'naics_codes', type: 'TEXT[]' },
      { name: 'recent_investors', type: 'TEXT[]' },
      { name: 'all_investors', type: 'TEXT[]' },
      { name: 'is_certified_active', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'certification_date', type: 'DATE' },
      { name: 'zoominfo_id', type: 'VARCHAR(50)' },
      { name: 'zoominfo_url', type: 'TEXT' },
      { name: 'stock_ticker', type: 'VARCHAR(20)' },
      { name: 'alexa_rank', type: 'INTEGER' },
      { name: 'location_count', type: 'INTEGER' },
      { name: 'recent_funding_round', type: 'VARCHAR(50)' },
      { name: 'recent_funding_date', type: 'DATE' }
    ];

    for (const column of companyColumnsToAdd) {
      try {
        await db.query(`
          ALTER TABLE companies ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};
        `);
        console.log(`✅ Added column ${column.name} to companies table`);
      } catch (error) {
        console.log(`Column ${column.name} already exists or cannot be added: ${error.message}`);
      }
    }

    // Add unique constraint to companies if it doesn't exist
    try {
      await db.query(`
        ALTER TABLE companies ADD CONSTRAINT companies_name_website_unique UNIQUE (name, website);
      `);
    } catch (error) {
      // Constraint might already exist, that's okay
      console.log('Companies unique constraint already exists or cannot be added');
    }
    
    // Recruiters Table with expanded fields for CSV data
    await db.query(`
      CREATE TABLE IF NOT EXISTS recruiters (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        salutation VARCHAR(20),
        suffix VARCHAR(20),
        email VARCHAR(255),
        email_domain VARCHAR(255),
        supplemental_email VARCHAR(255),
        direct_phone VARCHAR(50),
        mobile_phone VARCHAR(50),
        current_company_id INTEGER REFERENCES companies(id),
        title VARCHAR(255),
        job_title_hierarchy_level INTEGER,
        management_level VARCHAR(50),
        job_start_date DATE,
        job_function VARCHAR(100),
        department VARCHAR(100),
        company_division VARCHAR(100),
        education_level VARCHAR(100),
        highest_education VARCHAR(100),
        accuracy_score INTEGER,
        accuracy_grade VARCHAR(10),
        contact_accuracy_score INTEGER,
        contact_accuracy_grade VARCHAR(10),
        zoominfo_url TEXT,
        linkedin_url TEXT,
        zoominfo_profile_url TEXT,
        linkedin_profile_url TEXT,
        notice_provided_date DATE,
        location_id INTEGER REFERENCES locations(id),
        industry_id INTEGER REFERENCES industries(id),
        specializations VARCHAR(255)[],
        experience_years INTEGER,
        last_active_date DATE,
        rating DECIMAL(3,2),
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        last_contacted DATE,
        contact_attempts INTEGER DEFAULT 0,
        response_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Add missing columns to recruiters table if they don't exist
    console.log('Checking and adding missing columns to recruiters table...');
    
    const recruiterColumnsToAdd = [
      { name: 'person_street', type: 'VARCHAR(255)' },
      { name: 'person_city', type: 'VARCHAR(100)' },
      { name: 'person_state', type: 'VARCHAR(100)' },
      { name: 'person_zip_code', type: 'VARCHAR(20)' },
      { name: 'person_country', type: 'VARCHAR(100)' },
      { name: 'is_active', type: 'BOOLEAN DEFAULT TRUE' }
    ];

    for (const column of recruiterColumnsToAdd) {
      try {
        await db.query(`
          ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};
        `);
        console.log(`✅ Added column ${column.name} to recruiters table`);
      } catch (error) {
        console.log(`Column ${column.name} already exists or cannot be added`);
      }
    }

    // Add unique constraint to recruiters email if it doesn't exist
    try {
      await db.query(`
        ALTER TABLE recruiters ADD CONSTRAINT recruiters_email_unique UNIQUE (email);
      `);
    } catch (error) {
      // Constraint might already exist, that's okay
      console.log('Recruiters email unique constraint already exists or cannot be added');
    }
    
    // Skills Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(100),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // RecruiterSkills Table (Junction)
    await db.query(`
      CREATE TABLE IF NOT EXISTS recruiter_skills (
        recruiter_id INTEGER REFERENCES recruiters(id) ON DELETE CASCADE,
        skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
        PRIMARY KEY (recruiter_id, skill_id)
      );
    `);
    
    // Outreach Campaigns Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS outreach_campaigns (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        target_job_title VARCHAR(255),
        target_companies TEXT[],
        target_locations TEXT[],
        message_template TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Outreach Messages Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS outreach_messages (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        recruiter_id INTEGER REFERENCES recruiters(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES outreach_campaigns(id) ON DELETE SET NULL,
        subject VARCHAR(255),
        message_content TEXT NOT NULL,
        sent_via VARCHAR(50) DEFAULT 'email',
        sent_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'draft',
        response_received BOOLEAN DEFAULT FALSE,
        response_content TEXT,
        response_received_at TIMESTAMP,
        follow_up_scheduled DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // OutreachHistory Table (Connecting MongoDB to PostgreSQL)
    await db.query(`
      CREATE TABLE IF NOT EXISTS outreach_history (
        id SERIAL PRIMARY KEY,
        recruiter_id INTEGER REFERENCES recruiters(id) ON DELETE CASCADE,
        mongodb_outreach_id VARCHAR(24) NOT NULL,
        mongodb_user_id VARCHAR(24) NOT NULL,
        status VARCHAR(50) NOT NULL,
        last_contact_date TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // EmailTemplates Table for outreach
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject_template TEXT NOT NULL,
        body_template TEXT NOT NULL,
        context_variables JSONB,
        category VARCHAR(100),
        tags VARCHAR(50)[],
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Job Boards Table for scraping
    await db.query(`
      CREATE TABLE IF NOT EXISTS job_boards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        scraping_config JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        last_scraped_at TIMESTAMP,
        scraping_frequency_hours INTEGER DEFAULT 24,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('✅ Tables created successfully');
    
    // Create Indexes in a separate step to ensure all columns exist
    console.log('Creating indexes...');
    
    // Helper function to check if column exists before creating index
    const columnExists = async (tableName, columnName) => {
      try {
        const result = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [tableName, columnName]);
        return result.rows.length > 0;
      } catch (error) {
        return false;
      }
    };

    // Basic indexes that should always work
    const basicIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_recruiters_company ON recruiters(current_company_id)',
      'CREATE INDEX IF NOT EXISTS idx_recruiters_industry ON recruiters(industry_id)',
      'CREATE INDEX IF NOT EXISTS idx_recruiters_location ON recruiters(location_id)',
      'CREATE INDEX IF NOT EXISTS idx_recruiters_name ON recruiters(last_name, first_name)',
      'CREATE INDEX IF NOT EXISTS idx_recruiters_email ON recruiters(email)',
      'CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry_id)',
      'CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)',
      'CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(email_domain)',
      'CREATE INDEX IF NOT EXISTS idx_companies_website ON companies(website)',
      'CREATE INDEX IF NOT EXISTS idx_recruiter_skills ON recruiter_skills(skill_id)',
      'CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name)',
      'CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category)',
      'CREATE INDEX IF NOT EXISTS idx_outreach_recruiter ON outreach_history(recruiter_id)',
      'CREATE INDEX IF NOT EXISTS idx_outreach_mongodb_ids ON outreach_history(mongodb_outreach_id, mongodb_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_outreach_messages_user ON outreach_messages(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_outreach_messages_recruiter ON outreach_messages(recruiter_id)',
      'CREATE INDEX IF NOT EXISTS idx_outreach_messages_status ON outreach_messages(status)'
    ];

    for (const indexQuery of basicIndexes) {
      try {
        await db.query(indexQuery);
      } catch (error) {
        console.log(`Index creation failed (this is usually okay): ${error.message}`);
      }
    }

    // Conditional indexes that depend on specific columns
    if (await columnExists('recruiters', 'title')) {
      try {
        await db.query(`
          CREATE INDEX IF NOT EXISTS idx_recruiters_title ON recruiters USING gin(to_tsvector('english', title));
        `);
      } catch (error) {
        console.log('Title index creation failed (this is usually okay)');
      }
    }

    if (await columnExists('recruiters', 'person_city') && await columnExists('recruiters', 'person_state')) {
      try {
        await db.query(`
          CREATE INDEX IF NOT EXISTS idx_recruiters_city_state ON recruiters(person_city, person_state);
        `);
        console.log('✅ Created city/state index');
      } catch (error) {
        console.log('City/state index creation failed (this is usually okay)');
      }
    } else {
      console.log('⚠️ Skipping city/state index - columns do not exist yet');
    }

    if (await columnExists('recruiters', 'is_active')) {
      try {
        await db.query(`
          CREATE INDEX IF NOT EXISTS idx_recruiters_active ON recruiters(is_active);
        `);
        console.log('✅ Created is_active index');
      } catch (error) {
        console.log('is_active index creation failed (this is usually okay)');
      }
    }
    
    console.log('✅ Indexes created successfully');
    console.log('✅ PostgreSQL tables setup completed successfully');
    
  } catch (error) {
    console.error('Error creating PostgreSQL tables:', error);
    throw error;
  }
};

// Function to seed some initial data for testing
const seedInitialData = async () => {
  try {
    // Minimal seeding for now - we'll add the recruiter import utility later
    const industryCount = await db.query('SELECT COUNT(*) FROM industries');
    
    if (parseInt(industryCount.rows[0].count) === 0) {
      console.log('Seeding initial industry data...');
      
      await db.query(`
        INSERT INTO industries (name, description, primary_category, sub_category) VALUES
        ('Business Services', 'Business consulting, professional services', 'Business Services', 'Custom Software & IT Services'),
        ('Technology', 'Software, hardware, and IT services', 'Business Services', 'Custom Software & IT Services'),
        ('Healthcare', 'Medical services, pharmaceuticals, and healthcare technology', 'Healthcare', 'Healthcare Services'),
        ('Finance', 'Banking, investments, and financial services', 'Financial Services', 'Banking & Financial Services'),
        ('Education', 'Schools, universities, and educational technology', 'Education', 'Education Services'),
        ('Manufacturing', 'Production of goods and related services', 'Manufacturing', 'General Manufacturing'),
        ('Telecommunications', 'Telecom infrastructure and services', 'Telecommunications', 'Telephony & Wireless'),
        ('HR & Staffing', 'Human resources and staffing services', 'Business Services', 'HR & Staffing')
        ON CONFLICT (name) DO NOTHING;
      `);
      
      console.log('Initial industry data seeded successfully');
    }
    
    // Add skills data
    const skillCount = await db.query('SELECT COUNT(*) FROM skills');
    
    if (parseInt(skillCount.rows[0].count) === 0) {
      console.log('Seeding initial skill data...');
      
      await db.query(`
        INSERT INTO skills (name, category) VALUES
        ('JavaScript', 'Programming Languages'),
        ('Python', 'Programming Languages'),
        ('Java', 'Programming Languages'),
        ('React', 'Frontend Development'),
        ('Node.js', 'Backend Development'),
        ('AWS', 'Cloud Computing'),
        ('SQL', 'Database'),
        ('Machine Learning', 'Data Science'),
        ('Product Management', 'Management'),
        ('Technical Recruiting', 'Recruiting'),
        ('Business Development', 'Sales'),
        ('Talent Acquisition', 'Recruiting'),
        ('HR Specialist', 'Human Resources'),
        ('ERP Support', 'Technical Support')
        ON CONFLICT (name) DO NOTHING;
      `);
      
      console.log('Initial skill data seeded successfully');
    }
    
    console.log('Basic initial data seeded successfully');
  } catch (error) {
    console.error('Error seeding initial data:', error);
    throw error;
  }
};

module.exports = { createTables, seedInitialData };