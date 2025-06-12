// utils/jobBoardPatterns.js
/**
 * Pattern-based scraping for career pages
 * Covers ~35% additional companies with predictable patterns
 */

// Common CSS selectors for job listings
const CSS_SELECTORS = {
  jobLinks: [
    'a[href*="/job/"]',
    'a[href*="/jobs/"]',
    'a[href*="/career/"]',
    'a[href*="/careers/"]',
    'a[href*="/position/"]',
    'a[href*="/opening/"]',
    '.job-link a',
    '.job-item a',
    '.position-link a',
    '.career-item a',
    '[data-job-id] a',
    '.job-listing a',
    '.job-card a',
    '.position-card a'
  ],
  
  jobTitles: [
    '.job-title',
    '.position-title',
    '.role-title',
    'h2 a',
    'h3 a',
    '[data-job-title]',
    '.title a',
    '.job-name',
    '.position-name'
  ],
  
  jobDescriptions: [
    '.job-description',
    '.position-description',
    '.job-content',
    '.job-details',
    '.position-details',
    '.description',
    '.content'
  ],
  
  locations: [
    '.job-location',
    '.position-location',
    '.location',
    '[data-location]',
    '.office-location',
    '.work-location'
  ],
  
  departments: [
    '.job-department',
    '.department',
    '.team',
    '[data-department]',
    '.job-category',
    '.category'
  ]
};

// URL patterns for different career page types
const URL_PATTERNS = {
  workday: {
    basePattern: /myworkdayjobs\.com\/([^\/]+)/,
    jobUrlPattern: /myworkdayjobs\.com\/[^\/]+\/job\/[^\/]+\/([^\/]+)/,
    searchEndpoint: (company) => `https://${company}.myworkdayjobs.com/${company}/search`,
    selectors: {
      jobLinks: 'a[data-automation-id="jobTitle"]',
      jobTitles: '[data-automation-id="jobTitle"]',
      locations: '[data-automation-id="locations"]',
      departments: '[data-automation-id="jobCategory"]'
    }
  },
  
  bamboohr: {
    basePattern: /bamboohr\.com\/jobs\/([^\/]+)/,
    jobUrlPattern: /bamboohr\.com\/jobs\/[^\/]+\/([^\/]+)/,
    searchEndpoint: (company) => `https://${company}.bamboohr.com/jobs/`,
    selectors: {
      jobLinks: '.job-board-item a',
      jobTitles: '.job-board-item h3',
      locations: '.job-board-item .location',
      departments: '.job-board-item .department'
    }
  },
  
  smartrecruiters: {
    basePattern: /jobs\.smartrecruiters\.com\/([^\/]+)/,
    jobUrlPattern: /jobs\.smartrecruiters\.com\/[^\/]+\/([^\/]+)/,
    searchEndpoint: (company) => `https://jobs.smartrecruiters.com/${company}`,
    selectors: {
      jobLinks: '.opening-job a',
      jobTitles: '.opening-job h4',
      locations: '.opening-job .location',
      departments: '.opening-job .department'
    }
  },
  
  jobvite: {
    basePattern: /jobs\.jobvite\.com\/([^\/]+)/,
    jobUrlPattern: /jobs\.jobvite\.com\/[^\/]+\/job\/([^\/]+)/,
    searchEndpoint: (company) => `https://jobs.jobvite.com/${company}/search?c=&l=&t=&s=`,
    selectors: {
      jobLinks: '.jv-job-list-item a',
      jobTitles: '.jv-job-list-item h3',
      locations: '.jv-job-list-item .location',
      departments: '.jv-job-list-item .department'
    }
  },
  
  icims: {
    basePattern: /careers\.icims\.com\/jobs\/([^\/]+)/,
    jobUrlPattern: /careers\.icims\.com\/jobs\/\d+\/job/,
    searchEndpoint: (company) => `https://careers.icims.com/jobs/search?ss=1&searchCompany=${company}`,
    selectors: {
      jobLinks: '.iCIMS_JobsTable a',
      jobTitles: '.iCIMS_JobsTable .title',
      locations: '.iCIMS_JobsTable .location',
      departments: '.iCIMS_JobsTable .department'
    }
  },
  
  // Custom corporate career pages
  custom: {
    commonSelectors: CSS_SELECTORS,
    urlIndicators: [
      '/careers',
      '/jobs',
      '/work-with-us',
      '/join-us',
      '/employment',
      '/opportunities'
    ]
  }
};

// Common job title patterns for filtering
const JOB_TITLE_PATTERNS = {
  software: [
    'software engineer',
    'software developer',
    'full stack',
    'frontend',
    'backend',
    'web developer',
    'mobile developer',
    'devops',
    'sre'
  ],
  
  product: [
    'product manager',
    'product owner',
    'product marketing',
    'technical product',
    'senior product'
  ],
  
  data: [
    'data scientist',
    'data engineer',
    'data analyst',
    'machine learning',
    'ai engineer',
    'analytics'
  ],
  
  design: [
    'ux designer',
    'ui designer',
    'product designer',
    'graphic designer',
    'visual designer'
  ],
  
  marketing: [
    'marketing manager',
    'growth marketing',
    'digital marketing',
    'content marketing',
    'marketing specialist'
  ],
  
  sales: [
    'sales manager',
    'account executive',
    'sales development',
    'business development',
    'sales representative'
  ]
};

// Experience level indicators
const EXPERIENCE_INDICATORS = {
  entry: [
    'entry level',
    'junior',
    'associate',
    'new grad',
    'graduate',
    '0-2 years',
    'early career'
  ],
  
  mid: [
    'mid level',
    'intermediate',
    '3-5 years',
    '2-4 years',
    'experienced'
  ],
  
  senior: [
    'senior',
    'sr.',
    'lead',
    'principal',
    '5+ years',
    '7+ years',
    'expert'
  ],
  
  executive: [
    'director',
    'manager',
    'head of',
    'vp',
    'vice president',
    'chief',
    'executive'
  ]
};

/**
 * Detect career page type from URL
 * @param {string} url - Career page URL
 * @returns {Object} { type, pattern, config }
 */
exports.detectCareerPageType = (url) => {
  const lowerUrl = url.toLowerCase();
  
  // Check for known ATS patterns
  for (const [type, config] of Object.entries(URL_PATTERNS)) {
    if (type === 'custom') continue;
    
    if (config.basePattern && config.basePattern.test(url)) {
      return {
        type,
        pattern: config.basePattern,
        config,
        isKnownATS: true
      };
    }
  }
  
  // Check for custom corporate career pages
  const hasCareerIndicator = URL_PATTERNS.custom.urlIndicators.some(
    indicator => lowerUrl.includes(indicator)
  );
  
  if (hasCareerIndicator) {
    return {
      type: 'custom',
      pattern: null,
      config: URL_PATTERNS.custom,
      isKnownATS: false
    };
  }
  
  return {
    type: 'unknown',
    pattern: null,
    config: null,
    isKnownATS: false
  };
};

/**
 * Extract company identifier from URL
 * @param {string} url - Career page URL
 * @param {string} type - Career page type
 * @returns {string} Company identifier
 */
exports.extractCompanyId = (url, type) => {
  const config = URL_PATTERNS[type];
  if (!config || !config.basePattern) {
    return null;
  }
  
  const match = url.match(config.basePattern);
  return match ? match[1] : null;
};

/**
 * Get CSS selectors for a career page type
 * @param {string} type - Career page type
 * @returns {Object} CSS selectors object
 */
exports.getSelectorsForType = (type) => {
  const config = URL_PATTERNS[type];
  if (!config) {
    return CSS_SELECTORS;
  }
  
  return config.selectors || CSS_SELECTORS;
};

/**
 * Generate search endpoint URL for known ATS
 * @param {string} type - ATS type
 * @param {string} companyId - Company identifier
 * @returns {string} Search endpoint URL
 */
exports.generateSearchEndpoint = (type, companyId) => {
  const config = URL_PATTERNS[type];
  if (!config || !config.searchEndpoint) {
    return null;
  }
  
  return config.searchEndpoint(companyId);
};

/**
 * Check if job title matches career profile
 * @param {string} jobTitle - Job title to check
 * @param {Object} careerProfile - User career profile
 * @returns {Object} { isMatch, score, matchedCategory }
 */
exports.isJobTitleRelevant = (jobTitle, careerProfile) => {
  if (!jobTitle || !careerProfile) {
    return { isMatch: false, score: 0, matchedCategory: null };
  }
  
  const lowerTitle = jobTitle.toLowerCase();
  
  // Check against target job titles from career profile
  if (careerProfile.jobTitles) {
    for (const targetTitle of careerProfile.jobTitles) {
      const targetLower = targetTitle.toLowerCase();
      const titleWords = targetLower.split(' ');
      
      // Calculate word overlap
      const matchedWords = titleWords.filter(word => 
        word.length > 2 && lowerTitle.includes(word)
      );
      
      if (matchedWords.length > 0) {
        const score = Math.round((matchedWords.length / titleWords.length) * 100);
        if (score >= 50) { // At least 50% word match
          return { 
            isMatch: true, 
            score, 
            matchedCategory: 'direct_title_match',
            matchedTitle: targetTitle
          };
        }
      }
    }
  }
  
  // Check against job category patterns
  for (const [category, patterns] of Object.entries(JOB_TITLE_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerTitle.includes(pattern)) {
        // Check if this category aligns with user's experience
        if (careerProfile.industries && 
            careerProfile.industries.some(industry => 
              industry.toLowerCase().includes(category) ||
              category === 'software' && industry.toLowerCase().includes('tech')
            )) {
          return { 
            isMatch: true, 
            score: 70, 
            matchedCategory: category,
            matchedPattern: pattern
          };
        }
      }
    }
  }
  
  return { isMatch: false, score: 0, matchedCategory: null };
};

/**
 * Check if experience level matches career profile
 * @param {string} jobTitle - Job title or description
 * @param {Object} careerProfile - User career profile
 * @returns {boolean} Whether experience level is appropriate
 */
exports.isExperienceLevelAppropriate = (jobTitle, careerProfile) => {
  if (!jobTitle || !careerProfile || !careerProfile.experienceLevel) {
    return true; // Default to include if unclear
  }
  
  const lowerTitle = jobTitle.toLowerCase();
  const userLevel = careerProfile.experienceLevel.toLowerCase();
  
  // Check for experience indicators in job title
  for (const [level, indicators] of Object.entries(EXPERIENCE_INDICATORS)) {
    if (indicators.some(indicator => lowerTitle.includes(indicator))) {
      // Match experience levels appropriately
      if (userLevel === 'entry' && ['mid', 'senior', 'executive'].includes(level)) {
        return false; // Entry level shouldn't see senior roles
      }
      if (userLevel === 'mid' && level === 'executive') {
        return false; // Mid level shouldn't see executive roles
      }
      break;
    }
  }
  
  return true;
};

/**
 * Validate if URL is a direct job posting
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL points to a specific job
 */
exports.isDirectJobPostingUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const lowerUrl = url.toLowerCase();
  
  // Invalid patterns (job boards, not specific jobs)
  const invalidPatterns = [
    /\/embed\/job_board/,
    /job_board\?for=/,
    /\/careers\/?$/,
    /\/jobs\/?$/,
    /\/careers\/all/,
    /\/careers\/search/,
    /\/careers\/openings\/?$/
  ];
  
  if (invalidPatterns.some(pattern => pattern.test(url))) {
    return false;
  }
  
  // Valid job posting patterns
  const validPatterns = [
    /\/job\/\d+/,
    /\/jobs\/\d+/,
    /\/careers\/\d+/,
    /\/positions\/\d+/,
    /\/job-description\/?\?.*id=/,
    /\/careers\/job\/[^\/]+/,
    /\/jobs\/[^\/\?]+$/,
    /\/position\/[^\/\?]+$/,
    /\/openings\/[^\/\?]+$/,
    /job-id[=_-]\d+/,
    /position[_-]id[=_-]\d+/,
    /req[_-]?\d+/
  ];
  
  return validPatterns.some(pattern => pattern.test(url));
};

/**
 * Get all supported ATS types
 * @returns {Array} List of supported ATS types
 */
exports.getSupportedATS = () => {
  return Object.keys(URL_PATTERNS).filter(type => type !== 'custom');
};

/**
 * Get job category from title
 * @param {string} jobTitle - Job title
 * @returns {string} Job category
 */
exports.getJobCategory = (jobTitle) => {
  if (!jobTitle) return 'general';
  
  const lowerTitle = jobTitle.toLowerCase();
  
  for (const [category, patterns] of Object.entries(JOB_TITLE_PATTERNS)) {
    if (patterns.some(pattern => lowerTitle.includes(pattern))) {
      return category;
    }
  }
  
  return 'general';
};

/**
 * Extract job metadata from HTML content
 * @param {Object} $ - Cheerio instance
 * @param {Object} selectors - CSS selectors to use
 * @returns {Array} Array of job metadata objects
 */
exports.extractJobMetadata = ($, selectors) => {
  const jobs = [];
  
  try {
    // Find all job links
    const jobElements = $(selectors.jobLinks.join(', '));
    
    jobElements.each((index, element) => {
      const $job = $(element);
      
      // Extract basic information
      const title = extractText($job, selectors.jobTitles, $);
      const location = extractText($job, selectors.locations, $);
      const department = extractText($job, selectors.departments, $);
      const url = $job.attr('href');
      
      if (title && url) {
        jobs.push({
          title: title.trim(),
          location: location ? location.trim() : 'Not specified',
          department: department ? department.trim() : null,
          url: url.startsWith('http') ? url : null,
          relativeUrl: url.startsWith('/') ? url : null,
          extractedAt: new Date()
        });
      }
    });
    
    console.log(`📊 Extracted ${jobs.length} job metadata entries`);
    return jobs;
    
  } catch (error) {
    console.error('Error extracting job metadata:', error);
    return [];
  }
};

/**
 * Helper function to extract text using multiple selectors
 * @param {Object} $element - Cheerio element
 * @param {Array} selectors - Array of CSS selectors to try
 * @param {Object} $ - Cheerio instance
 * @returns {string} Extracted text
 */
function extractText($element, selectors, $) {
  // First try within the element itself
  for (const selector of selectors) {
    const text = $element.find(selector).first().text();
    if (text && text.trim()) {
      return text.trim();
    }
  }
  
  // Then try the element's own text if it matches patterns
  const elementText = $element.text();
  if (elementText && elementText.trim()) {
    return elementText.trim();
  }
  
  // Finally try parent elements
  const $parent = $element.parent();
  for (const selector of selectors) {
    const text = $parent.find(selector).first().text();
    if (text && text.trim()) {
      return text.trim();
    }
  }
  
  return null;
}

/**
 * Build absolute URLs from relative URLs
 * @param {string} baseUrl - Base URL of the career page
 * @param {Array} jobs - Array of job objects with relative URLs
 * @returns {Array} Jobs with absolute URLs
 */
exports.buildAbsoluteUrls = (baseUrl, jobs) => {
  const base = new URL(baseUrl);
  
  return jobs.map(job => {
    if (job.url) {
      // Already absolute URL
      return job;
    }
    
    if (job.relativeUrl) {
      try {
        const absoluteUrl = new URL(job.relativeUrl, base).href;
        return {
          ...job,
          url: absoluteUrl,
          directJobUrl: absoluteUrl
        };
      } catch (error) {
        console.error(`Error building absolute URL for ${job.relativeUrl}:`, error);
        return job;
      }
    }
    
    return job;
  });
};

/**
 * Filter jobs by relevance and experience level
 * @param {Array} jobs - Array of job objects
 * @param {Object} careerProfile - User career profile
 * @returns {Array} Filtered jobs
 */
exports.filterJobsByRelevance = (jobs, careerProfile) => {
  if (!jobs || !Array.isArray(jobs)) {
    return [];
  }
  
  return jobs
    .map(job => {
      // Check title relevance
      const titleRelevance = this.isJobTitleRelevant(job.title, careerProfile);
      const experienceAppropriate = this.isExperienceLevelAppropriate(job.title, careerProfile);
      
      return {
        ...job,
        isRelevant: titleRelevance.isMatch && experienceAppropriate,
        matchScore: titleRelevance.score,
        matchReason: titleRelevance.matchedCategory,
        category: this.getJobCategory(job.title)
      };
    })
    .filter(job => job.isRelevant)
    .sort((a, b) => b.matchScore - a.matchScore) // Sort by match score
    .slice(0, 15); // Limit to top 15 matches
};

/**
 * Common patterns for job posting URLs
 */
exports.JOB_URL_PATTERNS = {
  withId: [
    /\/job\/(\d+)/,
    /\/jobs\/(\d+)/,
    /\/position\/(\d+)/,
    /\/careers\/(\d+)/,
    /job-id[=_-](\d+)/,
    /position[_-]id[=_-](\d+)/,
    /req[_-]?(\d+)/
  ],
  
  withSlug: [
    /\/job\/([^\/\?]+)/,
    /\/jobs\/([^\/\?]+)/,
    /\/position\/([^\/\?]+)/,
    /\/careers\/job\/([^\/\?]+)/,
    /\/openings\/([^\/\?]+)/
  ]
};

/**
 * Extract job ID from URL
 * @param {string} url - Job URL
 * @returns {string} Job ID or slug
 */
exports.extractJobId = (url) => {
  if (!url) return null;
  
  // Try ID patterns first
  for (const pattern of this.JOB_URL_PATTERNS.withId) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  // Try slug patterns
  for (const pattern of this.JOB_URL_PATTERNS.withSlug) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

// Export all patterns for external use
exports.CSS_SELECTORS = CSS_SELECTORS;
exports.URL_PATTERNS = URL_PATTERNS;
exports.JOB_TITLE_PATTERNS = JOB_TITLE_PATTERNS;
exports.EXPERIENCE_INDICATORS = EXPERIENCE_INDICATORS;