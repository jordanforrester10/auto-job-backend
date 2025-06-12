// config/jobBoards.js - REAL JOB BOARD CONFIGURATION
module.exports = {
  // Supported job board platforms
  platforms: {
    greenhouse: {
      name: 'Greenhouse',
      displayName: 'Greenhouse',
      icon: '🌱',
      description: 'Tech startups and scale-ups with comprehensive job details',
      urlPatterns: [
        'greenhouse.io/jobs',
        'greenhouse.io/job',
        'boards.greenhouse.io'
      ],
      searchPriority: 1, // Higher priority for tech roles
      expectedFeatures: [
        'Comprehensive job descriptions',
        'Team and culture information',
        'Tech stack details',
        'Interview process overview'
      ],
      targetCompanyTypes: [
        'Tech startups',
        'Scale-ups',
        'Venture-backed companies',
        'Y Combinator companies',
        'Series A-C companies'
      ],
      averageContentQuality: 'high',
      searchModifiers: ['site:greenhouse.io', 'inurl:jobs'],
      apiEndpoints: {
        // Note: These would be used if we had direct API access
        publicJobs: 'https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs',
        departments: 'https://boards-api.greenhouse.io/v1/boards/{board_token}/departments'
      }
    },
    
    lever: {
      name: 'Lever',
      displayName: 'Lever',
      icon: '⚡',
      description: 'Growth-stage companies with detailed role information',
      urlPatterns: [
        'jobs.lever.co',
        'lever.co/jobs'
      ],
      searchPriority: 2,
      expectedFeatures: [
        'Detailed role descriptions',
        'Career progression paths',
        'Team structure information',
        'Hiring manager details'
      ],
      targetCompanyTypes: [
        'Growth-stage companies',
        'Expanding teams',
        'Series A-D companies',
        'Scale-ups with clear structure'
      ],
      averageContentQuality: 'high',
      searchModifiers: ['site:lever.co', 'inurl:jobs'],
      apiEndpoints: {
        // Note: These would be used if we had direct API access
        postings: 'https://api.lever.co/v0/postings/{company}',
        departments: 'https://api.lever.co/v0/postings/{company}?group=department'
      }
    },
    
    indeed: {
      name: 'Indeed',
      displayName: 'Indeed',
      icon: '🔍',
      description: 'Established companies with verified direct postings',
      urlPatterns: [
        'indeed.com/viewjob',
        'indeed.com/jobs',
        'indeed.com/job'
      ],
      searchPriority: 3, // Lower priority but good for established companies
      expectedFeatures: [
        'Direct company postings',
        'Verified employer accounts',
        'Complete job details',
        'Application instructions'
      ],
      targetCompanyTypes: [
        'Established companies',
        'Enterprise organizations',
        'Public companies',
        'Direct employers'
      ],
      averageContentQuality: 'medium',
      searchModifiers: ['site:indeed.com', 'inurl:viewjob', '-recruiter', '-staffing'],
      exclusionKeywords: [
        'staffing',
        'recruiting',
        'placement',
        'consulting firm',
        'headhunter'
      ]
    }
  },
  
  // Search configuration
  searchConfig: {
    maxJobsPerPlatform: 5,
    maxTotalJobs: 12,
    minContentLength: 400,
    maxPostingAge: 30, // days
    timeoutPerPlatform: 30000, // 30 seconds
    retryAttempts: 2,
    rateLimitDelay: 1000, // 1 second between requests
    
    // Quality thresholds
    qualityThresholds: {
      minQualityScore: 60,
      minMatchScore: 70,
      requiredSections: ['requirements', 'responsibilities'],
      preferredSections: ['benefits', 'tech_stack', 'team_info']
    },
    
    // Search strategy
    searchStrategy: {
      useParallelSearch: false, // Sequential to avoid rate limiting
      prioritizeRecent: true,
      diversifyPlatforms: true,
      maxSearchQueriesPerPlatform: 3
    }
  },
  
  // Content validation rules
  contentValidation: {
    minWordCount: 100,
    maxWordCount: 5000,
    requiredKeywords: {
      jobPosting: ['position', 'role', 'job', 'opportunity'],
      requirements: ['requirement', 'qualification', 'skill', 'experience'],
      company: ['company', 'team', 'organization', 'we are']
    },
    blacklistedKeywords: [
      'this posting has expired',
      'job no longer available',
      'position filled',
      'scam',
      'pyramid scheme'
    ],
    urlValidation: {
      allowedProtocols: ['https'],
      requiredDomains: ['greenhouse.io', 'lever.co', 'indeed.com'],
      blockedDomains: ['spam.com', 'fake-jobs.com']
    }
  },
  
  // Platform-specific extraction rules
  extractionRules: {
    greenhouse: {
      selectors: {
        title: '.app-title, [data-qa="job-title"]',
        description: '.job-post-content, [data-qa="job-description"]',
        requirements: '.requirements, [data-qa="requirements"]',
        team: '.team-info, [data-qa="team"]',
        benefits: '.benefits, [data-qa="benefits"]'
      },
      identifierPatterns: {
        jobId: /\/jobs\/(\d+)/,
        officeId: /office_id=(\d+)/
      }
    },
    
    lever: {
      selectors: {
        title: '.posting-headline, [data-qa="posting-name"]',
        description: '.posting-description, [data-qa="posting-description"]',
        team: '.posting-categories, [data-qa="posting-team"]',
        requirements: '.posting-requirements'
      },
      identifierPatterns: {
        company: /jobs\.lever\.co\/([^\/]+)/,
        postingId: /jobs\.lever\.co\/[^\/]+\/([^\/\?]+)/
      }
    },
    
    indeed: {
      selectors: {
        title: '[data-jk] h1, .jobsearch-JobInfoHeader-title',
        description: '.jobsearch-jobDescriptionText, #jobDescriptionText',
        company: '[data-jk] .jobsearch-CompanyInfoContainer',
        salary: '.jobsearch-JobMetadataHeader-item'
      },
      identifierPatterns: {
        jobKey: /jk=([^&]+)/,
        companyId: /cmp=([^&]+)/
      }
    }
  },
  
  // Error handling configuration
  errorHandling: {
    retryableErrors: [
      'TIMEOUT',
      'RATE_LIMITED',
      'TEMPORARY_FAILURE',
      'NETWORK_ERROR'
    ],
    fatalErrors: [
      'INVALID_CREDENTIALS',
      'BLOCKED_ACCESS',
      'PLATFORM_DISCONTINUED'
    ],
    fallbackStrategies: {
      onPlatformFailure: 'continue_with_other_platforms',
      onAllPlatformFailure: 'return_partial_results',
      onContentExtractionFailure: 'use_fallback_extraction'
    }
  },
  
  // Analytics and monitoring
  analytics: {
    trackSearchPerformance: true,
    trackContentQuality: true,
    trackUserEngagement: true,
    metrics: {
      searchLatency: 'platform_search_duration',
      extractionSuccess: 'content_extraction_rate',
      qualityScore: 'average_content_quality',
      userSatisfaction: 'job_application_rate'
    }
  },
  
  // Rate limiting and respectful scraping
  respectfulScraping: {
    observeRobotsTxt: true,
    respectRateLimits: true,
    userAgent: 'auto-job.ai-bot/1.0 (Job Discovery Service)',
    crawlDelay: 1000, // 1 second between requests
    concurrentRequests: 1, // Sequential processing
    sessionRotation: true
  },
  
  // Legal and compliance
  compliance: {
    respectTermsOfService: true,
    attributeSource: true,
    respectCopyright: true,
    dataRetentionDays: 90,
    anonymizeUserData: true,
    complianceNotes: [
      'All job board searches respect terms of service',
      'Content is used for matching purposes only',
      'No bulk downloading or data resale',
      'Attribution to original job boards maintained'
    ]
  },
  
  // Cost optimization
  costOptimization: {
    claudeSearchCost: 0.35, // Average cost per search with Claude
    gpt4AnalysisCost: 0.02, // Average cost per job analysis
    targetTotalCost: 0.57, // Target cost per complete search
    optimizations: [
      'Batch processing for analysis',
      'Efficient content extraction',
      'Smart retry logic',
      'Quality-based filtering'
    ]
  }
};