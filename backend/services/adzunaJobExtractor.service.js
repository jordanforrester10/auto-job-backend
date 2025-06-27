// services/adzunaJobExtractor.service.js - ENHANCED WITH DIAGNOSTICS AND FIXES
require('dotenv').config();
const axios = require('axios');

/**
 * Enhanced Adzuna API Job Extractor with comprehensive diagnostics
 * Includes fallback strategies and better search optimization
 */
class AdzunaJobExtractor {
  constructor() {
    this.appId = process.env.ADZUNA_APP_ID;
    this.appKey = process.env.ADZUNA_APP_KEY;
    this.baseUrl = 'https://api.adzuna.com/v1/api/jobs';
    this.country = 'us'; // United States
    
    // Enhanced logging for diagnostics
    this.diagnosticsEnabled = true;
    this.searchAttempts = 0;
    this.successfulSearches = 0;
    this.totalJobsFound = 0;
    
    if (!this.appId || !this.appKey) {
      console.warn('⚠️ Adzuna API keys not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env file');
      console.warn('🔗 Get free API keys at: https://developer.adzuna.com/');
    } else {
      console.log('🎯 Enhanced AdzunaJobExtractor initialized with diagnostics');
      console.log(`📊 Rate limit: 1000 requests/month (free tier)`);
      console.log(`🌐 Coverage: Indeed, LinkedIn, Monster, CareerBuilder, and 1000+ job boards`);
    }
  }

  /**
   * Enhanced extraction with better search strategies
   */
  async extractJobsForCareerProfile(careerProfile, search, options = {}) {
    const {
      maxJobs = 10,
      maxDaysOld = 30,
      sortBy = 'date'
    } = options;

    console.log(`🎯 Starting enhanced Adzuna API job extraction...`);
    console.log(`📋 Target titles: ${careerProfile.targetJobTitles?.join(', ')}`);
    console.log(`📍 Preferred locations: ${careerProfile.preferredLocations?.join(', ')}`);

    // Reset diagnostics
    this.searchAttempts = 0;
    this.successfulSearches = 0;
    this.totalJobsFound = 0;

    const results = {
      jobs: [],
      totalFound: 0,
      errors: [],
      extractionMode: 'adzuna_api_enhanced',
      source: 'adzuna_aggregator',
      searchAttempts: 0,
      diagnostics: {
        searchStrategies: [],
        apiResponses: [],
        searchOptimizations: []
      }
    };

    if (!this.appId || !this.appKey) {
      throw new Error('Adzuna API keys not configured. Please set ADZUNA_APP_ID and ADZUNA_APP_KEY in your .env file.');
    }

    try {
      // STRATEGY 1: Original specific searches
      console.log('📈 STRATEGY 1: Specific job title searches...');
      await this.performSpecificJobSearches(careerProfile, results, maxJobs, maxDaysOld, sortBy, search);

      // STRATEGY 2: Broader keyword searches if few results
      if (results.jobs.length < 3) {
        console.log('📈 STRATEGY 2: Broader keyword searches (few results from specific search)...');
        await this.performBroaderKeywordSearches(careerProfile, results, maxJobs, maxDaysOld, sortBy, search);
      }

      // STRATEGY 3: Industry-based searches if still few results
      if (results.jobs.length < 5) {
        console.log('📈 STRATEGY 3: Industry-based searches...');
        await this.performIndustryBasedSearches(careerProfile, results, maxJobs, maxDaysOld, sortBy, search);
      }

      // STRATEGY 4: Fallback to very broad searches
      if (results.jobs.length < 2) {
        console.log('📈 STRATEGY 4: Fallback broad searches...');
        await this.performFallbackBroadSearches(careerProfile, results, maxJobs, maxDaysOld, sortBy, search);
      }

      results.totalFound = results.jobs.length;
      results.searchAttempts = this.searchAttempts;

      // Enhanced diagnostics logging
      console.log(`✅ Enhanced Adzuna extraction completed:`);
      console.log(`   📊 Jobs found: ${results.totalFound}`);
      console.log(`   🔍 API calls made: ${this.searchAttempts}`);
      console.log(`   ✅ Successful calls: ${this.successfulSearches}`);
      console.log(`   📈 Success rate: ${this.searchAttempts > 0 ? Math.round((this.successfulSearches / this.searchAttempts) * 100) : 0}%`);
      console.log(`   🎯 Jobs per successful call: ${this.successfulSearches > 0 ? (results.totalFound / this.successfulSearches).toFixed(1) : 0}`);

      // Log diagnostics for debugging
      if (this.diagnosticsEnabled) {
        console.log(`🔍 DIAGNOSTICS SUMMARY:`);
        results.diagnostics.searchStrategies.forEach((strategy, index) => {
          console.log(`   Strategy ${index + 1}: ${strategy.name} - ${strategy.jobsFound} jobs found`);
        });
      }

      return results;

    } catch (error) {
      console.error(`❌ Enhanced Adzuna extraction failed:`, error.message);
      
      // Enhanced error logging
      await search.addReasoningLog(
        'web_search_discovery',
        `Enhanced Adzuna API extraction failed: ${error.message}. Diagnostics: ${this.searchAttempts} calls made, ${this.successfulSearches} successful.`,
        {
          error: error.message,
          diagnostics: {
            totalCalls: this.searchAttempts,
            successfulCalls: this.successfulSearches,
            jobsFound: this.totalJobsFound
          }
        },
        false
      );

      throw error;
    }
  }

  /**
   * STRATEGY 1: Specific job title searches (original approach)
   */
  async performSpecificJobSearches(careerProfile, results, maxJobs, maxDaysOld, sortBy, search) {
    const strategy = {
      name: 'Specific Job Title Searches',
      searches: [],
      jobsFound: 0
    };

    const jobTitles = careerProfile.targetJobTitles || ['Software Engineer'];
    const locations = careerProfile.preferredLocations || ['Remote'];
    
    for (const jobTitle of jobTitles) {
      if (results.jobs.length >= maxJobs) break;
      
      for (const location of locations) {
        if (results.jobs.length >= maxJobs) break;
        
        try {
          const searchResult = await this.searchAdzunaAPI({
            jobTitle,
            location,
            experienceLevel: careerProfile.experienceLevel,
            salaryMin: careerProfile.salaryExpectation?.min,
            salaryMax: careerProfile.salaryExpectation?.max,
            maxResults: Math.min(maxJobs - results.jobs.length, 10),
            maxDaysOld,
            sortBy,
            keywords: careerProfile.targetKeywords
          });

          strategy.searches.push({
            query: `${jobTitle} in ${location}`,
            jobsReturned: searchResult.jobs?.length || 0,
            totalAvailable: searchResult.totalAvailable || 0
          });

          if (searchResult.jobs && searchResult.jobs.length > 0) {
            this.addUniqueJobs(searchResult.jobs, results, careerProfile);
            strategy.jobsFound += searchResult.jobs.length;
          }

        } catch (error) {
          console.error(`❌ Strategy 1 error for "${jobTitle}" in ${location}:`, error.message);
          strategy.searches.push({
            query: `${jobTitle} in ${location}`,
            error: error.message
          });
        }
      }
    }

    results.diagnostics.searchStrategies.push(strategy);
    console.log(`   Strategy 1 results: ${strategy.jobsFound} jobs found from ${strategy.searches.length} searches`);
  }

  /**
   * STRATEGY 2: Broader keyword searches
   */
  async performBroaderKeywordSearches(careerProfile, results, maxJobs, maxDaysOld, sortBy, search) {
    const strategy = {
      name: 'Broader Keyword Searches',
      searches: [],
      jobsFound: 0
    };

    // Extract base job types from titles
    const baseJobTypes = this.extractBaseJobTypes(careerProfile.targetJobTitles);
    const keywords = careerProfile.targetKeywords || [];
    
    for (const jobType of baseJobTypes) {
      if (results.jobs.length >= maxJobs) break;
      
      // Search with just the base job type (e.g., "Manager" instead of "Product Manager")
      try {
        const searchResult = await this.searchAdzunaAPI({
          jobTitle: jobType,
          location: '', // Broader location search
          maxResults: Math.min(maxJobs - results.jobs.length, 20),
          maxDaysOld: maxDaysOld * 2, // Longer time range
          sortBy: 'relevance',
          keywords: keywords.slice(0, 2) // Top 2 keywords only
        });

        strategy.searches.push({
          query: `${jobType} (broad search)`,
          jobsReturned: searchResult.jobs?.length || 0,
          totalAvailable: searchResult.totalAvailable || 0
        });

        if (searchResult.jobs && searchResult.jobs.length > 0) {
          // Filter for relevance before adding
          const relevantJobs = searchResult.jobs.filter(job => 
            this.isJobRelevantToProfile(job, careerProfile)
          );
          
          this.addUniqueJobs(relevantJobs, results, careerProfile);
          strategy.jobsFound += relevantJobs.length;
        }

      } catch (error) {
        console.error(`❌ Strategy 2 error for "${jobType}":`, error.message);
        strategy.searches.push({
          query: `${jobType} (broad search)`,
          error: error.message
        });
      }
    }

    results.diagnostics.searchStrategies.push(strategy);
    console.log(`   Strategy 2 results: ${strategy.jobsFound} jobs found from ${strategy.searches.length} searches`);
  }

  /**
   * STRATEGY 3: Industry-based searches
   */
  async performIndustryBasedSearches(careerProfile, results, maxJobs, maxDaysOld, sortBy, search) {
    const strategy = {
      name: 'Industry-Based Searches',
      searches: [],
      jobsFound: 0
    };

    const industries = careerProfile.industries || ['Technology', 'Software'];
    const mainKeywords = careerProfile.targetKeywords?.slice(0, 3) || [];
    
    for (const industry of industries) {
      if (results.jobs.length >= maxJobs) break;
      
      for (const keyword of mainKeywords) {
        if (results.jobs.length >= maxJobs) break;
        
        try {
          const searchResult = await this.searchAdzunaAPI({
            jobTitle: keyword, // Use keyword as job title
            location: '',
            maxResults: Math.min(maxJobs - results.jobs.length, 15),
            maxDaysOld: maxDaysOld * 3,
            sortBy: 'relevance',
            keywords: [industry]
          });

          strategy.searches.push({
            query: `${keyword} in ${industry}`,
            jobsReturned: searchResult.jobs?.length || 0,
            totalAvailable: searchResult.totalAvailable || 0
          });

          if (searchResult.jobs && searchResult.jobs.length > 0) {
            const relevantJobs = searchResult.jobs.filter(job => 
              this.isJobRelevantToProfile(job, careerProfile)
            );
            
            this.addUniqueJobs(relevantJobs, results, careerProfile);
            strategy.jobsFound += relevantJobs.length;
          }

        } catch (error) {
          console.error(`❌ Strategy 3 error for "${keyword}" in ${industry}:`, error.message);
        }
      }
    }

    results.diagnostics.searchStrategies.push(strategy);
    console.log(`   Strategy 3 results: ${strategy.jobsFound} jobs found from ${strategy.searches.length} searches`);
  }

  /**
   * STRATEGY 4: Fallback broad searches
   */
  async performFallbackBroadSearches(careerProfile, results, maxJobs, maxDaysOld, sortBy, search) {
    const strategy = {
      name: 'Fallback Broad Searches',
      searches: [],
      jobsFound: 0
    };

    // Very broad searches as last resort
    const broadTerms = ['manager', 'analyst', 'specialist', 'coordinator', 'engineer'];
    
    for (const term of broadTerms) {
      if (results.jobs.length >= maxJobs) break;
      
      try {
        const searchResult = await this.searchAdzunaAPI({
          jobTitle: term,
          location: '',
          maxResults: Math.min(maxJobs - results.jobs.length, 50),
          maxDaysOld: 60, // Very long time range
          sortBy: 'date',
          keywords: []
        });

        strategy.searches.push({
          query: `${term} (fallback broad)`,
          jobsReturned: searchResult.jobs?.length || 0,
          totalAvailable: searchResult.totalAvailable || 0
        });

        if (searchResult.jobs && searchResult.jobs.length > 0) {
          // Very strict relevance filtering for broad searches
          const relevantJobs = searchResult.jobs.filter(job => 
            this.isJobStronglyRelevantToProfile(job, careerProfile)
          );
          
          this.addUniqueJobs(relevantJobs, results, careerProfile);
          strategy.jobsFound += relevantJobs.length;
        }

      } catch (error) {
        console.error(`❌ Strategy 4 error for "${term}":`, error.message);
      }
    }

    results.diagnostics.searchStrategies.push(strategy);
    console.log(`   Strategy 4 results: ${strategy.jobsFound} jobs found from ${strategy.searches.length} searches`);
  }

  /**
   * Enhanced API search with better error handling and diagnostics
   */
  async searchAdzunaAPI(searchParams) {
    const {
      jobTitle,
      location = '',
      experienceLevel,
      salaryMin,
      salaryMax,
      maxResults = 10,
      maxDaysOld = 30,
      sortBy = 'date',
      keywords = []
    } = searchParams;

    this.searchAttempts++;

    try {
      // Enhanced query building
      const searchQuery = this.buildOptimizedSearchQuery(jobTitle, keywords, experienceLevel);
      const searchLocation = this.optimizeLocation(location);

      const params = {
        app_id: this.appId,
        app_key: this.appKey,
        results_per_page: Math.min(maxResults, 50),
        what: searchQuery,
        sort_by: sortBy,
        max_days_old: maxDaysOld,
        full_time: 1,
        permanent: 1
      };

      // Only add location if it's not empty (for broader searches)
      if (searchLocation) {
        params.where = searchLocation;
      }

      // Add salary filters if specified
      if (salaryMin && salaryMin > 0) params.salary_min = salaryMin;
      if (salaryMax && salaryMax > 0) params.salary_max = salaryMax;

      const url = `${this.baseUrl}/${this.country}/search/1`;
      
      if (this.diagnosticsEnabled) {
        console.log(`🌐 Enhanced API request: "${searchQuery}"${searchLocation ? ` in ${searchLocation}` : ' (any location)'}`);
      }
      
      const response = await axios.get(url, { 
        params,
        timeout: 30000,
        headers: {
          'User-Agent': 'AutoJobAI/1.0 JobDiscoveryBot',
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      this.successfulSearches++;
      
      if (this.diagnosticsEnabled) {
        console.log(`📊 API response: ${data.count || 0} total available, processing ${data.results?.length || 0}`);
        console.log(`   🔍 Search params used:`, {
          what: searchQuery,
          where: searchLocation || 'any',
          max_days_old: maxDaysOld,
          results_per_page: params.results_per_page
        });
      }

      const jobs = [];
      
      if (data.results && data.results.length > 0) {
        for (const apiJob of data.results) {
          try {
            const job = this.convertApiJobToStandardFormat(apiJob);
            if (job) {
              jobs.push(job);
              this.totalJobsFound++;
            }
          } catch (error) {
            console.error(`Error processing individual job:`, error.message);
          }
        }
      }

      return {
        jobs,
        totalAvailable: data.count || 0,
        searchParams: {
          ...searchParams,
          actualQuery: searchQuery,
          actualLocation: searchLocation
        },
        apiResponse: {
          resultCount: data.results?.length || 0,
          totalCount: data.count || 0,
          searchUrl: url,
          searchParams: params
        }
      };

    } catch (error) {
      console.error(`❌ Enhanced API search failed:`, error.message);
      
      if (this.diagnosticsEnabled) {
        console.log(`🔍 Failed search details:`, {
          query: jobTitle,
          location: location,
          error: error.response?.status || error.code,
          message: error.message
        });
      }
      
      if (error.response?.status === 401) {
        throw new Error('Adzuna API authentication failed - check your API keys');
      } else if (error.response?.status === 429) {
        throw new Error('Adzuna API rate limit exceeded - try again later');
      } else if (error.response?.status === 403) {
        throw new Error('Adzuna API access forbidden - verify credentials');
      } else {
        throw new Error(`Adzuna API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Build optimized search queries for better results
   */
  buildOptimizedSearchQuery(jobTitle, keywords = [], experienceLevel) {
    // Start with the job title
    let query = jobTitle;
    
    // For very specific titles, try just the core part
    if (jobTitle.includes(' - ') || jobTitle.includes(' / ')) {
      const corePart = jobTitle.split(/[\-\/]/)[0].trim();
      query = corePart;
    }
    
    // Remove overly specific terms that might limit results
    query = query
      .replace(/\b(Senior|Junior|Lead|Principal|Director)\b/gi, '') // Remove seniority for broader search
      .replace(/\b(AI|ML|Machine Learning|Artificial Intelligence)\b/gi, '') // Remove AI terms for broader search
      .trim();
    
    // Add back experience level if specified
    if (experienceLevel && !query.toLowerCase().includes(experienceLevel.toLowerCase())) {
      if (experienceLevel === 'senior' || experienceLevel === 'lead') {
        query = `${experienceLevel} ${query}`;
      }
    }
    
    return query;
  }

  /**
   * Optimize location for better API results
   */
  optimizeLocation(location) {
    if (!location || location.toLowerCase().includes('remote')) {
      return ''; // Empty for remote/broader search
    }
    
    // Simplify location names
    return location
      .replace(/,?\s*(USA?|United States)$/i, '')
      .replace(/^(Greater\s+|Metro\s+)/i, '')
      .replace(/\s+Area$/i, '')
      .trim();
  }

  /**
   * Extract base job types from specific titles
   */
  extractBaseJobTypes(jobTitles) {
    const baseTypes = new Set();
    
    (jobTitles || []).forEach(title => {
      // Extract the main job type
      const cleaned = title
        .replace(/\b(Senior|Junior|Lead|Principal|Director|Vice President|VP)\b/gi, '')
        .replace(/\b(AI|ML|Machine Learning|Artificial Intelligence)\b/gi, '')
        .replace(/[\-\/].+$/, '') // Remove everything after dash or slash
        .trim();
      
      if (cleaned.length > 2) {
        baseTypes.add(cleaned);
      }
      
      // Also add individual words for very broad search
      const words = cleaned.split(' ').filter(word => word.length > 3);
      words.forEach(word => baseTypes.add(word));
    });
    
    return Array.from(baseTypes);
  }

  /**
   * Check if job is relevant to career profile
   */
  isJobRelevantToProfile(job, careerProfile) {
    const titleLower = job.title.toLowerCase();
    const descLower = (job.description || '').toLowerCase();
    
    // Check for any target job title words
    const titleWords = (careerProfile.targetJobTitles || [])
      .flatMap(title => title.toLowerCase().split(' '))
      .filter(word => word.length > 3);
    
    const titleMatch = titleWords.some(word => titleLower.includes(word));
    
    // Check for target keywords
    const keywordMatch = (careerProfile.targetKeywords || [])
      .some(keyword => descLower.includes(keyword.toLowerCase()) || titleLower.includes(keyword.toLowerCase()));
    
    return titleMatch || keywordMatch;
  }

  /**
   * Strong relevance check for fallback searches
   */
  isJobStronglyRelevantToProfile(job, careerProfile) {
    const titleLower = job.title.toLowerCase();
    const descLower = (job.description || '').toLowerCase();
    
    // Must match both title and keywords for strong relevance
    const titleWords = (careerProfile.targetJobTitles || [])
      .flatMap(title => title.toLowerCase().split(' '))
      .filter(word => word.length > 3);
    
    const titleMatch = titleWords.some(word => titleLower.includes(word));
    
    const keywordMatch = (careerProfile.targetKeywords || [])
      .filter(keyword => keyword.length > 2)
      .some(keyword => descLower.includes(keyword.toLowerCase()));
    
    return titleMatch && keywordMatch;
  }

  /**
   * Add unique jobs to results (avoiding duplicates)
   */
  addUniqueJobs(newJobs, results, careerProfile) {
    for (const job of newJobs) {
      // Check for duplicates
      const isDuplicate = results.jobs.some(existingJob => 
        existingJob.company.toLowerCase() === job.company.toLowerCase() &&
        this.calculateSimilarity(existingJob.title, job.title) > 0.8
      );

      if (!isDuplicate) {
        const enhancedJob = this.enhanceJobWithCareerContext(job, careerProfile);
        results.jobs.push(enhancedJob);
        
        if (this.diagnosticsEnabled) {
          console.log(`✅ Added: "${job.title}" at ${job.company} (${job.sourcePlatform})`);
        }
      } else if (this.diagnosticsEnabled) {
        console.log(`⚠️ Skipped duplicate: "${job.title}" at ${job.company}`);
      }
    }
  }

  /**
   * Run comprehensive diagnostics
   */
  async runDiagnostics() {
    console.log('🔍 Running comprehensive Adzuna API diagnostics...');
    
    const diagnostics = {
      apiConnection: null,
      searchCapabilities: [],
      dataQuality: {},
      recommendations: []
    };

    try {
      // Test API connection
      diagnostics.apiConnection = await this.getApiHealth();
      
      // Test different search types
      const testSearches = [
        { query: 'manager', location: '' },
        { query: 'engineer', location: 'new york' },
        { query: 'analyst', location: 'remote' },
        { query: 'product manager', location: 'san francisco' }
      ];

      for (const test of testSearches) {
        try {
          const result = await this.searchAdzunaAPI({
            jobTitle: test.query,
            location: test.location,
            maxResults: 5,
            maxDaysOld: 30
          });

          diagnostics.searchCapabilities.push({
            query: test.query,
            location: test.location || 'any',
            totalAvailable: result.totalAvailable,
            jobsReturned: result.jobs.length,
            status: 'success'
          });

        } catch (error) {
          diagnostics.searchCapabilities.push({
            query: test.query,
            location: test.location || 'any',
            status: 'failed',
            error: error.message
          });
        }
      }

      // Generate recommendations
      const totalJobs = diagnostics.searchCapabilities.reduce((sum, cap) => sum + (cap.totalAvailable || 0), 0);
      
      if (totalJobs < 100) {
        diagnostics.recommendations.push('Consider using broader search terms');
        diagnostics.recommendations.push('Try removing experience level filters');
        diagnostics.recommendations.push('Expand geographic search area');
      }

      if (diagnostics.searchCapabilities.some(cap => cap.status === 'failed')) {
        diagnostics.recommendations.push('Check API credentials and rate limits');
      }

      console.log('✅ Diagnostics completed:', diagnostics);
      return diagnostics;

    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      return {
        error: error.message,
        status: 'failed'
      };
    }
  }

  // ... (keeping all existing helper methods like calculateSimilarity, enhanceJobWithCareerContext, etc.)
  
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  enhanceJobWithCareerContext(job, careerProfile) {
    job.careerContext = {
      targetedForProfile: true,
      experienceLevel: careerProfile.experienceLevel,
      targetJobTitles: careerProfile.targetJobTitles,
      targetKeywords: careerProfile.targetKeywords,
      workArrangementPreference: careerProfile.workArrangement,
      salaryExpectation: careerProfile.salaryExpectation
    };
    
    let profileBonus = 0;
    
    if (job.title && careerProfile.experienceLevel) {
      const titleLower = job.title.toLowerCase();
      if (careerProfile.experienceLevel === 'senior' && titleLower.includes('senior')) {
        profileBonus += 15;
      } else if (careerProfile.experienceLevel === 'lead' && 
                 (titleLower.includes('lead') || titleLower.includes('principal'))) {
        profileBonus += 15;
      }
    }
    
    if (careerProfile.targetKeywords && job.description) {
      const descLower = job.description.toLowerCase();
      const matchingKeywords = careerProfile.targetKeywords.filter(keyword =>
        descLower.includes(keyword.toLowerCase())
      );
      profileBonus += Math.min(matchingKeywords.length * 5, 20);
    }
    
    job.matchScore = Math.min((job.matchScore || 70) + profileBonus, 100);
    
    return job;
  }

  async getApiHealth() {
    try {
      if (!this.appId || !this.appKey) {
        return {
          status: 'not_configured',
          message: 'Adzuna API keys not set'
        };
      }

      const testParams = {
        app_id: this.appId,
        app_key: this.appKey,
        results_per_page: 1,
        what: 'test'
      };

const response = await axios.get(`${this.baseUrl}/${this.country}/search/1`, {
        params: testParams,
        timeout: 10000
      });

      return {
        status: 'healthy',
        message: 'Adzuna API connection successful',
        totalJobsAvailable: response.data.count || 0,
        provider: 'Adzuna',
        rateLimit: '1000 requests/month (free tier)',
        coverage: 'Indeed, LinkedIn, Monster, CareerBuilder, and 1000+ job boards',
        lastTested: new Date()
      };

    } catch (error) {
      let status = 'error';
      let message = `Adzuna API connection failed: ${error.message}`;
      
      if (error.response?.status === 401) {
        status = 'auth_error';
        message = 'Adzuna API authentication failed - check your API keys';
      } else if (error.response?.status === 429) {
        status = 'rate_limited';
        message = 'Adzuna API rate limit exceeded (1000/month) - try again later';
      }

      return {
        status,
        message,
        error: error.response?.data || error.message,
        provider: 'Adzuna',
        lastTested: new Date()
      };
    }
  }

  // Keep all other existing methods (convertApiJobToStandardFormat, etc.)
  convertApiJobToStandardFormat(apiJob) {
    try {
      let salary = {};
      if (apiJob.salary_min || apiJob.salary_max) {
        salary = {
          min: apiJob.salary_min,
          max: apiJob.salary_max,
          currency: 'USD',
          isExplicit: !apiJob.salary_is_predicted
        };
      }

      let workArrangement = this.inferWorkArrangement(
        apiJob.description || '', 
        apiJob.location?.display_name || '',
        apiJob.contract_time
      );

      const company = apiJob.company?.display_name || 'Unknown Company';
      const sourcePlatform = this.identifySourcePlatform(apiJob.redirect_url || '');

      const job = {
        title: this.cleanJobTitle(apiJob.title || 'Unknown Title'),
        company: company,
        location: this.normalizeJobLocation(apiJob.location?.display_name || 'Not specified'),
        description: apiJob.description || '',
        fullContent: apiJob.description || '',
        jobUrl: apiJob.redirect_url || apiJob.url,
        sourceUrl: apiJob.redirect_url || apiJob.url,
        salary: Object.keys(salary).length > 0 ? salary : {},
        postedDate: apiJob.created ? new Date(apiJob.created).toISOString().split('T')[0] : null,
        sourcePlatform: sourcePlatform,
        extractedAt: new Date(),
        extractionMethod: 'adzuna_api_enhanced',
        workArrangement: workArrangement,
        jobType: this.mapContractType(apiJob.contract_type, apiJob.contract_time),
        
        adzunaData: {
          id: apiJob.id,
          category: apiJob.category?.label,
          contractType: apiJob.contract_type,
          contractTime: apiJob.contract_time,
          latitude: apiJob.latitude,
          longitude: apiJob.longitude,
          adref: apiJob.adref,
          salaryPredicted: apiJob.salary_is_predicted
        },
        
        contentQuality: this.assessApiJobQuality(apiJob),
        matchScore: this.calculateInitialMatchScore(apiJob),
        
        metadata: {
          discoveryMethod: 'adzuna_api_enhanced',
          platform: sourcePlatform,
          extractedAt: new Date(),
          contentLength: (apiJob.description || '').length,
          directCompanyPosting: this.isDirectCompanyPosting(apiJob.redirect_url),
          apiJobBoard: true,
          aggregatorSource: 'adzuna'
        }
      };

      return job;

    } catch (error) {
      console.error('Error converting Adzuna API job to standard format:', error);
      return null;
    }
  }

  inferWorkArrangement(description, location, contractTime) {
    const lowerDesc = (description || '').toLowerCase();
    const lowerLoc = (location || '').toLowerCase();
    
    if (lowerLoc.includes('remote') || lowerDesc.includes('remote') || 
        lowerDesc.includes('work from home') || lowerDesc.includes('wfh') ||
        lowerDesc.includes('telecommute') || lowerDesc.includes('distributed')) {
      
      if (lowerDesc.includes('hybrid') || lowerDesc.includes('flexible') || 
          lowerDesc.includes('office days') || lowerDesc.includes('days in office')) {
        return 'hybrid';
      }
      
      return 'remote';
    }
    
    if (lowerDesc.includes('hybrid') || lowerDesc.includes('flexible') || 
        lowerDesc.includes('mix of remote') || lowerDesc.includes('part remote') ||
        lowerDesc.includes('days remote') || lowerDesc.includes('home/office')) {
      return 'hybrid';
    }
    
    if (lowerDesc.includes('on-site') || lowerDesc.includes('onsite') || 
        lowerDesc.includes('in office') || lowerDesc.includes('office location') ||
        lowerDesc.includes('headquarters') || lowerDesc.includes('physical presence')) {
      return 'onsite';
    }
    
    if (location && !lowerLoc.includes('remote') && !lowerLoc.includes('anywhere')) {
      return 'onsite';
    }
    
    return 'unknown';
  }

  identifySourcePlatform(redirectUrl) {
    if (!redirectUrl) return 'Adzuna Direct';
    
    const url = redirectUrl.toLowerCase();
    
    if (url.includes('indeed.')) return 'Indeed';
    if (url.includes('linkedin.')) return 'LinkedIn';
    if (url.includes('monster.')) return 'Monster';
    if (url.includes('careerbuilder.')) return 'CareerBuilder';
    if (url.includes('glassdoor.')) return 'Glassdoor';
    if (url.includes('ziprecruiter.')) return 'ZipRecruiter';
    if (url.includes('simplyhired.')) return 'SimplyHired';
    if (url.includes('dice.')) return 'Dice';
    if (url.includes('stackoverflow.')) return 'Stack Overflow Jobs';
    if (url.includes('greenhouse.')) return 'Greenhouse';
    if (url.includes('lever.')) return 'Lever';
    
    return 'Adzuna Partner';
  }

  cleanJobTitle(title) {
    return title
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-\(\)\/&+]/g, '')
      .trim();
  }

  normalizeJobLocation(location) {
    if (!location || location.toLowerCase().includes('remote')) {
      return 'Remote';
    }
    
    return location
      .replace(/,\s*United States?$/i, '')
      .replace(/,\s*USA?$/i, '')
      .trim();
  }

  mapContractType(contractType, contractTime) {
    if (contractTime === 'full_time') {
      return contractType === 'permanent' ? 'FULL_TIME' : 'CONTRACT';
    } else if (contractTime === 'part_time') {
      return 'PART_TIME';
    }
    
    return 'FULL_TIME';
  }

  isDirectCompanyPosting(redirectUrl) {
    if (!redirectUrl) return false;
    
    const directIndicators = [
      'greenhouse.io', 'lever.co', 'workday.com', 'bamboohr.com',
      'smartrecruiters.com', 'jobvite.com', 'careers.', '/careers/'
    ];
    
    return directIndicators.some(indicator => 
      redirectUrl.toLowerCase().includes(indicator)
    );
  }

  assessApiJobQuality(apiJob) {
    let qualityScore = 0;
    
    if (apiJob.title && apiJob.title.length > 5) qualityScore += 2;
    if (apiJob.company?.display_name) qualityScore += 2;
    if (apiJob.description && apiJob.description.length > 100) qualityScore += 3;
    if (apiJob.location?.display_name) qualityScore += 1;
    if (apiJob.redirect_url || apiJob.url) qualityScore += 2;
    if (apiJob.created) qualityScore += 1;
    
    if (apiJob.salary_min || apiJob.salary_max) {
      qualityScore += apiJob.salary_is_predicted ? 1 : 2;
    }
    
    if (apiJob.description && apiJob.description.length > 500) qualityScore += 2;
    if (apiJob.description && apiJob.description.length > 1000) qualityScore += 1;
    
    if (apiJob.contract_type && apiJob.contract_time) qualityScore += 1;
    if (apiJob.category?.label) qualityScore += 1;
    
    if (qualityScore >= 12) return 'high';
    else if (qualityScore >= 8) return 'medium';
    else return 'low';
  }

  calculateInitialMatchScore(apiJob) {
    let score = 70;
    
    if (apiJob.salary_min && !apiJob.salary_is_predicted) score += 10;
    if (apiJob.description && apiJob.description.length > 500) score += 5;
    
    if (apiJob.created) {
      const daysSincePosted = (new Date() - new Date(apiJob.created)) / (1000 * 60 * 60 * 24);
      if (daysSincePosted <= 7) score += 10;
      else if (daysSincePosted <= 14) score += 5;
    }
    
    if (apiJob.contract_type === 'permanent' && apiJob.contract_time === 'full_time') {
      score += 5;
    }
    
    return Math.min(score, 100);
  }
}

module.exports = AdzunaJobExtractor;