// backend/models/postgresql/schema.js - CLEANED VERSION WITHOUT UNWANTED COLUMNS
const db = require('../../config/postgresql');

const createTables = async () => {
  try {
    console.log('Creating PostgreSQL tables...');
    
    // Industries Table - REMOVED sic_codes, naics_codes
    await db.query(`
      CREATE TABLE IF NOT EXISTS industries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
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
    
    // Companies Table - REMOVED unwanted columns
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
        linkedin_url TEXT,
        facebook_url TEXT,
        twitter_url TEXT,
        funding_total DECIMAL(15,2),
        funding_total_usd_thousands INTEGER,
        recent_funding DECIMAL(15,2),
        recent_funding_usd_thousands INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Add missing columns to companies table if they don't exist
    console.log('Checking and adding missing columns to companies table...');
    
    const companyColumnsToAdd = [
      { name: 'revenue_usd_thousands', type: 'INTEGER' },
      { name: 'funding_total_usd_thousands', type: 'INTEGER' },
      { name: 'recent_funding_usd_thousands', type: 'INTEGER' }
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
    
    // Recruiters Table - REMOVED zoominfo_url, zoominfo_profile_url
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
        linkedin_url TEXT,
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

    // ======================================
    // SUBSCRIPTION TABLES (MONTHLY ONLY)
    // ======================================

    // Subscription Plans Table - Monthly only pricing
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
        stripe_monthly_price_id VARCHAR(255),
        features JSONB NOT NULL DEFAULT '{}',
        limits JSONB NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // User Subscriptions Table - Monthly billing only
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(24) NOT NULL UNIQUE,
        subscription_plan_id INTEGER REFERENCES subscription_plans(id),
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        canceled_at TIMESTAMP,
        trial_start TIMESTAMP,
        trial_end TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // User Usage Tracking Table - Monthly usage tracking per feature
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_usage (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(24) NOT NULL,
        usage_period DATE NOT NULL,
        resume_uploads INTEGER DEFAULT 0,
        resume_analysis INTEGER DEFAULT 0,
        job_imports INTEGER DEFAULT 0,
        resume_tailoring INTEGER DEFAULT 0,
        recruiter_unlocks INTEGER DEFAULT 0,
        ai_job_discovery INTEGER DEFAULT 0,
        ai_conversations INTEGER DEFAULT 0,
        ai_messages_total INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, usage_period)
      );
    `);

    // AI Assistant Usage Table - Detailed AI conversation tracking
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_assistant_usage (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(24) NOT NULL,
        conversation_id VARCHAR(24),
        message_count INTEGER DEFAULT 1,
        tokens_used INTEGER DEFAULT 0,
        cost_usd DECIMAL(10,4) DEFAULT 0,
        feature_type VARCHAR(100),
        usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Payment History Table - Transaction records
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(24) NOT NULL,
        stripe_payment_intent_id VARCHAR(255) UNIQUE,
        stripe_invoice_id VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'usd',
        status VARCHAR(50) NOT NULL,
        payment_method VARCHAR(100),
        billing_reason VARCHAR(100),
        description TEXT,
        invoice_url TEXT,
        receipt_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Webhook Events Table - Track Stripe webhook events for debugging
    await db.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        data JSONB,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMP
      );
    `);
    
    console.log('✅ Tables created successfully');
    
    // Create Indexes
    console.log('Creating indexes...');
    
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
      'CREATE INDEX IF NOT EXISTS idx_outreach_messages_status ON outreach_messages(status)',
      
      // Subscription-related indexes
      'CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status)',
      'CREATE INDEX IF NOT EXISTS idx_user_usage_user_period ON user_usage(user_id, usage_period)',
      'CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_assistant_usage(user_id, usage_date)',
      'CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_payment ON payment_history(stripe_payment_intent_id)',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id)',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed)',
      'CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, sort_order)'
    ];

    for (const indexQuery of basicIndexes) {
      try {
        await db.query(indexQuery);
      } catch (error) {
        console.log(`Index creation failed (this is usually okay): ${error.message}`);
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
    // Seed industry data
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
    
    // Seed skills data
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

    // Seed subscription plans (MONTHLY ONLY)
    const planCount = await db.query('SELECT COUNT(*) FROM subscription_plans');
    
    if (parseInt(planCount.rows[0].count) === 0) {
      console.log('Seeding monthly subscription plans...');
      
      await db.query(`
        INSERT INTO subscription_plans (
          name, 
          display_name, 
          description, 
          price_monthly,
          stripe_monthly_price_id,
          features,
          limits,
          sort_order
        ) VALUES
        (
          'free',
          'Free',
          'Perfect for getting started with job searching',
          0.00,
          NULL,
          '{"resumeUploads": true, "resumeAnalysis": true, "jobImports": true, "resumeTailoring": true, "recruiterAccess": false, "aiJobDiscovery": false, "aiAssistant": false}',
          '{"resumeUploads": 1, "resumeAnalysis": 1, "jobImports": 3, "resumeTailoring": 1, "recruiterUnlocks": 0, "aiJobDiscovery": 0, "aiAssistant": false, "aiConversations": 0, "aiMessagesPerConversation": 0}',
          1
        ),
        (
          'casual',
          'Casual',
          'For active job seekers who want more tools',
          19.99,
          'price_casual_monthly_placeholder',
          '{"resumeUploads": true, "resumeAnalysis": true, "jobImports": true, "resumeTailoring": true, "recruiterAccess": true, "recruiterUnlocks": true, "aiJobDiscovery": true, "aiAssistant": false}',
          '{"resumeUploads": 5, "resumeAnalysis": 5, "jobImports": 25, "resumeTailoring": 25, "recruiterUnlocks": 25, "aiJobDiscovery": 1, "aiAssistant": false, "aiConversations": 0, "aiMessagesPerConversation": 0}',
          2
        ),
        (
          'hunter',
          'Hunter',
          'For serious job hunters who want unlimited access',
          49.99,
          'price_hunter_monthly_placeholder',
          '{"resumeUploads": true, "resumeAnalysis": true, "jobImports": true, "resumeTailoring": true, "recruiterAccess": true, "recruiterUnlocks": true, "aiJobDiscovery": true, "aiAssistant": true}',
          '{"resumeUploads": -1, "resumeAnalysis": -1, "jobImports": -1, "resumeTailoring": 50, "recruiterUnlocks": -1, "aiJobDiscovery": -1, "aiAssistant": true, "aiConversations": 5, "aiMessagesPerConversation": 20}',
          3
        )
        ON CONFLICT (name) DO NOTHING;
      `);
      
      console.log('Monthly subscription plans seeded successfully');
      console.log('⚠️ Remember to update the stripe_monthly_price_id values with your actual Stripe price IDs!');
    }
    
    console.log('Basic initial data seeded successfully');
  } catch (error) {
    console.error('Error seeding initial data:', error);
    throw error;
  }
};

module.exports = { createTables, seedInitialData };