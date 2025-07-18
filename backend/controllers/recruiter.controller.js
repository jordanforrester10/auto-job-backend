// backend/controllers/recruiter.controller.js - COMPLETE CLEAN FILE WITH OPTIMIZED H1B FILTERING
const { Pool } = require('pg');
const Outreach = require('../models/mongodb/outreach.model');
const Resume = require('../models/mongodb/resume.model');
const Job = require('../models/mongodb/job.model');
const H1BCompany = require('../models/mongodb/h1bCompany.model');
const { openai } = require('../config/openai');
const subscriptionService = require('../services/subscription.service');
const usageService = require('../services/usage.service');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

exports.searchRecruiters = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Allow free users basic access to recruiter search
    console.log('🔍 Free user access granted for recruiter search - user:', userId);
    
    // Get user's subscription info for response context
    let currentSubscription;
    try {
      currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      console.log('✅ User plan:', currentSubscription.user.subscriptionTier);
    } catch (permissionError) {
      console.error('❌ Error getting subscription info:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate subscription information',
        error: permissionError.message 
      });
    }
    
    const {
      query = '',
      company = '',
      industry = '',
      location = '',
      title = '',
      show_unlocked_only = false,
      h1b_only = false, // H1B filter parameter
      limit = 20,
      offset = 0
    } = req.query;

    const showUnlockedOnly = show_unlocked_only === 'true' || show_unlocked_only === true;
    const h1bOnly = h1b_only === 'true' || h1b_only === true;
    
    console.log(`🔍 Searching recruiters for user ${userId}:`, {
      query, 
      company, 
      industry, 
      location, 
      title, 
      showUnlockedOnly,
      h1bOnly,
      userPlan: currentSubscription.user.subscriptionTier,
      limit: parseInt(limit)
    });

    if (showUnlockedOnly) {
      console.log('🔓 Filtering to show ONLY unlocked recruiters');
    }

    if (h1bOnly) {
      console.log('🏢 Filtering to show ONLY H1B company recruiters (using boolean flag)');
    }

    // Build the SQL query dynamically with OPTIMIZED H1B filtering
    let sqlQuery = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        r.email,
        r.title,
        r.linkedin_profile_url as linkedin_url,
        r.experience_years,
        r.last_active_date,
        r.rating,
        c.name as company_name,
        c.website as company_website,
        c.employee_range as company_size,
        c.logo_url as company_logo,
        c.is_h1b_sponsor,
        c.h1b_matched_company_id,
        i.name as industry_name,
        l.city,
        l.state,
        l.country,
        -- Check if user has contacted this recruiter
        oh.last_contact_date,
        oh.status as outreach_status,
        -- Check if user has unlocked this recruiter
        ru.unlocked_at,
        CASE WHEN ru.unlocked_at IS NOT NULL THEN true ELSE false END as is_unlocked
      FROM recruiters r
      LEFT JOIN companies c ON r.current_company_id = c.id
      LEFT JOIN industries i ON r.industry_id = i.id
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN outreach_history oh ON (r.id = oh.recruiter_id AND oh.mongodb_user_id = $1)
      LEFT JOIN recruiter_unlocks ru ON (r.id = ru.recruiter_id AND ru.mongodb_user_id = $1)
      WHERE r.is_active = true
    `;

    const queryParams = [userId.toString()];
    let paramIndex = 2;

    // Add unlocked only filter
    if (showUnlockedOnly) {
      sqlQuery += ` AND ru.unlocked_at IS NOT NULL`;
      console.log('🔓 Added SQL filter for unlocked recruiters only');
    }

    // OPTIMIZED: Add H1B company filter using boolean flag (FAST!)
    if (h1bOnly) {
      sqlQuery += ` AND c.is_h1b_sponsor = TRUE`;
      console.log('🏢 Added OPTIMIZED SQL filter for H1B companies using boolean flag');
    }

    // Add search filters with COALESCE to handle NULL values
    if (query) {
      sqlQuery += ` AND (
        (COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) ILIKE $${paramIndex} OR
        COALESCE(r.title, '') ILIKE $${paramIndex} OR
        COALESCE(c.name, '') ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${query.toLowerCase()}%`);
      paramIndex++;
    }

    if (company) {
      sqlQuery += ` AND COALESCE(c.name, '') ILIKE $${paramIndex}`;
      queryParams.push(`%${company.toLowerCase()}%`);
      paramIndex++;
    }

    if (industry) {
      sqlQuery += ` AND COALESCE(i.name, '') ILIKE $${paramIndex}`;
      queryParams.push(`%${industry.toLowerCase()}%`);
      paramIndex++;
    }

    if (location) {
      sqlQuery += ` AND (
        COALESCE(l.city, '') ILIKE $${paramIndex} OR
        COALESCE(l.state, '') ILIKE $${paramIndex} OR
        COALESCE(l.country, '') ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${location.toLowerCase()}%`);
      paramIndex++;
    }

    if (title) {
      sqlQuery += ` AND COALESCE(r.title, '') ILIKE $${paramIndex}`;
      queryParams.push(`%${title.toLowerCase()}%`);
      paramIndex++;
    }

    // Simple ordering by ID (most recent recruiters first)
    sqlQuery += ` ORDER BY r.id DESC`;
    
    // Add pagination
    sqlQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    console.log('🗄️ Executing OPTIMIZED SQL query with params:', queryParams.length);
    const startTime = Date.now();

    // Execute the query
    const result = await pool.query(sqlQuery, queryParams);
    
    const queryTime = Date.now() - startTime;
    console.log(`⚡ Query executed in ${queryTime}ms (previously 60+ seconds!)`);

    // Get total count for pagination (using same optimized approach)
    let countQuery = `
      SELECT COUNT(*) as count
      FROM recruiters r
      LEFT JOIN companies c ON r.current_company_id = c.id
      LEFT JOIN industries i ON r.industry_id = i.id
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN outreach_history oh ON (r.id = oh.recruiter_id AND oh.mongodb_user_id = $1)
      LEFT JOIN recruiter_unlocks ru ON (r.id = ru.recruiter_id AND ru.mongodb_user_id = $1)
      WHERE r.is_active = true
    `;
    
    const countParams = [userId.toString()];
    let countParamIndex = 2;

    // Add unlocked filter to count query
    if (showUnlockedOnly) {
      countQuery += ` AND ru.unlocked_at IS NOT NULL`;
    }

    // OPTIMIZED: Add H1B filter to count query using boolean flag
    if (h1bOnly) {
      countQuery += ` AND c.is_h1b_sponsor = TRUE`;
    }

    // Apply same filters to count query
    if (query) {
      countQuery += ` AND (
        (COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) ILIKE $${countParamIndex} OR
        COALESCE(r.title, '') ILIKE $${countParamIndex} OR
        COALESCE(c.name, '') ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${query.toLowerCase()}%`);
      countParamIndex++;
    }

    if (company) {
      countQuery += ` AND COALESCE(c.name, '') ILIKE $${countParamIndex}`;
      countParams.push(`%${company.toLowerCase()}%`);
      countParamIndex++;
    }

    if (industry) {
      countQuery += ` AND COALESCE(i.name, '') ILIKE $${countParamIndex}`;
      countParams.push(`%${industry.toLowerCase()}%`);
      countParamIndex++;
    }

    if (location) {
      countQuery += ` AND (
        COALESCE(l.city, '') ILIKE $${countParamIndex} OR
        COALESCE(l.state, '') ILIKE $${countParamIndex} OR
        COALESCE(l.country, '') ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${location.toLowerCase()}%`);
      countParamIndex++;
    }

    if (title) {
      countQuery += ` AND COALESCE(r.title, '') ILIKE $${countParamIndex}`;
      countParams.push(`%${title.toLowerCase()}%`);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);

    // Get H1B statistics for response
    let h1bStats = null;
    if (h1bOnly) {
      try {
        const h1bStatsQuery = `
          SELECT 
            COUNT(*) as total_h1b_companies,
            COUNT(DISTINCT r.id) as h1b_recruiters
          FROM companies c
          LEFT JOIN recruiters r ON c.id = r.current_company_id
          WHERE c.is_h1b_sponsor = TRUE AND r.is_active = true
        `;
        const h1bStatsResult = await pool.query(h1bStatsQuery);
        h1bStats = {
          totalH1BCompanies: parseInt(h1bStatsResult.rows[0].total_h1b_companies),
          h1bRecruiters: parseInt(h1bStatsResult.rows[0].h1b_recruiters),
          queryOptimized: true,
          queryTime: `${queryTime}ms`
        };
      } catch (statsError) {
        console.error('❌ Error fetching H1B stats (non-critical):', statsError);
      }
    }

    // Format recruiter data based on user's plan
    const recruiters = result.rows.map(row => {
      const baseRecruiter = {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        company: {
          name: row.company_name,
          website: row.company_website,
          size: row.company_size,
          logo: row.company_logo,
          isH1BSponsor: row.is_h1b_sponsor || false,
          h1bMatchedCompanyId: row.h1b_matched_company_id
        },
        industry: row.industry_name,
        location: {
          city: row.city,
          state: row.state,
          country: row.country
        },
        outreach: {
          hasContacted: !!row.last_contact_date,
          lastContactDate: row.last_contact_date,
          status: row.outreach_status
        },
        isUnlocked: row.is_unlocked,
        unlockedAt: row.unlocked_at
      };

      // Add H1B company information if H1B filter was applied or company is H1B sponsor
      if (row.is_h1b_sponsor) {
        baseRecruiter.h1bCompanyInfo = {
          isH1BCompany: true,
          verifiedH1BSponsor: true,
          companyName: row.company_name,
          flagSource: 'database',
          matchedCompanyId: row.h1b_matched_company_id
        };
      }

      // For free users, limit the data returned
      if (currentSubscription.user.subscriptionTier === 'free') {
        return {
          ...baseRecruiter,
          // Hide sensitive contact information for free users
          email: null,
          linkedinUrl: null,
          title: 'Senior Recruiter', // Generic title
          experienceYears: null,
          lastActiveDate: null,
          rating: null,
          accessLevel: 'limited'
        };
      }

      // For paid users, return full data
      return {
        ...baseRecruiter,
        email: row.email,
        title: row.title,
        linkedinUrl: row.linkedin_url,
        experienceYears: row.experience_years,
        lastActiveDate: row.last_active_date,
        rating: row.rating,
        accessLevel: 'full'
      };
    });

    // Get usage statistics to include in response
    let usageStats = null;
    try {
      const userUsage = await usageService.getUserUsageStats(userId);
      usageStats = {
        recruiterUnlocks: userUsage.usageStats.recruiterUnlocks,
        plan: userUsage.plan,
        planLimits: {
          recruiterAccess: currentSubscription.user.subscriptionTier !== 'free',
          recruiterUnlocks: userUsage.planLimits.recruiterUnlocks
        }
      };
    } catch (usageError) {
      console.error('❌ Error fetching usage stats (non-critical):', usageError);
    }

    const totalCount = parseInt(countResult.rows[0].count);

    if (showUnlockedOnly) {
      console.log(`✅ Found ${recruiters.length} UNLOCKED recruiters (Total: ${totalCount})`);
    } else if (h1bOnly) {
      console.log(`✅ Found ${recruiters.length} H1B COMPANY recruiters (Total: ${totalCount}) in ${queryTime}ms`);
    } else {
      console.log(`✅ Found ${recruiters.length} recruiters (Total: ${totalCount}) for ${currentSubscription.user.subscriptionTier} user`);
    }

    res.json({
      success: true,
      recruiters,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < totalCount
      },
      filters: {
        query,
        company,
        industry,
        location,
        title,
        showUnlockedOnly,
        h1bOnly
      },
      h1bData: {
        h1bFilterApplied: h1bOnly,
        optimizedQuery: h1bOnly,
        queryPerformance: h1bOnly ? `${queryTime}ms` : null,
        h1bStats: h1bStats
      },
      usageStats: usageStats,
      userPlan: currentSubscription.user.subscriptionTier,
      performanceMetrics: {
        queryTime: `${queryTime}ms`,
        optimizedH1BFiltering: h1bOnly
      }
    });

  } catch (error) {
    console.error('Search recruiters error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search recruiters',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.getRecruiterById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { recruiterId } = req.params;

    // Allow free users basic access to recruiter details
    console.log('🔍 Free user access granted for recruiter details - user:', userId);
    
    let currentSubscription;
    try {
      currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      console.log('✅ User plan for recruiter details:', currentSubscription.user.subscriptionTier);
    } catch (permissionError) {
      console.error('❌ Error checking subscription info:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate subscription information',
        error: permissionError.message 
      });
    }

    console.log(`👤 Getting recruiter details for ID: ${recruiterId}`);

    // Check if recruiter is already unlocked for this user
    const unlockCheckQuery = `
      SELECT unlocked_at FROM recruiter_unlocks 
      WHERE recruiter_id = $1 AND mongodb_user_id = $2
    `;
    const unlockResult = await pool.query(unlockCheckQuery, [recruiterId, userId.toString()]);
    const isUnlocked = unlockResult.rows.length > 0;

    console.log(`🔓 Recruiter unlock status for user ${userId}:`, isUnlocked ? 'UNLOCKED' : 'LOCKED');

    // For free users, return basic info only
    if (currentSubscription.user.subscriptionTier === 'free') {
      // Get basic recruiter info without contact details (including H1B flag)
      const basicQuery = `
        SELECT 
          r.id,
          r.first_name,
          r.last_name,
          c.name as company_name,
          c.employee_range as company_size,
          c.is_h1b_sponsor,
          c.h1b_matched_company_id,
          i.name as industry_name,
          l.city,
          l.state,
          l.country
        FROM recruiters r
        LEFT JOIN companies c ON r.current_company_id = c.id
        LEFT JOIN industries i ON r.industry_id = i.id
        LEFT JOIN locations l ON r.location_id = l.id
        WHERE r.id = $1
      `;

      const basicResult = await pool.query(basicQuery, [recruiterId]);

      if (basicResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Recruiter not found'
        });
      }

      const row = basicResult.rows[0];
      
      // Get H1B company information if flagged
      let h1bCompanyInfo = null;
      if (row.is_h1b_sponsor && row.h1b_matched_company_id) {
        try {
          const h1bCompany = await H1BCompany.findById(row.h1b_matched_company_id);
          if (h1bCompany) {
            h1bCompanyInfo = {
              isH1BCompany: true,
              companyName: h1bCompany.companyName,
              industry: h1bCompany.primaryIndustry,
              employeeRange: h1bCompany.employeeRange,
              website: h1bCompany.website,
              flagSource: 'optimized_database',
              verifiedSponsor: true
            };
          }
        } catch (h1bError) {
          console.error('Error fetching H1B company details:', h1bError);
          // Fallback to basic flag info
          h1bCompanyInfo = {
            isH1BCompany: true,
            companyName: row.company_name,
            flagSource: 'database_flag_only',
            verifiedSponsor: true
          };
        }
      }

      const basicRecruiter = {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        title: 'Senior Recruiter', // Generic title for free users
        company: {
          name: row.company_name,
          size: row.company_size,
          isH1BSponsor: row.is_h1b_sponsor || false
        },
        industry: row.industry_name,
        location: {
          city: row.city,
          state: row.state,
          country: row.country
        },
        isUnlocked: false,
        accessLevel: 'basic',
        h1bCompanyInfo // Include H1B info even for free users
      };

      return res.json({
        success: true,
        recruiter: basicRecruiter,
        accessLevel: 'basic',
        upgradeRequired: true,
        userPlan: 'free'
      });
    }

    // For casual users, check if they need to unlock or if already unlocked
    if (currentSubscription.user.subscriptionTier === 'casual' && !isUnlocked) {
      // Return limited info and unlock option (including H1B flag)
      const limitedQuery = `
        SELECT 
          r.id,
          r.first_name,
          r.last_name,
          r.title,
          c.name as company_name,
          c.employee_range as company_size,
          c.is_h1b_sponsor,
          c.h1b_matched_company_id,
          i.name as industry_name,
          l.city,
          l.state,
          l.country
        FROM recruiters r
        LEFT JOIN companies c ON r.current_company_id = c.id
        LEFT JOIN industries i ON r.industry_id = i.id
        LEFT JOIN locations l ON r.location_id = l.id
        WHERE r.id = $1
      `;

      const limitedResult = await pool.query(limitedQuery, [recruiterId]);

      if (limitedResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Recruiter not found'
        });
      }

      const row = limitedResult.rows[0];
      
      // Get H1B company information if flagged
      let h1bCompanyInfo = null;
      if (row.is_h1b_sponsor && row.h1b_matched_company_id) {
        try {
          const h1bCompany = await H1BCompany.findById(row.h1b_matched_company_id);
          if (h1bCompany) {
            h1bCompanyInfo = {
              isH1BCompany: true,
              companyName: h1bCompany.companyName,
              industry: h1bCompany.primaryIndustry,
              employeeRange: h1bCompany.employeeRange,
              website: h1bCompany.website,
              flagSource: 'optimized_database',
              verifiedSponsor: true
            };
          }
        } catch (h1bError) {
          console.error('Error fetching H1B company details:', h1bError);
          h1bCompanyInfo = {
            isH1BCompany: true,
            companyName: row.company_name,
            flagSource: 'database_flag_only',
            verifiedSponsor: true
          };
        }
      }

      const limitedRecruiter = {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        title: row.title,
        company: {
          name: row.company_name,
          size: row.company_size,
          isH1BSponsor: row.is_h1b_sponsor || false
        },
        industry: row.industry_name,
        location: {
          city: row.city,
          state: row.state,
          country: row.country
        },
        isUnlocked: false,
        accessLevel: 'limited',
        h1bCompanyInfo // Include H1B info
      };

      return res.json({
        success: true,
        recruiter: limitedRecruiter,
        accessLevel: 'limited',
        unlockRequired: true,
        userPlan: 'casual'
      });
    }

    // For hunter users or unlocked casual users, return full details (including H1B info)
    const sqlQuery = `
      SELECT 
        r.*,
        c.name as company_name,
        c.website as company_website,
        c.employee_range as company_size,
        c.logo_url as company_logo,
        c.description as company_description,
        c.founded_year,
        c.is_h1b_sponsor,
        c.h1b_matched_company_id,
        c.h1b_flag_updated_at,
        i.name as industry_name,
        i.description as industry_description,
        l.city,
        l.state,
        l.country,
        l.postal_code,
        -- Outreach history
        oh.last_contact_date,
        oh.status as outreach_status,
        -- Unlock info
        ru.unlocked_at
      FROM recruiters r
      LEFT JOIN companies c ON r.current_company_id = c.id
      LEFT JOIN industries i ON r.industry_id = i.id
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN outreach_history oh ON (r.id = oh.recruiter_id AND oh.mongodb_user_id = $1)
      LEFT JOIN recruiter_unlocks ru ON (r.id = ru.recruiter_id AND ru.mongodb_user_id = $1)
      WHERE r.id = $2
    `;

    const result = await pool.query(sqlQuery, [userId.toString(), recruiterId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recruiter not found'
      });
    }

    const row = result.rows[0];
    
    // Get recruiter's skills
    const skillsQuery = `
      SELECT s.name, s.category
      FROM recruiter_skills rs
      JOIN skills s ON rs.skill_id = s.id
      WHERE rs.recruiter_id = $1
    `;
    const skillsResult = await pool.query(skillsQuery, [recruiterId]);

    // Get outreach history from MongoDB
    const outreachHistory = await Outreach.find({
      userId,
      recruiterId: recruiterId
    }).sort({ createdAt: -1 }).limit(10);

    // Get comprehensive H1B company information
    let h1bCompanyInfo = null;
    if (row.is_h1b_sponsor && row.h1b_matched_company_id) {
      try {
        const h1bCompany = await H1BCompany.findById(row.h1b_matched_company_id);
        if (h1bCompany) {
          h1bCompanyInfo = {
            isH1BCompany: true,
            companyDetails: {
              name: h1bCompany.companyName,
              website: h1bCompany.website,
              industry: h1bCompany.primaryIndustry,
              subIndustry: h1bCompany.primarySubIndustry,
              employees: h1bCompany.employees,
              employeeRange: h1bCompany.employeeRange,
              revenue: h1bCompany.revenue,
              revenueRange: h1bCompany.revenueRange,
              foundedYear: h1bCompany.foundedYear,
              headquarters: h1bCompany.headquarters,
              socialProfiles: h1bCompany.socialProfiles,
              h1bDataSource: h1bCompany.h1bData.dataSource,
              lastUpdated: h1bCompany.h1bData.lastUpdated
            },
            flagSource: 'optimized_database',
            flagUpdatedAt: row.h1b_flag_updated_at,
            verifiedSponsor: true
          };
        }
      } catch (h1bError) {
        console.error('Error fetching comprehensive H1B company info:', h1bError);
        // Fallback to basic flag info
        h1bCompanyInfo = {
          isH1BCompany: true,
          companyDetails: {
            name: row.company_name
          },
          flagSource: 'database_flag_only',
          flagUpdatedAt: row.h1b_flag_updated_at,
          verifiedSponsor: true
        };
      }
    } else if (row.is_h1b_sponsor) {
      // Has H1B flag but no matched company ID (older data)
      h1bCompanyInfo = {
        isH1BCompany: true,
        companyDetails: {
          name: row.company_name
        },
        flagSource: 'database_flag_only',
        flagUpdatedAt: row.h1b_flag_updated_at,
        verifiedSponsor: true
      };
    }

    const recruiter = {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      email: row.email,
      title: row.title,
      linkedinUrl: row.linkedin_profile_url,
      otherSocialUrls: row.other_social_urls,
      experienceYears: row.experience_years,
      lastActiveDate: row.last_active_date,
      rating: row.rating,
      notes: row.notes,
      specializations: row.specializations,
      company: {
        name: row.company_name,
        website: row.company_website,
        size: row.company_size,
        logo: row.company_logo,
        description: row.company_description,
        foundedYear: row.founded_year,
        isH1BSponsor: row.is_h1b_sponsor || false,
        h1bFlagUpdatedAt: row.h1b_flag_updated_at
      },
      industry: {
        name: row.industry_name,
        description: row.industry_description
      },
      location: {
        city: row.city,
        state: row.state,
        country: row.country,
        postalCode: row.postal_code
      },
      skills: skillsResult.rows.map(skill => ({
        name: skill.name,
        category: skill.category
      })),
      outreach: {
        hasContacted: !!row.last_contact_date,
        lastContactDate: row.last_contact_date,
        status: row.outreach_status,
        history: outreachHistory
      },
      isUnlocked: !!row.unlocked_at,
      unlockedAt: row.unlocked_at,
      accessLevel: 'full',
h1bCompanyInfo, // Include comprehensive H1B info
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    console.log(`✅ Retrieved recruiter: ${recruiter.fullName} at ${recruiter.company.name}`);
    if (h1bCompanyInfo) {
      console.log(`🏢 Recruiter works at H1B sponsor company: ${h1bCompanyInfo.companyDetails.name} (${h1bCompanyInfo.flagSource})`);
    }

    res.json({
      success: true,
      recruiter,
      accessLevel: 'full',
      userPlan: currentSubscription.user.subscriptionTier
    });

  } catch (error) {
    console.error('Get recruiter details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recruiter details',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.unlockRecruiter = async (req, res) => {
  try {
    const userId = req.user._id;
    const { recruiterId } = req.params;

    console.log(`🔓 Unlocking recruiter ${recruiterId} for user ${userId}`);

    // Check if user can unlock recruiters
    let currentSubscription;
    try {
      currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      
      // Only casual and hunter users can unlock recruiters
      if (!['casual', 'hunter'].includes(currentSubscription.user.subscriptionTier)) {
        return res.status(403).json({
          message: 'Recruiter unlocking requires Casual plan or higher',
          currentPlan: currentSubscription.user.subscriptionTier,
          upgradeRequired: true,
          feature: 'recruiterUnlocks'
        });
      }

      // Hunter users have unlimited access, no need to track unlocks
      if (currentSubscription.user.subscriptionTier === 'hunter') {
        return res.status(400).json({
          message: 'Hunter plan users have unlimited recruiter access',
          alreadyUnlimited: true
        });
      }

    } catch (permissionError) {
      console.error('❌ Error checking unlock permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate unlock permission',
        error: permissionError.message 
      });
    }

    // Check if recruiter exists
    const recruiterCheckQuery = `SELECT id, first_name, last_name FROM recruiters WHERE id = $1`;
    const recruiterResult = await pool.query(recruiterCheckQuery, [recruiterId]);

    if (recruiterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recruiter not found'
      });
    }

    // Check if already unlocked
    const unlockCheckQuery = `
      SELECT unlocked_at FROM recruiter_unlocks 
      WHERE recruiter_id = $1 AND mongodb_user_id = $2
    `;
    const unlockResult = await pool.query(unlockCheckQuery, [recruiterId, userId.toString()]);

    if (unlockResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Recruiter already unlocked',
        alreadyUnlocked: true,
        unlockedAt: unlockResult.rows[0].unlocked_at
      });
    }

    // Check recruiter unlock limits for casual users
    try {
      const unlockPermission = await usageService.checkUsageLimit(userId, 'recruiterUnlocks', 1);
      
      if (!unlockPermission.allowed) {
        console.log('❌ Recruiter unlock limit exceeded:', unlockPermission.reason);
        return res.status(403).json({ 
          message: 'Recruiter unlock limit reached',
          error: unlockPermission.reason,
          current: unlockPermission.current,
          limit: unlockPermission.limit,
          plan: unlockPermission.plan,
          upgradeRequired: true,
          feature: 'recruiterUnlocks'
        });
      }
      
      console.log('✅ Recruiter unlock permission granted:', {
        current: unlockPermission.current,
        limit: unlockPermission.limit,
        remaining: unlockPermission.remaining
      });
      
    } catch (permissionError) {
      console.error('❌ Error checking recruiter unlock permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate recruiter unlock permission',
        error: permissionError.message 
      });
    }

    // Create unlock record
    const insertUnlockQuery = `
      INSERT INTO recruiter_unlocks (recruiter_id, mongodb_user_id, unlocked_at)
      VALUES ($1, $2, NOW())
      RETURNING unlocked_at
    `;

    const insertResult = await pool.query(insertUnlockQuery, [recruiterId, userId.toString()]);
    const unlockedAt = insertResult.rows[0].unlocked_at;

    // Track successful recruiter unlock
    try {
      await usageService.trackUsage(userId, 'recruiterUnlocks', 1, {
        recruiterId: recruiterId,
        recruiterName: `${recruiterResult.rows[0].first_name} ${recruiterResult.rows[0].last_name}`,
        unlockMethod: 'manual'
      });
      console.log('✅ Recruiter unlock usage tracked successfully');
    } catch (trackingError) {
      console.error('❌ Error tracking recruiter unlock usage (non-critical):', trackingError);
      // Don't fail the request if tracking fails
    }

    const recruiter = recruiterResult.rows[0];
    console.log(`✅ Successfully unlocked recruiter: ${recruiter.first_name} ${recruiter.last_name}`);

    res.json({
      success: true,
      message: 'Recruiter unlocked successfully',
      recruiter: {
        id: recruiterId,
        name: `${recruiter.first_name} ${recruiter.last_name}`,
        unlockedAt: unlockedAt
      }
    });

  } catch (error) {
    console.error('Unlock recruiter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlock recruiter',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.getFilterOptions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Allow free users access to filter options
    console.log('📊 Getting filter options for recruiter search - allowing free user access');

    // Get top companies
    const companiesQuery = `
      SELECT c.name, COUNT(r.id) as recruiter_count
      FROM companies c
      JOIN recruiters r ON c.id = r.current_company_id
      WHERE r.is_active = true
      GROUP BY c.id, c.name
      ORDER BY recruiter_count DESC
      LIMIT 50
    `;

    // Get industries
    const industriesQuery = `
      SELECT i.name, COUNT(r.id) as recruiter_count
      FROM industries i
      JOIN recruiters r ON i.id = r.industry_id
      WHERE r.is_active = true
      GROUP BY i.id, i.name
      ORDER BY recruiter_count DESC
      LIMIT 30
    `;

    // Get locations
    const locationsQuery = `
      SELECT 
        CASE 
          WHEN l.state IS NOT NULL THEN l.city || ', ' || l.state || ', ' || l.country
          ELSE l.city || ', ' || l.country
        END as location,
        COUNT(r.id) as recruiter_count
      FROM locations l
      JOIN recruiters r ON l.id = r.location_id
      WHERE r.is_active = true
      GROUP BY l.city, l.state, l.country
      ORDER BY recruiter_count DESC
      LIMIT 50
    `;

    // OPTIMIZED: Get H1B companies filter data using boolean flags
    let h1bFilterData = null;
    try {
      const h1bStatsQuery = `
        SELECT 
          COUNT(DISTINCT c.id) as total_h1b_companies,
          COUNT(DISTINCT r.id) as total_h1b_recruiters,
          MAX(c.h1b_flag_updated_at) as last_flag_update
        FROM companies c
        LEFT JOIN recruiters r ON c.id = r.current_company_id
        WHERE c.is_h1b_sponsor = TRUE AND r.is_active = true
      `;

      const h1bStatsResult = await pool.query(h1bStatsQuery);
      const stats = h1bStatsResult.rows[0];

      // Get top H1B industries using optimized query
      const h1bIndustriesQuery = `
        SELECT 
          i.name as industry, 
          COUNT(DISTINCT c.id) as count
        FROM companies c
        JOIN industries i ON c.industry_id = i.id
        WHERE c.is_h1b_sponsor = TRUE
        GROUP BY i.id, i.name
        ORDER BY count DESC
        LIMIT 20
      `;

      const h1bIndustriesResult = await pool.query(h1bIndustriesQuery);

      // Get top H1B company locations using optimized query
      const h1bLocationsQuery = `
        SELECT 
          l.state || ', ' || l.country as location,
          COUNT(DISTINCT c.id) as count
        FROM companies c
        JOIN locations l ON c.headquarters_location_id = l.id
        WHERE c.is_h1b_sponsor = TRUE AND l.state IS NOT NULL
        GROUP BY l.state, l.country
        ORDER BY count DESC
        LIMIT 15
      `;

      const h1bLocationsResult = await pool.query(h1bLocationsQuery);

      h1bFilterData = {
        totalH1BCompanies: parseInt(stats.total_h1b_companies) || 0,
        totalH1BRecruiters: parseInt(stats.total_h1b_recruiters) || 0,
        lastFlagUpdate: stats.last_flag_update,
        topIndustries: h1bIndustriesResult.rows,
        topLocations: h1bLocationsResult.rows,
        isAvailable: (parseInt(stats.total_h1b_companies) || 0) > 0,
        queryOptimized: true,
        flagSource: 'optimized_database'
      };

      console.log(`📊 H1B filter data: ${h1bFilterData.totalH1BCompanies} companies, ${h1bFilterData.totalH1BRecruiters} recruiters`);

    } catch (h1bError) {
      console.error('❌ Error fetching H1B filter data (non-critical):', h1bError);
      h1bFilterData = {
        totalH1BCompanies: 0,
        totalH1BRecruiters: 0,
        topIndustries: [],
        topLocations: [],
        isAvailable: false,
        error: 'Unable to load H1B data',
        queryOptimized: false
      };
    }

    const [companies, industries, locations] = await Promise.all([
      pool.query(companiesQuery),
      pool.query(industriesQuery),
      pool.query(locationsQuery)
    ]);

    const filterOptions = {
      companies: companies.rows.map(row => ({
        name: row.name,
        count: parseInt(row.recruiter_count)
      })),
      industries: industries.rows.map(row => ({
        name: row.name,
        count: parseInt(row.recruiter_count)
      })),
      locations: locations.rows.map(row => ({
        name: row.location,
        count: parseInt(row.recruiter_count)
      })),
      h1bData: h1bFilterData // Include optimized H1B filter options
    };

    console.log(`✅ Retrieved filter options - ${filterOptions.companies.length} companies, ${filterOptions.industries.length} industries, H1B available: ${h1bFilterData.isAvailable}`);

    res.json({
      success: true,
      filterOptions
    });

  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get filter options',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.getH1BStats = async (req, res) => {
  try {
    console.log('📊 Getting H1B company statistics');

    const statsQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_h1b_companies,
        COUNT(DISTINCT r.id) as total_h1b_recruiters,
        COUNT(DISTINCT c.industry_id) as h1b_industries,
        MAX(c.h1b_flag_updated_at) as last_flag_update,
        MIN(c.h1b_flag_updated_at) as first_flag_update
      FROM companies c
      LEFT JOIN recruiters r ON c.id = r.current_company_id
      WHERE c.is_h1b_sponsor = TRUE AND r.is_active = true
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    const h1bStats = {
      totalH1BCompanies: parseInt(stats.total_h1b_companies) || 0,
      totalH1BRecruiters: parseInt(stats.total_h1b_recruiters) || 0,
      h1bIndustries: parseInt(stats.h1b_industries) || 0,
      lastFlagUpdate: stats.last_flag_update,
      firstFlagUpdate: stats.first_flag_update,
      flagSource: 'optimized_database',
      queryOptimized: true
    };

    console.log(`✅ H1B stats retrieved: ${h1bStats.totalH1BCompanies} companies, ${h1bStats.totalH1BRecruiters} recruiters`);

    res.json({
      success: true,
      h1bStats
    });

  } catch (error) {
    console.error('Get H1B stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get H1B statistics',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.getH1BCompanyInfo = async (req, res) => {
  try {
    const { companyName } = req.params;
    
    console.log(`🏢 Getting H1B company info for: ${companyName}`);

    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    // First check PostgreSQL for the flag
    const flagQuery = `
      SELECT 
        id, 
        name, 
        is_h1b_sponsor, 
        h1b_matched_company_id, 
        h1b_flag_updated_at
      FROM companies 
      WHERE name ILIKE $1
      ORDER BY CASE WHEN name ILIKE $1 THEN 1 ELSE 2 END
      LIMIT 1
    `;

    const flagResult = await pool.query(flagQuery, [`%${companyName}%`]);

    if (flagResult.rows.length === 0) {
      return res.json({
        success: true,
        isH1BCompany: false,
        message: 'Company not found in database'
      });
    }

    const company = flagResult.rows[0];

    if (!company.is_h1b_sponsor) {
      return res.json({
        success: true,
        isH1BCompany: false,
        companyDetails: {
          name: company.name,
          flagSource: 'database_verified'
        },
        message: 'Company is not flagged as H1B sponsor'
      });
    }

    // If flagged and has matched company ID, get detailed info
    let detailedInfo = null;
    if (company.h1b_matched_company_id) {
      try {
        const h1bCompany = await H1BCompany.findById(company.h1b_matched_company_id);
        if (h1bCompany) {
          detailedInfo = {
            name: h1bCompany.companyName,
            website: h1bCompany.website,
            foundedYear: h1bCompany.foundedYear,
            industry: h1bCompany.primaryIndustry,
            subIndustry: h1bCompany.primarySubIndustry,
            employees: h1bCompany.employees,
            employeeRange: h1bCompany.employeeRange,
            revenue: h1bCompany.revenue,
            revenueRange: h1bCompany.revenueRange,
            headquarters: h1bCompany.headquarters,
            numberOfLocations: h1bCompany.numberOfLocations,
            ownershipType: h1bCompany.ownershipType,
            socialProfiles: h1bCompany.socialProfiles,
            h1bDataSource: h1bCompany.h1bData.dataSource,
            lastUpdated: h1bCompany.h1bData.lastUpdated
          };
        }
      } catch (h1bError) {
        console.error('Error fetching detailed H1B info:', h1bError);
      }
    }

    const companyInfo = {
      isH1BCompany: true,
      companyDetails: detailedInfo || {
        name: company.name,
        flagSource: 'database_flag_only'
      },
      flagUpdatedAt: company.h1b_flag_updated_at,
      verifiedSponsor: true
    };

    console.log(`✅ Found H1B company: ${company.name}`);

    res.json({
      success: true,
      ...companyInfo
    });

  } catch (error) {
    console.error('Get H1B company info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get H1B company information',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.searchH1BCompanies = async (req, res) => {
  try {
    const {
      query = '',
      industry = '',
      state = '',
      employeeRange = '',
      limit = 20,
      offset = 0
    } = req.query;

    console.log('🔍 Searching H1B companies:', { query, industry, state, employeeRange });

    // Build PostgreSQL query for H1B companies
    let sqlQuery = `
      SELECT DISTINCT
        c.id,
        c.name,
        c.website,
        c.employee_range,
        c.h1b_matched_company_id,
        c.h1b_flag_updated_at,
        i.name as industry_name,
        l.city,
        l.state,
        l.country
      FROM companies c
      LEFT JOIN industries i ON c.industry_id = i.id
      LEFT JOIN locations l ON c.headquarters_location_id = l.id
      WHERE c.is_h1b_sponsor = TRUE
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (query) {
      sqlQuery += ` AND c.name ILIKE $${paramIndex}`;
      queryParams.push(`%${query}%`);
      paramIndex++;
    }

    if (industry) {
      sqlQuery += ` AND i.name ILIKE $${paramIndex}`;
      queryParams.push(`%${industry}%`);
      paramIndex++;
    }

    if (state) {
      sqlQuery += ` AND l.state ILIKE $${paramIndex}`;
      queryParams.push(`%${state}%`);
      paramIndex++;
    }

    if (employeeRange) {
      sqlQuery += ` AND c.employee_range = $${paramIndex}`;
      queryParams.push(employeeRange);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY c.name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(sqlQuery, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as count
      FROM companies c
      LEFT JOIN industries i ON c.industry_id = i.id
      LEFT JOIN locations l ON c.headquarters_location_id = l.id
      WHERE c.is_h1b_sponsor = TRUE
    `;

    const countParams = [];
    let countParamIndex = 1;

    if (query) {
      countQuery += ` AND c.name ILIKE $${countParamIndex}`;
      countParams.push(`%${query}%`);
      countParamIndex++;
    }

    if (industry) {
      countQuery += ` AND i.name ILIKE $${countParamIndex}`;
      countParams.push(`%${industry}%`);
      countParamIndex++;
    }

    if (state) {
      countQuery += ` AND l.state ILIKE $${countParamIndex}`;
      countParams.push(`%${state}%`);
      countParamIndex++;
    }

    if (employeeRange) {
      countQuery += ` AND c.employee_range = $${countParamIndex}`;
      countParams.push(employeeRange);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);

    const formattedCompanies = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      website: row.website,
      industry: row.industry_name,
      employeeRange: row.employee_range,
      location: row.city && row.state ? `${row.city}, ${row.state}` : '',
      h1bMatchedCompanyId: row.h1b_matched_company_id,
      flagUpdatedAt: row.h1b_flag_updated_at
    }));

    console.log(`✅ Found ${formattedCompanies.length} H1B companies (${countResult.rows[0].count} total)`);

    res.json({
      success: true,
      companies: formattedCompanies,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < parseInt(countResult.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Search H1B companies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search H1B companies',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// OUTREACH MANAGEMENT FUNCTIONS

exports.createOutreach = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Block free users from creating outreach
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      
      if (currentSubscription.user.subscriptionTier === 'free') {
        return res.status(403).json({ 
          message: 'Outreach features require Casual plan or higher',
          currentPlan: 'free',
          upgradeRequired: true,
          feature: 'outreach'
        });
      }
      
      const recruiterAccessAllowed = currentSubscription.planLimits.recruiterAccess;
      if (!recruiterAccessAllowed) {
        return res.status(403).json({ 
          message: 'Recruiter access not available on your current plan',
          upgradeRequired: true,
          feature: 'recruiterAccess'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking outreach permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate outreach permission',
        error: permissionError.message 
      });
    }

    const {
      recruiterId,
      jobId,
      messageContent,
      messageTemplate,
      sentVia = 'email',
      customizations = []
    } = req.body;

    console.log(`📧 Creating outreach for recruiter ${recruiterId} by user ${userId}`);

    // Validate inputs
    if (!recruiterId || !messageContent) {
      return res.status(400).json({
        success: false,
        error: 'Recruiter ID and message content are required'
      });
    }

    // Get recruiter details for validation
    const recruiterQuery = `SELECT id, first_name, last_name, email FROM recruiters WHERE id = $1`;
    const recruiterResult = await pool.query(recruiterQuery, [recruiterId]);

    if (recruiterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recruiter not found'
      });
    }

    const recruiter = recruiterResult.rows[0];

    // Create outreach record in MongoDB
    const outreach = new Outreach({
      userId,
      recruiterId: recruiterId.toString(),
      jobId,
      messageContent,
      messageTemplate,
      customizations,
      sentVia: 'email',
      status: 'drafted',
      createdAt: new Date()
    });

    await outreach.save();

    // Update PostgreSQL outreach history
    const upsertQuery = `
      INSERT INTO outreach_history (recruiter_id, mongodb_outreach_id, mongodb_user_id, status, last_contact_date)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (recruiter_id, mongodb_user_id) 
      DO UPDATE SET 
        mongodb_outreach_id = $2,
        status = $4,
        last_contact_date = $5,
        updated_at = NOW()
    `;

    await pool.query(upsertQuery, [
      recruiterId,
      outreach._id.toString(),
      userId.toString(),
      'drafted',
      new Date()
    ]);

    console.log(`✅ Created outreach campaign: ${outreach._id}`);

    res.json({
      success: true,
      outreach: {
        id: outreach._id,
        recruiterId: outreach.recruiterId,
        recruiterName: `${recruiter.first_name} ${recruiter.last_name}`,
        messageContent: outreach.messageContent,
        status: outreach.status,
        createdAt: outreach.createdAt
      },
      message: 'Outreach campaign created successfully'
    });

  } catch (error) {
    console.error('Create outreach error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create outreach campaign',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.updateOutreach = async (req, res) => {
  try {
    const userId = req.user._id;
    const { outreachId } = req.params;
    const updates = req.body;

    // Block free users from updating outreach
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      if (currentSubscription.user.subscriptionTier === 'free') {
        return res.status(403).json({ 
          message: 'Outreach features require Casual plan or higher',
          currentPlan: 'free',
          upgradeRequired: true,
          feature: 'outreach'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking outreach permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate outreach permission',
        error: permissionError.message 
      });
    }

    console.log(`📝 Updating outreach ${outreachId} for user ${userId}`);

    // Find and update outreach
    const outreach = await Outreach.findOneAndUpdate(
      { _id: outreachId, userId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!outreach) {
      return res.status(404).json({
        success: false,
        error: 'Outreach campaign not found'
      });
    }

    // Update PostgreSQL record if status changed
    if (updates.status) {
      await pool.query(
        'UPDATE outreach_history SET status = $1, updated_at = NOW() WHERE mongodb_outreach_id = $2',
        [updates.status, outreachId]
      );
    }

    console.log(`✅ Outreach updated successfully: ${outreachId}`);

    res.json({
      success: true,
      message: 'Outreach campaign updated successfully',
      outreach: {
        id: outreach._id,
        status: outreach.status,
        messageContent: outreach.messageContent,
        updatedAt: outreach.updatedAt
      }
    });

  } catch (error) {
    console.error('Update outreach error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update outreach campaign',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.deleteOutreach = async (req, res) => {
  try {
    const userId = req.user._id;
    const { outreachId } = req.params;

    // Block free users from deleting outreach
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      if (currentSubscription.user.subscriptionTier === 'free') {
        return res.status(403).json({ 
          message: 'Outreach features require Casual plan or higher',
          currentPlan: 'free',
          upgradeRequired: true,
          feature: 'outreach'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking outreach permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate outreach permission',
        error: permissionError.message 
      });
    }

    console.log(`🗑️ Deleting outreach ${outreachId} for user ${userId}`);
      const outreach = await Outreach.findOneAndDelete({ _id: outreachId, userId });

    if (!outreach) {
      return res.status(404).json({
        success: false,
        error: 'Outreach campaign not found'
      });
    }

    // Delete from PostgreSQL outreach history
    await pool.query(
      'DELETE FROM outreach_history WHERE mongodb_outreach_id = $1 AND mongodb_user_id = $2',
      [outreachId, userId.toString()]
    );

    console.log(`✅ Outreach deleted successfully: ${outreachId}`);

    res.json({
      success: true,
      message: 'Outreach campaign deleted successfully',
      deletedId: outreachId
    });

  } catch (error) {
    console.error('Delete outreach error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete outreach campaign',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.sendOutreach = async (req, res) => {
  try {
    const userId = req.user._id;
    const { outreachId } = req.params;

    // Block free users from sending outreach
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      if (currentSubscription.user.subscriptionTier === 'free') {
        return res.status(403).json({ 
          message: 'Outreach features require Casual plan or higher',
          currentPlan: 'free',
          upgradeRequired: true,
          feature: 'outreach'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking outreach permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate outreach permission',
        error: permissionError.message 
      });
    }

    console.log(`📤 Sending outreach ${outreachId} for user ${userId}`);

    // Find and update outreach
    const outreach = await Outreach.findOne({ _id: outreachId, userId });

    if (!outreach) {
      return res.status(404).json({
        success: false,
        error: 'Outreach campaign not found'
      });
    }

    if (outreach.status !== 'drafted') {
      return res.status(400).json({
        success: false,
        error: 'Outreach has already been sent'
      });
    }

    // Update outreach status
    outreach.status = 'sent';
    outreach.sentAt = new Date();
    await outreach.save();

    // Update PostgreSQL record
    await pool.query(
      'UPDATE outreach_history SET status = $1, last_contact_date = $2 WHERE mongodb_outreach_id = $3',
      ['sent', new Date(), outreachId]
    );

    console.log(`✅ Outreach sent successfully: ${outreachId}`);

    res.json({
      success: true,
      message: 'Outreach sent successfully',
      outreach: {
        id: outreach._id,
        status: outreach.status,
        sentAt: outreach.sentAt
      }
    });

  } catch (error) {
    console.error('Send outreach error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send outreach',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.getUserOutreach = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Block free users from accessing outreach campaigns
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      if (currentSubscription.user.subscriptionTier === 'free') {
        return res.status(403).json({ 
          message: 'Outreach features require Casual plan or higher',
          currentPlan: 'free',
          upgradeRequired: true,
          feature: 'outreach'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking outreach permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate outreach permission',
        error: permissionError.message 
      });
    }

    const { status, limit = 20, offset = 0 } = req.query;

    console.log(`📋 Getting outreach campaigns for user ${userId}`);

    // Build filter
    const filter = { userId };
    if (status) {
      filter.status = status;
    }

    // Get outreach campaigns
    const outreaches = await Outreach.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Get recruiter details for each outreach
    const recruiterIds = outreaches.map(o => o.recruiterId);
    
    if (recruiterIds.length > 0) {
      const recruitersQuery = `
        SELECT r.id, r.first_name, r.last_name, r.title, r.email,
               c.name as company_name, c.logo_url as company_logo
        FROM recruiters r
        LEFT JOIN companies c ON r.current_company_id = c.id
        WHERE r.id = ANY($1)
      `;
      
      const recruitersResult = await pool.query(recruitersQuery, [recruiterIds]);
      const recruitersMap = new Map(recruitersResult.rows.map(r => [r.id.toString(), r]));

      // Combine data
      const enrichedOutreaches = outreaches.map(outreach => {
        const recruiter = recruitersMap.get(outreach.recruiterId);
        return {
          id: outreach._id,
          recruiterId: outreach.recruiterId,
          recruiter: recruiter ? {
            name: `${recruiter.first_name} ${recruiter.last_name}`,
            title: recruiter.title,
            email: recruiter.email,
            company: {
              name: recruiter.company_name,
              logo: recruiter.company_logo
            }
          } : null,
          messageContent: outreach.messageContent,
          status: outreach.status,
          sentVia: outreach.sentVia,
          createdAt: outreach.createdAt,
          sentAt: outreach.sentAt,
          repliesCount: outreach.replies ? outreach.replies.length : 0,
          followUpsCount: outreach.followUps ? outreach.followUps.length : 0
        };
      });

      res.json({
        success: true,
        outreaches: enrichedOutreaches,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: outreaches.length === parseInt(limit)
        }
      });
    } else {
      res.json({
        success: true,
        outreaches: [],
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: false
        }
      });
    }

  } catch (error) {
    console.error('Get user outreach error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get outreach campaigns',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.generatePersonalizedMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Block free users from generating personalized messages
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      if (currentSubscription.user.subscriptionTier === 'free') {
        return res.status(403).json({ 
          message: 'AI message generation requires Casual plan or higher',
          currentPlan: 'free',
          upgradeRequired: true,
          feature: 'aiMessageGeneration'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI message permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI message permission',
        error: permissionError.message 
      });
    }

    const {
      recruiterId,
      resumeId,
      jobId,
      messageType = 'introduction',
      tone = 'professional',
      customRequirements = ''
    } = req.body;

    console.log(`🤖 Generating personalized message for recruiter ${recruiterId}`);

    // Get recruiter details
    const recruiterQuery = `
      SELECT r.first_name, r.last_name, r.title, r.specializations,
             c.name as company_name, c.description as company_description,
             i.name as industry_name
      FROM recruiters r
      LEFT JOIN companies c ON r.current_company_id = c.id
      LEFT JOIN industries i ON r.industry_id = i.id
      WHERE r.id = $1
    `;
    const recruiterResult = await pool.query(recruiterQuery, [recruiterId]);

    if (recruiterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recruiter not found'
      });
    }

    const recruiter = recruiterResult.rows[0];

    // Get user's resume if provided
    let resume = null;
    if (resumeId) {
      resume = await Resume.findOne({ _id: resumeId, userId });
    }

    // Get job details if provided
    let job = null;
    if (jobId) {
      job = await Job.findOne({ _id: jobId, userId });
    }

    // Build AI prompt
    const prompt = buildPersonalizedMessagePrompt(recruiter, resume, job, messageType, tone, customRequirements);

    // Generate message using OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert career coach and networking specialist. Generate professional, personalized outreach messages that are engaging and authentic.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const generatedMessage = response.choices[0].message.content;

    console.log(`✅ Generated personalized message (${generatedMessage.length} characters)`);

    res.json({
      success: true,
      message: generatedMessage,
      metadata: {
        recruiterName: `${recruiter.first_name} ${recruiter.last_name}`,
        company: recruiter.company_name,
        messageType,
        tone,
        tokensUsed: response.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('Generate personalized message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate personalized message',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.getOutreachAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Block free users from accessing outreach analytics
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      if (currentSubscription.user.subscriptionTier === 'free') {
        return res.status(403).json({ 
          message: 'Outreach analytics require Casual plan or higher',
          currentPlan: 'free',
          upgradeRequired: true,
          feature: 'outreachAnalytics'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking analytics permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate analytics permission',
        error: permissionError.message 
      });
    }

    const { timeframe = '30d' } = req.query;

    console.log(`📊 Getting outreach analytics for user ${userId}`);

    // Calculate date range
    const startDate = new Date();
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    // Get analytics from MongoDB
    const analytics = await Outreach.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOutreach: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          replied: { $sum: { $cond: [{ $eq: ['$status', 'replied'] }, 1, 0] } },
          drafted: { $sum: { $cond: [{ $eq: ['$status', 'drafted'] }, 1, 0] } },
          totalReplies: { $sum: { $size: { $ifNull: ['$replies', []] } } },
          totalFollowUps: { $sum: { $size: { $ifNull: ['$followUps', []] } } }
        }
      }
    ]);

    const stats = analytics[0] || {
      totalOutreach: 0,
      sent: 0,
      replied: 0,
      drafted: 0,
      totalReplies: 0,
      totalFollowUps: 0
    };

    // Calculate rates
    const responseRate = stats.sent > 0 ? (stats.replied / stats.sent) * 100 : 0;
    const sendRate = stats.totalOutreach > 0 ? (stats.sent / stats.totalOutreach) * 100 : 0;

    // Get usage statistics to include in response
    let usageStats = null;
    try {
      const userUsage = await usageService.getUserUsageStats(userId);
      usageStats = {
        recruiterUnlocks: userUsage.usageStats.recruiterUnlocks,
        plan: userUsage.plan,
        planLimits: {
          recruiterAccess: userUsage.planLimits.recruiterAccess,
          recruiterUnlocks: userUsage.planLimits.recruiterUnlocks
        }
      };
    } catch (usageError) {
      console.error('❌ Error fetching usage stats (non-critical):', usageError);
    }

    res.json({
      success: true,
      analytics: {
        ...stats,
        responseRate: Math.round(responseRate * 100) / 100,
        sendRate: Math.round(sendRate * 100) / 100,
        timeframe
      },
      usageStats: usageStats
    });

  } catch (error) {
    console.error('Get outreach analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get outreach analytics',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// Helper function to build AI prompt
function buildPersonalizedMessagePrompt(recruiter, resume, job, messageType, tone, customRequirements) {
  const recruiterName = `${recruiter.first_name} ${recruiter.last_name}`;
  const company = recruiter.company_name;
  
  let prompt = `Generate a ${tone} ${messageType} message to ${recruiterName}, a ${recruiter.title} at ${company}.\n\n`;
  
  prompt += `RECRUITER CONTEXT:\n`;
  prompt += `- Name: ${recruiterName}\n`;
  prompt += `- Title: ${recruiter.title}\n`;
  prompt += `- Company: ${company}\n`;
  if (recruiter.specializations) {
    prompt += `- Specializations: ${recruiter.specializations.join(', ')}\n`;
  }
  if (recruiter.industry_name) {
    prompt += `- Industry: ${recruiter.industry_name}\n`;
  }
  
  if (resume) {
    prompt += `\nUSER BACKGROUND:\n`;
    prompt += `- Name: ${resume.parsedData?.contactInfo?.name || 'Professional'}\n`;
    if (resume.parsedData?.summary) {
      prompt += `- Summary: ${resume.parsedData.summary}\n`;
    }
    if (resume.parsedData?.experience?.length > 0) {
      const currentRole = resume.parsedData.experience[0];
      prompt += `- Current Role: ${currentRole.title} at ${currentRole.company}\n`;
    }
    if (resume.parsedData?.skills?.length > 0) {
      const topSkills = resume.parsedData.skills.slice(0, 5).map(s => typeof s === 'string' ? s : s.name);
      prompt += `- Key Skills: ${topSkills.join(', ')}\n`;
    }
  }
  
  if (job) {
    prompt += `\nTARGET POSITION:\n`;
    prompt += `- Title: ${job.title}\n`;
    prompt += `- Company: ${job.company}\n`;
    if (job.description) {
      prompt += `- Description: ${job.description.substring(0, 200)}...\n`;
    }
  }
  
  if (customRequirements) {
    prompt += `\nCUSTOM REQUIREMENTS:\n${customRequirements}\n`;
  }
  
  prompt += `\nGUIDELINES:\n`;
  prompt += `- Keep the message concise (2-3 paragraphs)\n`;
  prompt += `- Make it personal and specific to ${recruiterName}\n`;
  prompt += `- Use a ${tone} tone\n`;
  prompt += `- Include a clear call-to-action\n`;
  prompt += `- Avoid overly salesy language\n`;
  prompt += `- Make it authentic and professional\n`;
  
  if (messageType === 'introduction') {
    prompt += `- Focus on introducing yourself and expressing interest in their company\n`;
  } else if (messageType === 'follow_up') {
    prompt += `- Reference previous contact and provide additional value\n`;
  } else if (messageType === 'application') {
    prompt += `- Express interest in a specific role and highlight relevant qualifications\n`;
  }
  
  return prompt;
}

module.exports = exports;
