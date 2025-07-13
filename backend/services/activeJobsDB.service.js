// services/activeJobsDB.service.js - SIMPLIFIED VERSION WITH DIRECT ENDPOINT
require('dotenv').config();
const axios = require('axios');

/**
 * Budget-Optimized Active Jobs DB API Service
 * Designed for FREE PLAN: 250 jobs/month limit
 * Strategy: Direct endpoint call with precision targeting
 */
class ActiveJobsDBExtractor {
  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY;
    this.baseUrl = 'https://active-jobs-db.p.rapidapi.com';
    this.workingEndpoint = '/active-ats-7d'; // Direct working endpoint
    this.defaultHeaders = {
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': 'active-jobs-db.p.rapidapi.com'
    };
    
    // Budget tracking
    this.monthlyBudget = 250;      // Free plan limit
    this.dailySafeLimit = 8;       // Conservative daily limit
    this.jobsPerCall = 8;          // Small targeted calls
    
    // Enhanced logging for budget tracking
    this.diagnosticsEnabled = true;
    this.searchAttempts = 0;
    this.successfulSearches = 0;
    this.totalJobsFound = 0;
    
    if (!this.apiKey) {
      console.warn('⚠️ Active Jobs DB API key not configured. Set RAPIDAPI_KEY in .env file');
      console.warn('🔗 Get API key at: https://rapidapi.com/fantastic-jobs-fantastic-jobs-default/api/active-jobs-db');
    } else {
      console.log('🎯 ActiveJobsDBExtractor initialized with BUDGET-CONSCIOUS strategy');
      console.log('💰 Budget limits: 250 jobs/month, 8 jobs/day safe limit');
      console.log('🔍 Strategy: Direct endpoint with precision targeting');
      console.log('🌐 Coverage: 100,000+ company career sites and ATS platforms');
    }
  }

  /**
   * SIMPLIFIED API search with direct endpoint
   */
  async searchActiveJobsDB(searchParams) {
    const {
      jobTitle,
      location = '',
      experienceLevel,
      limit = this.jobsPerCall,
      remote = false,
      keywords = []
    } = searchParams;

    this.searchAttempts++;

    try {
      // Build precise query parameters for the /active-ats-7d endpoint
      const params = {};

      // Add job title using title_filter parameter
      if (jobTitle) {
        params.title_filter = `"${this.buildPrecisionQuery(jobTitle, keywords)}"`;
      }

      // Add location using location_filter parameter
      if (location && !remote && !location.toLowerCase().includes('remote')) {
        params.location_filter = `"${location}"`;
      }

      // Standard parameters
      params.limit = Math.min(limit, this.jobsPerCall);
      params.offset = 0;
      params.description_type = 'text';

      // Direct API call to working endpoint
      const url = `${this.baseUrl}${this.workingEndpoint}`;
      
      if (this.diagnosticsEnabled) {
        console.log(`🌐 BUDGET-CONSCIOUS API request: ${url}`);
        console.log(`💰 Budget usage: Requesting ${params.limit} jobs`);
        console.log(`🎯 Query: ${params.title_filter || 'no title filter'}`);
        console.log(`📍 Location: ${params.location_filter || 'any location'}`);
        console.log(`📊 Monthly budget tracker: ~${this.searchAttempts * this.jobsPerCall}/${this.monthlyBudget} jobs used`);
      }
      
      const response = await axios.get(url, { 
        params,
        headers: this.defaultHeaders,
        timeout: 30000
      });

      console.log(`✅ Success with direct endpoint: ${this.workingEndpoint}`);
      
      const data = response.data;
      this.successfulSearches++;
      
      if (this.diagnosticsEnabled) {
        const resultCount = Array.isArray(data) ? data.length : (data.jobs?.length || Object.keys(data).length);
        console.log(`📊 API response: ${resultCount} jobs returned (Budget impact: ${resultCount} jobs)`);
        console.log(`💰 Budget tracking: ${this.successfulSearches} successful calls made`);
      }

      const jobs = [];
      
      // Handle response format - Active Jobs DB returns array directly
      let jobList = [];
      if (Array.isArray(data)) {
        jobList = data;
      } else if (data.jobs && Array.isArray(data.jobs)) {
        jobList = data.jobs;
      } else if (data.data && Array.isArray(data.data)) {
        jobList = data.data;
      } else {
        console.log('📋 Unexpected response structure:', Object.keys(data));
        jobList = [];
      }

      if (jobList.length > 0) {
        for (const apiJob of jobList.slice(0, limit)) {
          try {
            const job = this.convertActiveJobsDBToStandardFormat(apiJob);
            if (job) {
              jobs.push(job);
              this.totalJobsFound++;
            }
          } catch (error) {
            console.error(`Error processing individual Active Jobs DB job:`, error.message);
          }
        }
      }

      return {
        jobs,
        totalAvailable: data.total_count || data.totalCount || jobList.length,
        searchParams: {
          ...searchParams,
          actualQuery: params.title_filter,
          actualLocation: params.location_filter,
          budgetImpact: jobs.length
        },
        apiResponse: {
          resultCount: jobList.length,
          totalCount: data.total_count || data.totalCount || jobList.length,
          searchUrl: url,
          searchParams: params,
          budgetEfficient: true,
          premiumFeatures: {
            directEmployerLinks: true,
            hourlyUpdates: true,
            highQualityData: true,
            budgetOptimized: true
          }
        }
      };

    } catch (error) {
      console.error(`❌ Active Jobs DB API search failed:`, error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Active Jobs DB API authentication failed - check your RapidAPI key');
      } else if (error.response?.status === 429) {
        throw new Error('Active Jobs DB API rate limit exceeded - you may have hit your monthly budget');
      } else if (error.response?.status === 403) {
        throw new Error('Active Jobs DB API access forbidden - check subscription status');
      } else if (error.response?.status === 404) {
        throw new Error('Active Jobs DB API endpoint not found - service may have changed');
      } else {
        throw new Error(`Active Jobs DB API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Build precision query for maximum relevance with minimal API calls
   */
buildPrecisionQuery(jobTitle, keywords = []) {
  // Use ONLY the job title - NO keywords at all
  let query = jobTitle.trim();
  
  // Remove duplicate words
  const words = query.split(' ');
  const uniqueWords = [...new Set(words)];
  query = uniqueWords.join(' ');
  
  // Remove any technology/keyword words that might have leaked in
  query = query.replace(/\b(AI|Machine Learning|ML|Data|Analytics|Cloud|Digital|Technology|Tech|Systems|Software|Engineering|Development|Dev|Python|Django|React|JavaScript|Java|AWS|Azure|Generative|Strategy|Frameworks|Agentic)\b/gi, '')
               .replace(/\s+/g, ' ')
               .trim();
  
  console.log(`🎯 Precision query crafted: "${query}" (TITLE ONLY - NO KEYWORDS)`);
  return query;
}

  /**
   * Convert Active Jobs DB format to standard job format (Budget-efficient processing)
   */
  convertActiveJobsDBToStandardFormat(apiJob) {
    try {
        // Handle different possible field names efficiently
        const title = apiJob.title || 'Unknown Title';
        const company = apiJob.organization || apiJob.company || 'Unknown Company';  // Use 'organization'
        const description = apiJob.description_text || apiJob.description || 'Job description not available';  // Use 'description_text'
        const location = apiJob.locations_derived?.[0] || apiJob.location || 'Not specified';  // Use 'locations_derived'
        const applyUrl = apiJob.url || apiJob.apply_url || '';  // Use 'url'
        const companyUrl = apiJob.organization_url || '';  // Use 'organization_url'
        const datePosted = apiJob.date_posted || null;
      
      const isDirectEmployer = !!(companyUrl || 
                                  applyUrl?.includes('greenhouse') || 
                                  applyUrl?.includes('lever') ||
                                  applyUrl?.includes('workday'));

      const workArrangement = this.inferWorkArrangement(
        description, 
        location,
        apiJob.remote || false
      );

      const job = {
        title: this.cleanJobTitle(title),
        company: company,
        location: this.normalizeJobLocation(location),
        description: description,
        fullContent: description,
        jobUrl: applyUrl,
        sourceUrl: applyUrl,
        salary: this.parseSalary(apiJob.salary_min, apiJob.salary_max),
        postedDate: datePosted ? new Date(datePosted).toISOString().split('T')[0] : null,
        sourcePlatform: this.identifySourcePlatform(applyUrl),
        extractedAt: new Date(),
        extractionMethod: 'active_jobs_db_budget_optimized',
        workArrangement: workArrangement,
        jobType: this.mapJobType(apiJob.job_type),
        isDirectEmployer: isDirectEmployer,
        
        activeJobsDBData: {
          id: apiJob.id || apiJob.job_id,
          category: apiJob.category,
          job_type: apiJob.job_type,
          experience_level: apiJob.experience_level,
          company_url: companyUrl,
          apply_url: applyUrl,
          remote: apiJob.remote || false,
          date_posted: datePosted,
          discoveryMethod: 'budget_optimized_precision',
          budgetEfficient: true
        },
        
        contentQuality: this.assessActiveJobsDBQuality(apiJob),
        matchScore: this.calculateBudgetOptimizedMatchScore(apiJob),
        
        metadata: {
          discoveryMethod: 'budget_optimized_precision',
          platform: this.identifySourcePlatform(applyUrl),
          extractedAt: new Date(),
          contentLength: description.length,
          directEmployerPosting: isDirectEmployer,
          budgetOptimized: true,
          aggregatorSource: 'active_jobs_db',
          qualityIndicators: {
            directEmployerLink: isDirectEmployer,
            recentPosting: this.isRecentPosting(datePosted),
            detailedDescription: description.length > 300,
            salaryProvided: !!(apiJob.salary_min || apiJob.salary_max),
            budgetEfficient: true
          }
        }
      };

      return job;

    } catch (error) {
      console.error('Error converting Active Jobs DB job to standard format:', error);
      return null;
    }
  }

  /**
   * Calculate match score optimized for budget-conscious approach
   */
  calculateBudgetOptimizedMatchScore(apiJob) {
    let score = 80; // Higher base score since we're doing precision targeting
    
    // Direct employer bonus (important for quality)
    if (apiJob.company_url || (apiJob.apply_url && 
        (apiJob.apply_url.includes('greenhouse') || apiJob.apply_url.includes('lever')))) {
      score += 15;
    }
    
    // Recent posting bonus
    if (this.isRecentPosting(apiJob.date_posted)) {
      score += 10;
    }
    
    // Detailed description bonus
    const description = apiJob.description || apiJob.job_description || '';
    if (description && description.length > 500) {
      score += 5;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Parse salary information
   */
  parseSalary(salaryMin, salaryMax) {
    const salary = {};
    
    if (salaryMin && typeof salaryMin === 'number' && salaryMin > 0) {
      salary.min = salaryMin;
    }
    
    if (salaryMax && typeof salaryMax === 'number' && salaryMax > 0) {
      salary.max = salaryMax;
    }
    
    if (Object.keys(salary).length > 0) {
      salary.currency = 'USD';
      salary.isExplicit = true;
    }
    
    return salary;
  }

  /**
   * Identify source platform from apply URL
   */
  identifySourcePlatform(applyUrl) {
    if (!applyUrl) return 'ACTIVE_JOBS_DB_DIRECT';
    
    const url = applyUrl.toLowerCase();
    
    // Direct employer ATS systems
    if (url.includes('greenhouse.io')) return 'ACTIVE_JOBS_DB_GREENHOUSE';
    if (url.includes('lever.co')) return 'ACTIVE_JOBS_DB_LEVER';
    if (url.includes('workday.com')) return 'ACTIVE_JOBS_DB_WORKDAY';
    if (url.includes('smartrecruiters.com')) return 'ACTIVE_JOBS_DB_SMARTRECRUITERS';
    if (url.includes('jobvite.com')) return 'ACTIVE_JOBS_DB_JOBVITE';
    if (url.includes('bamboohr.com')) return 'ACTIVE_JOBS_DB_BAMBOOHR';
    if (url.includes('icims.com')) return 'ACTIVE_JOBS_DB_ICIMS';
    
    // Major job boards
    if (url.includes('indeed.')) return 'ACTIVE_JOBS_DB_INDEED';
    if (url.includes('linkedin.')) return 'ACTIVE_JOBS_DB_LINKEDIN';
    if (url.includes('glassdoor.')) return 'ACTIVE_JOBS_DB_GLASSDOOR';
    if (url.includes('monster.')) return 'ACTIVE_JOBS_DB_MONSTER';
    if (url.includes('careerbuilder.')) return 'ACTIVE_JOBS_DB_CAREERBUILDER';
    if (url.includes('ziprecruiter.')) return 'ACTIVE_JOBS_DB_ZIPRECRUITER';
    if (url.includes('dice.')) return 'ACTIVE_JOBS_DB_DICE';
    
    // Company career pages
    if (url.includes('/careers/') || url.includes('/jobs/') || url.includes('careers.')) {
      return 'ACTIVE_JOBS_DB_COMPANY_DIRECT';
    }
    
    return 'ACTIVE_JOBS_DB_OTHER';
  }

  /**
   * Infer work arrangement from job data
   */
  inferWorkArrangement(description, location, isRemote) {
    if (isRemote || location?.toLowerCase().includes('remote')) {
      return 'remote';
    }
    
    const lowerDesc = (description || '').toLowerCase();
    const lowerLoc = (location || '').toLowerCase();
    
    if (lowerDesc.includes('remote') || lowerDesc.includes('work from home') || 
        lowerDesc.includes('telecommute') || lowerDesc.includes('distributed')) {
      
      if (lowerDesc.includes('hybrid') || lowerDesc.includes('flexible') || 
          lowerDesc.includes('office days')) {
        return 'hybrid';
      }
      
      return 'remote';
    }
    
    if (lowerDesc.includes('hybrid') || lowerDesc.includes('flexible') || 
        lowerDesc.includes('part remote')) {
      return 'hybrid';
    }
    
    if (lowerDesc.includes('on-site') || lowerDesc.includes('onsite') || 
        lowerDesc.includes('in office')) {
      return 'onsite';
    }
    
    return location && !lowerLoc.includes('remote') ? 'onsite' : 'unknown';
  }

  /**
   * Clean job title
   */
  cleanJobTitle(title) {
    return title
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-\(\)\/&+]/g, '')
      .trim();
  }

  /**
   * Normalize job location
   */
  normalizeJobLocation(location) {
    if (!location || location.toLowerCase().includes('remote')) {
      return 'Remote';
    }
    
    return location
      .replace(/,\s*United States?$/i, '')
      .replace(/,\s*USA?$/i, '')
      .trim();
  }

  /**
   * Map job type to standard format
   */
  mapJobType(jobType) {
    if (!jobType) return 'FULL_TIME';
    
    const type = jobType.toLowerCase();
    
    if (type.includes('full') || type.includes('permanent')) return 'FULL_TIME';
    if (type.includes('part')) return 'PART_TIME';
    if (type.includes('contract') || type.includes('temporary')) return 'CONTRACT';
    if (type.includes('intern')) return 'INTERNSHIP';
    if (type.includes('freelance')) return 'FREELANCE';
    
    return 'FULL_TIME';
  }

  /**
   * Assess job quality for Active Jobs DB
   */
  assessActiveJobsDBQuality(apiJob) {
    let qualityScore = 0;
    
    // Basic content quality
    const title = apiJob.title || apiJob.job_title || '';
    const company = apiJob.company || apiJob.organization || '';
    const description = apiJob.description || apiJob.job_description || '';
    const location = apiJob.location || apiJob.location_raw || '';
    const applyUrl = apiJob.apply_url || apiJob.url || '';
    
    if (title && title.length > 5) qualityScore += 2;
    if (company) qualityScore += 2;
    if (description && description.length > 100) qualityScore += 3;
    if (location) qualityScore += 1;
    if (applyUrl) qualityScore += 2;
    
    // Premium quality indicators
    if (apiJob.company_url) qualityScore += 3; // Direct employer link
    if (apiJob.salary_min || apiJob.salary_max) qualityScore += 2;
    if (this.isRecentPosting(apiJob.date_posted)) qualityScore += 2;
    
    // Detailed content bonus
    if (description && description.length > 500) qualityScore += 2;
    if (description && description.length > 1000) qualityScore += 1;
    
    // Direct employer ATS bonus
    const applyUrlLower = (applyUrl || '').toLowerCase();
    if (applyUrlLower.includes('greenhouse') || applyUrlLower.includes('lever') || 
        applyUrlLower.includes('workday') || applyUrlLower.includes('smartrecruiters')) {
      qualityScore += 3;
    }
    
    if (qualityScore >= 15) return 'high';
    else if (qualityScore >= 10) return 'medium';
    else return 'low';
  }

  /**
   * Check if posting is recent (within 14 days)
   */
  isRecentPosting(datePosted) {
    if (!datePosted) return false;
    
    const postDate = new Date(datePosted);
    const now = new Date();
    const daysDiff = (now - postDate) / (1000 * 60 * 60 * 24);
    
    return daysDiff <= 14;
  }

  /**
   * SIMPLIFIED API health status - just check if we can make a basic call
   */
  async getApiHealth() {
    try {
      if (!this.apiKey) {
        return {
          status: 'not_configured',
          message: 'Active Jobs DB API key not set',
          budgetImpact: 'none'
        };
      }

      // Simple test call to verify the endpoint works
      const response = await axios.get(`${this.baseUrl}${this.workingEndpoint}`, {
        params: { 
          limit: 1,
          description_type: 'text'
        },
        headers: this.defaultHeaders,
        timeout: 10000
      });

      return {
        status: 'healthy',
        message: 'Active Jobs DB API connection successful (Budget-conscious)',
        workingEndpoint: this.workingEndpoint,
        totalJobsAvailable: response.data.total_count || response.data.length || 0,
        provider: 'Active Jobs DB',
        budgetPlan: 'Free (250 jobs/month)',
        dailySafeLimit: this.dailySafeLimit,
        jobsPerCall: this.jobsPerCall,
        features: [
          'Direct employer links',
          'Hourly database updates', 
          '100,000+ company coverage',
          'Budget-optimized targeting'
        ],
        budgetStrategy: 'Direct endpoint with precision targeting',
        coverage: '100,000+ company career sites and ATS platforms',
        lastTested: new Date()
      };

    } catch (error) {
      let status = 'error';
      let message = `Active Jobs DB API connection failed: ${error.message}`;
      
      if (error.response?.status === 401) {
        status = 'auth_error';
        message = 'Active Jobs DB API authentication failed - check your RapidAPI key';
      } else if (error.response?.status === 429) {
        status = 'rate_limited';
        message = 'Active Jobs DB API rate limit exceeded - you may have hit your monthly budget of 250 jobs';
      } else if (error.response?.status === 403) {
        status = 'forbidden';
        message = 'Active Jobs DB API access forbidden - check subscription status';
      }

      return {
        status,
        message,
        error: error.response?.data || error.message,
        provider: 'Active Jobs DB',
        budgetPlan: 'Free (250 jobs/month)',
        lastTested: new Date()
      };
    }
  }

  /**
   * Get budget status and recommendations
   */
  getBudgetStatus() {
    const estimatedMonthlyUsage = this.searchAttempts * this.jobsPerCall * 30; // Rough estimate
    const budgetUsagePercent = (estimatedMonthlyUsage / this.monthlyBudget) * 100;
    
    return {
      monthlyBudget: this.monthlyBudget,
      dailySafeLimit: this.dailySafeLimit,
      jobsPerCall: this.jobsPerCall,
      estimatedMonthlyUsage: estimatedMonthlyUsage,
      budgetUsagePercent: Math.min(budgetUsagePercent, 100),
      searchesMadeToday: this.searchAttempts,
      jobsFoundToday: this.totalJobsFound,
      recommendations: this.getBudgetRecommendations(budgetUsagePercent),
      budgetStatus: budgetUsagePercent > 80 ? 'warning' : budgetUsagePercent > 60 ? 'caution' : 'healthy'
    };
  }

  /**
   * Get budget recommendations based on usage
   */
  getBudgetRecommendations(usagePercent) {
    const recommendations = [];
    
    if (usagePercent > 80) {
      recommendations.push('⚠️ High budget usage detected - consider upgrading to paid plan');
      recommendations.push('🎯 Use more specific job titles and keywords for better precision');
      recommendations.push('📅 Space out your searches throughout the month');
    } else if (usagePercent > 60) {
      recommendations.push('⚡ Moderate budget usage - monitor your monthly consumption');
      recommendations.push('🎯 Continue using precision targeting to maximize value');
    } else {
      recommendations.push('✅ Budget usage is healthy');
      recommendations.push('🚀 You can safely continue with current search frequency');
    }
    
    recommendations.push(`💡 Current strategy: ${this.jobsPerCall} jobs per search for maximum relevance`);
    
    return recommendations;
  }

  /**
   * Log budget usage for tracking
   */
  logBudgetUsage(jobsRetrieved, queryType = 'precision_search') {
    const usage = {
      timestamp: new Date(),
      jobsRetrieved: jobsRetrieved,
      queryType: queryType,
      budgetImpact: jobsRetrieved,
      cumulativeUsage: this.totalJobsFound
    };
    
    console.log(`💰 Budget Usage Log:`, usage);
    
    // Warn if approaching limits
    if (this.totalJobsFound > this.monthlyBudget * 0.8) {
      console.warn(`⚠️ WARNING: Approaching monthly budget limit (${this.totalJobsFound}/${this.monthlyBudget})`);
    }
    
    return usage;
  }
}

module.exports = ActiveJobsDBExtractor;