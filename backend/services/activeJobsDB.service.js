// services/activeJobsDB.service.js - COMPLETE ENHANCED VERSION WITH LOCATION AND SALARY EXTRACTION
require('dotenv').config();
const axios = require('axios');

/**
 * Enhanced Active Jobs DB API Service for Weekly Job Discovery
 * Features: Multi-location search, enhanced salary extraction, weekly quotas
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
    
    // Weekly budget tracking
    this.weeklyBudget = {
      casual: 50,    // Casual plan: 50 jobs/week
      hunter: 100    // Hunter plan: 100 jobs/week
    };
    this.jobsPerCall = 25;     // Optimal jobs per API call
    
    // Enhanced logging for location and salary tracking
    this.diagnosticsEnabled = true;
    this.searchAttempts = 0;
    this.successfulSearches = 0;
    this.totalJobsFound = 0;
    this.locationsSearched = [];
    this.salaryExtractionStats = {
      total: 0,
      withSalary: 0,
      extractionRate: 0
    };
    
    if (!this.apiKey) {
      console.warn('⚠️ Active Jobs DB API key not configured. Set RAPIDAPI_KEY in .env file');
      console.warn('🔗 Get API key at: https://rapidapi.com/fantastic-jobs-fantastic-jobs-default/api/active-jobs-db');
    } else {
      console.log('🎯 ActiveJobsDBExtractor initialized for WEEKLY JOB DISCOVERY');
      console.log('💼 Weekly limits: Casual (50 jobs), Hunter (100 jobs)');
      console.log('🌍 Multi-location search enabled');
      console.log('💰 Enhanced salary extraction enabled');
    }
  }

  /**
   * 🆕 NEW: Multi-location job search with enhanced salary extraction
   */
  async searchActiveJobsDBWithLocations(searchParams) {
    try {
      const { jobTitle, searchLocations, experienceLevel, weeklyLimit, keywords } = searchParams;
      
      console.log(`🌍 Starting multi-location search for "${jobTitle}"`);
      console.log(`📍 Locations: ${searchLocations.map(loc => loc.name).join(', ')}`);
      console.log(`🎯 Weekly limit: ${weeklyLimit} jobs`);
      
      // 🔧 FIX: Build OR parameter for multiple locations in single API call
      const locationNames = searchLocations
        .filter(loc => loc.name !== 'Remote') // Handle remote separately if needed
        .map(loc => {
          // Clean location name (remove state abbreviations for better matching)
          let cleanName = loc.name;
          if (cleanName.includes(',')) {
            cleanName = cleanName.split(',')[0].trim(); // "New York, NY" -> "New York"
          }
          return `"${cleanName}"`;
        });
      
      // Build location filter with OR parameter
      const locationFilter = locationNames.length > 0 ? locationNames.join(' OR ') : null;
      
      console.log(`🔍 Built location filter: ${locationFilter}`);
      
      // Include remote jobs if requested
      const includeRemote = searchLocations.some(loc => loc.name === 'Remote' || loc.type === 'remote');
      if (includeRemote && locationFilter) {
        // For remote, we'll make a separate call or modify the filter
        console.log(`🏠 Remote jobs requested in addition to location-based search`);
      }
      
        // 🔧 FIX: Make single API call with OR parameter
        let searchResults = await this.makeActiveJobsDBAPICall({
        title_filter: `"${jobTitle}"`,
        location_filter: locationFilter,
        limit: Math.min(weeklyLimit, 100), // API limit per call
        offset: 0,
        description_type: 'text'
        });

        // 🆕 NEW: Fallback logic if no results found
        if (searchResults.jobs.length === 0) {
        console.log(`⚠️ No results for "${jobTitle}", trying broader search...`);
        
        // Remove "AI" and try again
        const broaderTitle = jobTitle.replace(/\bAI\b/gi, '').replace(/\s+/g, ' ').trim();
        console.log(`🔄 Trying broader title: "${broaderTitle}"`);
        
        if (broaderTitle !== jobTitle && broaderTitle.length > 0) {
            searchResults = await this.makeActiveJobsDBAPICall({
            title_filter: `"${broaderTitle}"`,
            location_filter: locationFilter,
            limit: Math.min(weeklyLimit, 100),
            offset: 0,
            description_type: 'text'
            });
            
            console.log(`📊 Broader search results: ${searchResults.jobs.length} jobs found`);
        }
        }

      
      console.log(`✅ Multi-location API call completed: ${searchResults.jobs.length} jobs found`);
      
      // If we need remote jobs too, make an additional call
      let remoteJobs = [];
      if (includeRemote) {
        console.log(`🏠 Making additional call for remote jobs...`);
        try {
          const remoteResults = await this.makeActiveJobsDBAPICall({
            title_filter: `"${jobTitle}"`,
            location_filter: '"remote"',
            limit: Math.min(25, weeklyLimit - searchResults.jobs.length), // Remaining quota
            offset: 0,
            description_type: 'text'
          });
          remoteJobs = remoteResults.jobs || [];
          console.log(`🏠 Remote jobs found: ${remoteJobs.length}`);
        } catch (remoteError) {
          console.error('❌ Error fetching remote jobs (non-critical):', remoteError);
        }
      }
      
      // Combine all results
      const allJobs = [...searchResults.jobs, ...remoteJobs];
      
      // Build location stats
        // Build location stats
        const locationStats = {};
        searchLocations.forEach(loc => {
        const jobsForLocation = allJobs.filter(job => {
            // 🔧 FIX: Handle location as object or string
            let jobLocation = '';
            if (typeof job.location === 'string') {
            jobLocation = job.location.toLowerCase();
            } else if (job.location && job.location.original) {
            jobLocation = job.location.original.toLowerCase();
            } else if (job.location && job.location.city) {
            jobLocation = `${job.location.city} ${job.location.state || ''}`.toLowerCase();
            } else {
            jobLocation = '';
            }
            
            const searchLocation = loc.name.toLowerCase();
            
            if (loc.type === 'remote' || loc.name === 'Remote') {
            return jobLocation.includes('remote');
            }
            
            // Match city name
            const cityName = searchLocation.includes(',') ? 
            searchLocation.split(',')[0].trim() : searchLocation;
            return jobLocation.includes(cityName);
        });
        
        locationStats[loc.name] = jobsForLocation.length;
        });
      
      // Build salary stats
      const jobsWithSalary = allJobs.filter(job => job.salary && (job.salary.min || job.salary.max));
      const salaryStats = {
        totalJobs: allJobs.length,
        jobsWithSalary: jobsWithSalary.length,
        salaryPercentage: allJobs.length > 0 ? Math.round((jobsWithSalary.length / allJobs.length) * 100) : 0
      };
      
      console.log(`📊 Final results: ${allJobs.length} total jobs from ${searchLocations.length} locations`);
      console.log(`💰 Salary data available for ${salaryStats.jobsWithSalary}/${salaryStats.totalJobs} jobs (${salaryStats.salaryPercentage}%)`);
      
      return {
        jobs: allJobs,
        totalFound: allJobs.length,
        locationsSearched: searchLocations.length,
        locationStats: locationStats,
        salaryStats: salaryStats,
        searchMethod: 'multi_location_or_parameter',
        apiCalls: includeRemote ? 2 : 1 // Track API efficiency
      };
      
    } catch (error) {
      console.error('❌ Error in multi-location Active Jobs DB search:', error);
      throw error;
    }
  }

  /**
   * 🔧 ADDED: Missing makeActiveJobsDBAPICall method
   */
  async makeActiveJobsDBAPICall(params) {
    try {
      const url = `${this.baseUrl}${this.workingEndpoint}`;
      
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          queryParams.append(key, params[key]);
        }
      });
      
      const fullUrl = `${url}?${queryParams.toString()}`;
      console.log(`🌐 API request: ${fullUrl}`);
      
      const response = await axios.get(url, {
        params: params,
        headers: this.defaultHeaders,
        timeout: 30000
      });
      
      if (response.status !== 200) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = response.data;
      console.log(`📊 API Response received:`, { 
        dataType: Array.isArray(data) ? 'array' : typeof data,
        length: Array.isArray(data) ? data.length : Object.keys(data).length 
      });
      
      // Handle the response format (adjust based on actual API response structure)
      let jobs = [];
      if (Array.isArray(data)) {
        jobs = data;
      } else if (data.jobs && Array.isArray(data.jobs)) {
        jobs = data.jobs;
      } else if (data.data && Array.isArray(data.data)) {
        jobs = data.data;
      } else {
        console.log('📋 Unexpected response structure:', Object.keys(data));
        jobs = [];
      }
      
      // Convert to standard format
      const standardJobs = jobs.map(apiJob => 
        this.convertActiveJobsDBToStandardFormatEnhanced(apiJob, null)
      ).filter(job => job !== null);
      
      console.log(`✅ API call successful: ${standardJobs.length} jobs returned`);
      
      return {
        jobs: standardJobs,
        totalCount: standardJobs.length,
        apiResponse: data
      };
      
    } catch (error) {
      console.error('❌ Active Jobs DB API call failed:', error);
      throw error;
    }
  }

  /**
   * 🆕 NEW: Search jobs in a single location
   */
  async searchSingleLocation(params) {
    const { jobTitle, location, experienceLevel, limit, keywords } = params;

    try {
      // Build location-specific query parameters
      const apiParams = {};

      // Add job title using title_filter parameter
      if (jobTitle) {
        apiParams.title_filter = `"${this.buildLocationOptimizedQuery(jobTitle, keywords, location)}"`;
      }

      // Add location filter (skip for remote)
      if (location.type !== 'remote' && location.name !== 'Remote') {
        apiParams.location_filter = `"${this.normalizeLocationForAPI(location.name)}"`;
      }

      // Standard parameters
      apiParams.limit = Math.min(limit, this.jobsPerCall);
      apiParams.offset = 0;
      apiParams.description_type = 'text';

      // Direct API call to working endpoint
      const url = `${this.baseUrl}${this.workingEndpoint}`;
      
      if (this.diagnosticsEnabled) {
        console.log(`🌐 API request for ${location.name}: ${url}`);
        console.log(`🎯 Query: ${apiParams.title_filter || 'no title filter'}`);
        console.log(`📍 Location filter: ${apiParams.location_filter || 'any location'}`);
      }
      
      const response = await axios.get(url, { 
        params: apiParams,
        headers: this.defaultHeaders,
        timeout: 30000
      });

      const data = response.data;
      const jobs = [];
      
      // Handle response format
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
            const job = this.convertActiveJobsDBToStandardFormatEnhanced(apiJob, location);
            if (job) {
              jobs.push(job);
            }
          } catch (error) {
            console.error(`Error processing individual job:`, error.message);
          }
        }
      }

      return jobs;

    } catch (error) {
      console.error(`❌ Single location search failed for ${location.name}:`, error.message);
      throw error;
    }
  }

  /**
   * 🆕 NEW: Enhanced job conversion with better salary extraction
   */
  convertActiveJobsDBToStandardFormatEnhanced(apiJob, searchLocation) {
    try {
      // Handle different possible field names efficiently
      const title = apiJob.title || 'Unknown Title';
      const company = apiJob.organization || apiJob.company || 'Unknown Company';
      const description = apiJob.description_text || apiJob.description || 'Job description not available';
      const location = apiJob.locations_derived?.[0] || apiJob.location || searchLocation?.name || 'Not specified';
      const applyUrl = apiJob.url || apiJob.apply_url || '';
      const companyUrl = apiJob.organization_url || '';
      const datePosted = apiJob.date_posted || null;
      
      const isDirectEmployer = !!(companyUrl || 
                                  applyUrl?.includes('greenhouse') || 
                                  applyUrl?.includes('lever') ||
                                  applyUrl?.includes('workday'));

      // 🆕 ENHANCED: Better work arrangement detection
      const workArrangement = this.inferWorkArrangementEnhanced(
        description, 
        location,
        apiJob.remote || false,
        searchLocation
      );

      // 🆕 ENHANCED: Advanced salary extraction
      const salaryInfo = this.extractSalaryEnhanced(apiJob, description);

      // 🆕 ENHANCED: Location parsing
      const locationInfo = this.parseLocationEnhanced(location, workArrangement === 'remote');

      const job = {
        title: this.cleanJobTitle(title),
        company: company,
        location: locationInfo,
        description: description,
        fullContent: description,
        jobUrl: applyUrl,
        sourceUrl: applyUrl,
        salary: salaryInfo,
        postedDate: datePosted ? new Date(datePosted).toISOString().split('T')[0] : null,
        sourcePlatform: this.identifySourcePlatform(applyUrl),
        extractedAt: new Date(),
        extractionMethod: 'active_jobs_db_enhanced_weekly',
        workArrangement: workArrangement,
        jobType: this.mapJobType(apiJob.job_type),
        isDirectEmployer: isDirectEmployer,
        isRemote: workArrangement === 'remote',
        
        // 🆕 ENHANCED: Job metadata
        experienceLevel: this.extractExperienceLevel(title, description),
        benefits: this.extractBenefits(description),
        requiredSkills: this.extractSkills(description, 'required'),
        preferredSkills: this.extractSkills(description, 'preferred'),
        
        activeJobsDBData: {
          id: apiJob.id || apiJob.job_id,
          category: apiJob.category,
          job_type: apiJob.job_type,
          experience_level: apiJob.experience_level,
          company_url: companyUrl,
          apply_url: applyUrl,
          remote: apiJob.remote || false,
          date_posted: datePosted,
          discoveryMethod: 'weekly_multi_location',
          searchLocation: searchLocation?.name,
          enhancedExtraction: true
        },
        
        contentQuality: this.assessActiveJobsDBQualityEnhanced(apiJob, salaryInfo),
        matchScore: this.calculateEnhancedMatchScore(apiJob, searchLocation),
        
        metadata: {
          discoveryMethod: 'weekly_multi_location_enhanced',
          platform: this.identifySourcePlatform(applyUrl),
          extractedAt: new Date(),
          contentLength: description.length,
          directEmployerPosting: isDirectEmployer,
          searchLocation: searchLocation?.name,
          enhancedSalaryExtraction: !!salaryInfo.extractionMethod,
          locationConfidence: this.calculateLocationConfidence(location, searchLocation),
          qualityIndicators: {
            directEmployerLink: isDirectEmployer,
            recentPosting: this.isRecentPosting(datePosted),
            detailedDescription: description.length > 300,
            salaryProvided: !!(salaryInfo.min || salaryInfo.max),
            locationSpecific: searchLocation?.type !== 'remote',
            enhancedExtraction: true
          }
        }
      };

      return job;

    } catch (error) {
      console.error('Error converting Active Jobs DB job to enhanced format:', error);
      return null;
    }
  }

  /**
   * 🆕 NEW: Enhanced salary extraction with multiple methods
   */
  extractSalaryEnhanced(apiJob, description) {
    const salary = {
      min: null,
      max: null,
      currency: 'USD',
      period: null,
      source: null,
      confidence: 0,
      extractionMethod: null
    };

    // Method 1: Direct API fields
    if (apiJob.salary_min && typeof apiJob.salary_min === 'number' && apiJob.salary_min > 0) {
      salary.min = apiJob.salary_min;
      salary.source = 'api';
      salary.confidence = 90;
      salary.extractionMethod = 'api_direct';
    }
    
    if (apiJob.salary_max && typeof apiJob.salary_max === 'number' && apiJob.salary_max > 0) {
      salary.max = apiJob.salary_max;
      if (!salary.source) {
        salary.source = 'api';
        salary.confidence = 90;
        salary.extractionMethod = 'api_direct';
      }
    }

    // Method 2: Enhanced description parsing
    if (!salary.min && !salary.max && description) {
      const descriptionSalary = this.extractSalaryFromDescription(description);
      if (descriptionSalary.min || descriptionSalary.max) {
        Object.assign(salary, descriptionSalary);
        salary.source = 'description';
        salary.extractionMethod = 'description_parsing';
      }
    }

    // Method 3: Industry/role estimation
    if (!salary.min && !salary.max) {
      const estimatedSalary = this.estimateSalaryByRole(apiJob.title || '', apiJob.location || '');
      if (estimatedSalary.min) {
        Object.assign(salary, estimatedSalary);
        salary.source = 'inferred';
        salary.extractionMethod = 'role_estimation';
      }
    }

    // Determine salary period
    if (salary.min || salary.max) {
      salary.period = this.determineSalaryPeriod(description, salary.min || salary.max);
    }

    // Clean up zero values
    if (salary.min === 0) salary.min = null;
    if (salary.max === 0) salary.max = null;

    return salary;
  }

  /**
   * 🆕 NEW: Extract salary from job description text
   */
  extractSalaryFromDescription(description) {
    const salary = { min: null, max: null, confidence: 0 };
    
    if (!description) return salary;

    // Salary patterns (improved)
    const patterns = [
      // Range patterns: $80,000 - $120,000, $80K-$120K, etc.
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*[-–—to]\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /\$(\d{1,3}(?:,\d{3})*)\s*k?\s*[-–—to]\s*\$?(\d{1,3}(?:,\d{3})*)\s*k/gi,
      // Single salary with range indicators
      /salary.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /compensation.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      // K notation: 80K, 120K
      /(\d{2,3})k\s*[-–—to]\s*(\d{2,3})k/gi,
      // Up to salary: up to $100,000
      /up\s+to\s+\$(\d{1,3}(?:,\d{3})*)/gi
    ];

    for (const pattern of patterns) {
      const matches = [...description.matchAll(pattern)];
      for (const match of matches) {
        let min = null, max = null;
        
        if (match[1] && match[2]) {
          // Range pattern
          min = this.parseSalaryNumber(match[1]);
          max = this.parseSalaryNumber(match[2]);
        } else if (match[1]) {
          // Single salary
          const value = this.parseSalaryNumber(match[1]);
          if (match[0].toLowerCase().includes('up to')) {
            max = value;
          } else {
            min = value;
          }
        }

        if (min || max) {
          // Validate salary range
          if (min && max && min > max) {
            [min, max] = [max, min]; // Swap if reversed
          }
          
          // Sanity check: reasonable salary range
          if ((min && min >= 20000 && min <= 500000) || (max && max >= 20000 && max <= 500000)) {
            salary.min = min;
            salary.max = max;
            salary.confidence = 70; // Medium confidence for text extraction
            return salary;
          }
        }
      }
    }

    return salary;
  }

  /**
   * 🆕 NEW: Parse salary number from text
   */
  parseSalaryNumber(text) {
    if (!text) return null;
    
    // Remove commas and convert to number
    let num = parseFloat(text.replace(/,/g, ''));
    
    // Handle K notation
    if (text.toLowerCase().includes('k') || num < 1000) {
      if (num < 1000) {
        num *= 1000;
      }
    }
    
    return num > 0 ? Math.round(num) : null;
  }

  /**
   * 🆕 NEW: Estimate salary based on job title and location
   */
  estimateSalaryByRole(title, location) {
    const salary = { min: null, max: null, confidence: 30 };
    
    if (!title) return salary;

    const titleLower = title.toLowerCase();
    
    // Basic salary estimates by role (in USD, annually)
    const roleEstimates = {
      'software engineer': { min: 70000, max: 130000 },
      'senior software engineer': { min: 100000, max: 180000 },
      'staff engineer': { min: 150000, max: 250000 },
      'product manager': { min: 90000, max: 160000 },
      'senior product manager': { min: 120000, max: 200000 },
      'data scientist': { min: 80000, max: 150000 },
      'senior data scientist': { min: 110000, max: 180000 },
      'frontend developer': { min: 65000, max: 120000 },
      'backend developer': { min: 70000, max: 130000 },
      'full stack developer': { min: 70000, max: 130000 },
      'devops engineer': { min: 75000, max: 140000 },
      'marketing manager': { min: 60000, max: 120000 },
      'sales manager': { min: 50000, max: 100000 },
      'designer': { min: 55000, max: 110000 },
      'ux designer': { min: 60000, max: 120000 }
    };

    // Find matching role
    for (const [role, estimate] of Object.entries(roleEstimates)) {
      if (titleLower.includes(role)) {
        salary.min = estimate.min;
        salary.max = estimate.max;
        
        // Adjust for high-cost locations
        if (location && this.isHighCostLocation(location)) {
          salary.min = Math.round(salary.min * 1.3);
          salary.max = Math.round(salary.max * 1.3);
        }
        
        break;
      }
    }

    return salary;
  }

  /**
   * 🆕 NEW: Determine if location is high-cost
   */
  isHighCostLocation(location) {
    const highCostAreas = [
      'san francisco', 'sf', 'bay area', 'palo alto', 'mountain view',
      'new york', 'nyc', 'manhattan', 'brooklyn',
      'seattle', 'bellevue', 'redmond',
      'los angeles', 'santa monica', 'venice',
      'boston', 'cambridge',
      'washington dc', 'dc'
    ];
    
    const locationLower = location.toLowerCase();
    return highCostAreas.some(area => locationLower.includes(area));
  }

  /**
   * 🆕 NEW: Determine salary period (hourly, monthly, annually)
   */
  determineSalaryPeriod(description, salaryAmount) {
    if (!description || !salaryAmount) return 'annually';
    
    const descLower = description.toLowerCase();
    
    if (descLower.includes('per hour') || descLower.includes('/hour') || descLower.includes('hourly')) {
      return 'hourly';
    }
    
    if (descLower.includes('per month') || descLower.includes('/month') || descLower.includes('monthly')) {
      return 'monthly';
    }
    
    // If salary is very low, probably hourly
    if (salaryAmount < 100) {
      return 'hourly';
    }
    
    // If salary is moderate, probably monthly
    if (salaryAmount >= 100 && salaryAmount < 20000) {
      return 'monthly';
    }
    
    return 'annually';
  }

  /**
   * 🆕 NEW: Enhanced location parsing
   */
  parseLocationEnhanced(locationString, isRemote) {
    if (!locationString || isRemote) {
      return {
        original: locationString || 'Remote',
        parsed: {
          city: null,
          state: null,
          country: 'USA',
          isRemote: true,
          coordinates: null
        }
      };
    }
    
    const original = locationString.trim();
    const parts = original.split(',').map(p => p.trim());
    
    // Handle different location formats
    let city = null, state = null, country = 'USA';
    
    if (parts.length >= 2) {
      city = parts[0];
      
      // Check if second part is a state abbreviation or full name
      const secondPart = parts[1];
      if (secondPart.length === 2 || this.isUSState(secondPart)) {
        state = secondPart;
        if (parts[2]) {
          country = parts[2];
        }
      } else {
        country = secondPart;
      }
    } else if (parts.length === 1) {
      // Single location, try to determine if it's city or state
      if (this.isUSState(parts[0])) {
        state = parts[0];
      } else {
        city = parts[0];
      }
    }

    return {
      original,
      parsed: {
        city,
        state,
        country,
        isRemote: false,
        coordinates: null // Could add geocoding later
      }
    };
  }

  /**
   * 🆕 NEW: Check if string is US state
   */
  isUSState(str) {
    const states = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
      'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
      'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
      'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
      'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
      'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
      'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
      'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
      'West Virginia', 'Wisconsin', 'Wyoming'
    ];
    
    return states.includes(str.toUpperCase()) || 
           states.some(state => state.toLowerCase() === str.toLowerCase());
  }

/**
   * 🆕 NEW: Enhanced work arrangement detection (continued)
   */
  inferWorkArrangementEnhanced(description, location, isRemote, searchLocation) {
    // Priority 1: Search location is remote
    if (searchLocation?.type === 'remote' || searchLocation?.name === 'Remote') {
      return 'remote';
    }

    // Priority 2: API indicates remote
    if (isRemote) {
      return 'remote';
    }

    // Priority 3: Location string indicates remote
    if (location && location.toLowerCase().includes('remote')) {
      return 'remote';
    }
    
    const lowerDesc = (description || '').toLowerCase();
    const lowerLoc = (location || '').toLowerCase();
    
    // Check description for work arrangement keywords
    const remoteKeywords = ['remote', 'work from home', 'telecommute', 'distributed', 'wfh'];
    const hybridKeywords = ['hybrid', 'flexible', 'part remote', 'office days', 'mix of remote'];
    const onsiteKeywords = ['on-site', 'onsite', 'in office', 'office location', 'headquarters'];
    
    if (remoteKeywords.some(keyword => lowerDesc.includes(keyword) || lowerLoc.includes(keyword))) {
      if (hybridKeywords.some(keyword => lowerDesc.includes(keyword))) {
        return 'hybrid';
      }
      return 'remote';
    }
    
    if (hybridKeywords.some(keyword => lowerDesc.includes(keyword))) {
      return 'hybrid';
    }
    
    if (onsiteKeywords.some(keyword => lowerDesc.includes(keyword))) {
      return 'onsite';
    }
    
    // Default based on location specificity
    return location && !lowerLoc.includes('remote') ? 'onsite' : 'unknown';
  }

  /**
   * 🆕 NEW: Extract experience level from title and description
   */
  extractExperienceLevel(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('senior') || text.includes('sr.') || text.includes('lead') || text.includes('principal')) {
      return 'senior';
    }
    
    if (text.includes('junior') || text.includes('jr.') || text.includes('entry') || text.includes('graduate')) {
      return 'entry';
    }
    
    if (text.includes('director') || text.includes('vp') || text.includes('vice president') || text.includes('chief')) {
      return 'executive';
    }
    
    // Look for years of experience
    const yearMatches = text.match(/(\d+)[\s\-+]*years?\s+(?:of\s+)?experience/);
    if (yearMatches) {
      const years = parseInt(yearMatches[1]);
      if (years <= 2) return 'entry';
      if (years <= 5) return 'mid';
      if (years <= 8) return 'senior';
      return 'lead';
    }
    
    return 'mid';
  }

  /**
   * 🆕 NEW: Extract benefits from description
   */
  extractBenefits(description) {
    if (!description) return [];
    
    const benefits = [];
    const text = description.toLowerCase();
    
    const benefitKeywords = {
      'health insurance': ['health insurance', 'medical coverage', 'healthcare', 'dental', 'vision'],
      '401k': ['401k', '401(k)', 'retirement plan', 'pension'],
      'pto': ['pto', 'paid time off', 'vacation days', 'holiday pay'],
      'equity': ['equity', 'stock options', 'rsu', 'espp'],
      'remote work': ['remote work', 'work from home', 'flexible location'],
      'learning budget': ['learning budget', 'education allowance', 'training budget', 'conference budget'],
      'gym membership': ['gym', 'fitness', 'wellness'],
      'parental leave': ['parental leave', 'maternity', 'paternity'],
      'flexible hours': ['flexible hours', 'flex time', 'flexible schedule']
    };
    
    for (const [benefit, keywords] of Object.entries(benefitKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        benefits.push(benefit);
      }
    }
    
    return benefits;
  }

  /**
   * 🆕 NEW: Extract skills from description
   */
  extractSkills(description, type = 'required') {
    if (!description) return [];
    
    const skills = [];
    const text = description.toLowerCase();
    
    // Common tech skills
    const techSkills = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node.js', 'express',
      'sql', 'mongodb', 'postgresql', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
      'git', 'html', 'css', 'typescript', 'php', 'ruby', 'go', 'rust', 'swift',
      'figma', 'sketch', 'photoshop', 'illustrator', 'tableau', 'power bi'
    ];
    
    // Look for skills in the description
    for (const skill of techSkills) {
      if (text.includes(skill.toLowerCase())) {
        skills.push(skill);
      }
    }
    
    return skills.slice(0, 10); // Limit to top 10
  }

  /**
   * Build location-optimized query
   */
  buildLocationOptimizedQuery(jobTitle, keywords = [], location) {
    let query = jobTitle.trim();
    
    // Remove duplicate words
    const words = query.split(' ');
    const uniqueWords = [...new Set(words)];
    query = uniqueWords.join(' ');
    
    // For remote searches, don't modify the query
    if (location?.type === 'remote') {
      return query;
    }
    
    // For location-specific searches, keep query clean
    query = query.replace(/\b(remote|onsite|hybrid)\b/gi, '').replace(/\s+/g, ' ').trim();
    
    console.log(`🎯 Location-optimized query for ${location?.name}: "${query}"`);
    return query;
  }

  /**
   * Normalize location for API search
   */
  normalizeLocationForAPI(locationName) {
    if (!locationName || locationName === 'Remote') return '';
    
    // Remove state abbreviations and common suffixes for broader search
    return locationName
      .replace(/,\s*(NY|CA|TX|FL|WA|MA|IL|GA|NC|VA|PA|OH|MI|NJ|CO|AZ|TN|IN|MO|MD|WI|MN|OR|SC|AL|LA|KY|OK|IA|AR|UT|MS|KS|NV|NM|WV|NH|ME|HI|RI|DE|SD|ND|AK|VT|WY|MT|ID)$/i, '')
      .replace(/,\s*United States?$/i, '')
      .replace(/,\s*USA?$/i, '')
      .trim();
  }

  /**
   * Calculate location confidence score
   */
  calculateLocationConfidence(foundLocation, searchLocation) {
    if (!foundLocation || !searchLocation) return 50;
    
    if (searchLocation.type === 'remote') {
      return foundLocation.toLowerCase().includes('remote') ? 95 : 60;
    }
    
    const searchName = searchLocation.name.toLowerCase();
    const foundName = foundLocation.toLowerCase();
    
    if (foundName.includes(searchName) || searchName.includes(foundName)) {
      return 90;
    }
    
    return 70;
  }

  /**
   * Calculate average salary for location
   */
  calculateLocationAvgSalary(jobs) {
    const salaries = jobs
      .map(job => {
        if (job.salary && (job.salary.min || job.salary.max)) {
          return ((job.salary.min || 0) + (job.salary.max || 0)) / 2;
        }
        return 0;
      })
      .filter(salary => salary > 0);
    
    return salaries.length > 0 
      ? Math.round(salaries.reduce((sum, sal) => sum + sal, 0) / salaries.length)
      : 0;
  }

  /**
   * Calculate overall average salary
   */
  calculateOverallAvgSalary(jobs) {
    return this.calculateLocationAvgSalary(jobs);
  }

  /**
   * Enhanced match score calculation
   */
  calculateEnhancedMatchScore(apiJob, searchLocation) {
    let score = 75; // Base score for Active Jobs DB quality
    
    // Direct employer bonus
    const applyUrl = apiJob.apply_url || apiJob.url || '';
    if (apiJob.company_url || this.isDirectEmployerATS(applyUrl)) {
      score += 10;
    }
    
    // Recent posting bonus
    if (this.isRecentPosting(apiJob.date_posted)) {
      score += 10;
    }
    
    // Content quality bonus
    const description = apiJob.description || apiJob.description_text || '';
    if (description.length > 500) score += 5;
    if (description.length > 1000) score += 3;
    
    // Salary information bonus
    if (apiJob.salary_min || apiJob.salary_max) {
      score += 8;
    }
    
    // Location match bonus
    if (searchLocation) {
      const locationConfidence = this.calculateLocationConfidence(
        apiJob.location || apiJob.locations_derived?.[0],
        searchLocation
      );
      score += Math.round(locationConfidence * 0.1);
    }
    
    return Math.min(score, 100);
  }

  /**
   * Enhanced quality assessment
   */
  assessActiveJobsDBQualityEnhanced(apiJob, salaryInfo) {
    let qualityScore = 0;
    
    // Basic content quality
    const title = apiJob.title || '';
    const company = apiJob.organization || apiJob.company || '';
    const description = apiJob.description_text || apiJob.description || '';
    const location = apiJob.location || '';
    const applyUrl = apiJob.apply_url || apiJob.url || '';
    
    if (title && title.length > 5) qualityScore += 2;
    if (company) qualityScore += 2;
    if (description && description.length > 100) qualityScore += 3;
    if (location) qualityScore += 1;
    if (applyUrl) qualityScore += 2;
    
    // Enhanced quality indicators
    if (apiJob.organization_url) qualityScore += 3;
    if (salaryInfo && (salaryInfo.min || salaryInfo.max)) qualityScore += 4; // Higher bonus for salary
    if (this.isRecentPosting(apiJob.date_posted)) qualityScore += 2;
    
    // Content depth bonus
    if (description.length > 500) qualityScore += 2;
    if (description.length > 1000) qualityScore += 2;
    
    // Direct employer ATS bonus
    if (this.isDirectEmployerATS(applyUrl)) {
      qualityScore += 4;
    }
    
    if (qualityScore >= 18) return 'high';
    else if (qualityScore >= 12) return 'medium';
    else return 'low';
  }

  /**
   * Check if URL is direct employer ATS
   */
  isDirectEmployerATS(url) {
    if (!url) return false;
    
    const directATSList = [
      'greenhouse.io', 'lever.co', 'workday.com', 'smartrecruiters.com',
      'jobvite.com', 'bamboohr.com', 'icims.com', 'taleo.net',
      'successfactors.com', 'workable.com', 'personio.com'
    ];
    
    return directATSList.some(ats => url.toLowerCase().includes(ats));
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
    
    return 'ACTIVE_JOBS_DB_DIRECT';
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
   * SIMPLIFIED API search for backward compatibility
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

    // Convert to new multi-location format
    const searchLocations = location && location !== 'Remote' && !remote
      ? [{ name: location, type: 'city' }]
      : [{ name: 'Remote', type: 'remote' }];

    const enhancedParams = {
      jobTitle,
      searchLocations,
      experienceLevel,
      weeklyLimit: limit,
      keywords
    };

    const results = await this.searchActiveJobsDBWithLocations(enhancedParams);
    
    // Return in original format for backward compatibility
    return {
      jobs: results.jobs,
      totalAvailable: results.totalFound,
      searchParams: searchParams,
      apiResponse: {
        resultCount: results.totalFound,
        totalCount: results.totalFound,
        searchUrl: this.baseUrl + this.workingEndpoint,
        premiumFeatures: results.apiResponse.premiumFeatures
      }
    };
  }

  /**
   * API health status for weekly job discovery
   */
  async getApiHealth() {
    try {
      if (!this.apiKey) {
        return {
          status: 'not_configured',
          message: 'Active Jobs DB API key not set',
          weeklyCapability: 'none'
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
        message: 'Active Jobs DB API ready for weekly job discovery',
        workingEndpoint: this.workingEndpoint,
        totalJobsAvailable: response.data.total_count || response.data.length || 0,
        provider: 'Active Jobs DB',
        weeklyCapabilities: {
          multiLocationSearch: true,
          enhancedSalaryExtraction: true,
          casualPlanLimit: this.weeklyBudget.casual,
          hunterPlanLimit: this.weeklyBudget.hunter
        },
        features: [
          'Multi-location job search',
          'Enhanced salary extraction', 
          '100,000+ company coverage',
          'Weekly quota management',
          'Premium job analysis'
        ],
        coverage: '100,000+ company career sites and ATS platforms',
        lastTested: new Date(),
        salaryExtractionStats: this.salaryExtractionStats
      };

    } catch (error) {
      let status = 'error';
      let message = `Active Jobs DB API connection failed: ${error.message}`;
      
      if (error.response?.status === 401) {
        status = 'auth_error';
        message = 'Active Jobs DB API authentication failed - check your RapidAPI key';
      } else if (error.response?.status === 429) {
        status = 'rate_limited';
        message = 'Active Jobs DB API rate limit exceeded';
      } else if (error.response?.status === 403) {
        status = 'forbidden';
        message = 'Active Jobs DB API access forbidden - check subscription status';
      }

      return {
        status,
        message,
        error: error.response?.data || error.message,
        provider: 'Active Jobs DB',
        weeklyCapabilities: {
          multiLocationSearch: false,
          enhancedSalaryExtraction: false,
          casualPlanLimit: 0,
          hunterPlanLimit: 0
        },
        lastTested: new Date()
      };
    }
  }

  /**
   * Get enhanced statistics for weekly job discovery
   */
  getWeeklyDiscoveryStats() {
    return {
      searchAttempts: this.searchAttempts,
      successfulSearches: this.successfulSearches,
      totalJobsFound: this.totalJobsFound,
      locationsSearched: this.locationsSearched,
      salaryExtractionStats: this.salaryExtractionStats,
      weeklyLimits: this.weeklyBudget,
      averageJobsPerSearch: this.successfulSearches > 0 ? Math.round(this.totalJobsFound / this.successfulSearches) : 0,
      enhancedFeatures: {
        multiLocationSearch: true,
        salaryExtraction: true,
        locationAnalytics: true,
        weeklyQuotaManagement: true
      }
    };
  }

  /**
   * Get location performance analytics
   */
  getLocationPerformanceAnalytics() {
    const locationStats = {};
    
    this.locationsSearched.forEach(location => {
      if (!locationStats[location]) {
        locationStats[location] = {
          searchCount: 1,
          avgJobsFound: 0,
          lastSearched: new Date()
        };
      } else {
        locationStats[location].searchCount++;
      }
    });

    return {
      totalLocationsSearched: this.locationsSearched.length,
      uniqueLocations: [...new Set(this.locationsSearched)].length,
      locationStats,
      recommendations: this.getLocationRecommendations(locationStats)
    };
  }

  /**
   * Get location-based recommendations
   */
  getLocationRecommendations(locationStats) {
    const recommendations = [];
    
    if (this.locationsSearched.length === 0) {
      recommendations.push('Add multiple locations to increase job discovery opportunities');
    } else if (this.locationsSearched.length === 1) {
      recommendations.push('Consider adding 2-3 additional locations for better weekly results');
    }
    
    if (!this.locationsSearched.includes('Remote')) {
      recommendations.push('Include "Remote" to access work-from-home opportunities');
    }
    
    return recommendations;
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats() {
    this.searchAttempts = 0;
    this.successfulSearches = 0;
    this.totalJobsFound = 0;
    this.locationsSearched = [];
    this.salaryExtractionStats = {
      total: 0,
      withSalary: 0,
      extractionRate: 0
    };
  }

  /**
   * Log usage for monitoring and optimization
   */
  logWeeklySearchUsage(searchParams, results) {
    const usage = {
      timestamp: new Date(),
      searchParams: {
        jobTitle: searchParams.jobTitle,
        locationsCount: searchParams.searchLocations?.length || 0,
        weeklyLimit: searchParams.weeklyLimit
      },
      results: {
        totalJobsFound: results.totalFound,
        locationsSearched: results.locationsSearched,
        salaryExtractionRate: results.salaryStats?.extractionRate || 0,
        avgSalary: results.salaryStats?.avgSalary || 0
      },
      performance: {
        searchDuration: Date.now() - this.searchStartTime,
        apiCallsUsed: results.locationsSearched || 1,
        jobsPerApiCall: results.totalFound / (results.locationsSearched || 1)
      }
    };
    
    console.log(`📊 Weekly Search Usage Log:`, usage);
    return usage;
  }

  /**
   * Get budget status and recommendations for weekly model
   */
  getBudgetStatus() {
    const estimatedWeeklyUsage = this.searchAttempts * this.jobsPerCall * 7; // Weekly estimate
    
    return {
      weeklyBudgets: this.weeklyBudget,
      jobsPerCall: this.jobsPerCall,
      estimatedWeeklyUsage: estimatedWeeklyUsage,
      searchesMade: this.searchAttempts,
      jobsFoundTotal: this.totalJobsFound,
      recommendations: this.getWeeklyBudgetRecommendations(),
      budgetStatus: 'weekly_optimized',
      salaryExtractionEnabled: true,
      multiLocationEnabled: true
    };
  }

  /**
   * Get weekly budget recommendations
   */
  getWeeklyBudgetRecommendations() {
    const recommendations = [];
    
    recommendations.push('✅ Weekly model optimized for consistent job discovery');
    recommendations.push('🎯 Multi-location search maximizes opportunities');
    recommendations.push('💰 Enhanced salary extraction improves job data quality');
    
    if (this.salaryExtractionStats.extractionRate > 70) {
      recommendations.push('🔥 Excellent salary extraction rate achieved');
    } else {
      recommendations.push('📈 Salary extraction rate can be improved with better job sources');
    }
    
    return recommendations;
  }

  /**
   * Log budget usage for weekly tracking
   */
  logBudgetUsage(jobsRetrieved, queryType = 'weekly_multi_location') {
    const usage = {
      timestamp: new Date(),
      jobsRetrieved: jobsRetrieved,
      queryType: queryType,
      weeklyImpact: jobsRetrieved,
      cumulativeUsage: this.totalJobsFound,
      salaryExtractionRate: this.salaryExtractionStats.extractionRate,
      locationsSearched: this.locationsSearched.length
    };
    
    console.log(`💰 Weekly Budget Usage Log:`, usage);
    
    return usage;
  }
}

module.exports = ActiveJobsDBExtractor;