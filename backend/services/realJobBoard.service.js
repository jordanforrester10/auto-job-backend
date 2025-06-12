// services/realJobBoard.service.js - REAL JOB BOARD INTEGRATION UTILITIES
const { anthropic } = require('../config/anthropic');

/**
 * Real Job Board Integration Service
 * Handles validation, URL extraction, and platform-specific logic
 * for Greenhouse, Lever, and Indeed integrations
 */

/**
 * Validate if a URL is from a supported real job board
 */
exports.validateJobBoardUrl = (url, expectedPlatform = null) => {
  if (!url || typeof url !== 'string') return false;
  
  const lowerUrl = url.toLowerCase();
  const validPlatforms = {
    greenhouse: [
      'greenhouse.io/jobs',
      'greenhouse.io/job',
      'boards.greenhouse.io'
    ],
    lever: [
      'jobs.lever.co',
      'lever.co/jobs'
    ],
    indeed: [
      'indeed.com/viewjob',
      'indeed.com/jobs',
      'indeed.com/job'
    ]
  };
  
  if (expectedPlatform) {
    const patterns = validPlatforms[expectedPlatform.toLowerCase()];
    return patterns ? patterns.some(pattern => lowerUrl.includes(pattern)) : false;
  }
  
  // Check all platforms
  return Object.values(validPlatforms).flat().some(pattern => lowerUrl.includes(pattern));
};

/**
 * Extract job board platform from URL
 */
exports.extractJobBoardPlatform = (url) => {
  if (!url) return null;
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('greenhouse.io')) return 'Greenhouse';
  if (lowerUrl.includes('lever.co')) return 'Lever';
  if (lowerUrl.includes('indeed.com')) return 'Indeed';
  
  return null;
};

/**
 * Extract platform-specific job identifiers
 */
exports.extractJobIdentifiers = (url, platform) => {
  if (!url || !platform) return {};
  
  const lowerUrl = url.toLowerCase();
  const identifiers = {};
  
  try {
    switch (platform.toLowerCase()) {
      case 'greenhouse':
        // Extract Greenhouse job ID
        const greenhouseMatch = url.match(/\/jobs\/(\d+)/i);
        if (greenhouseMatch) {
          identifiers.greenhouseJobId = greenhouseMatch[1];
        }
        
        // Extract office ID if present
        const officeMatch = url.match(/office_id=(\d+)/i);
        if (officeMatch) {
          identifiers.greenhouseOfficeId = officeMatch[1];
        }
        break;
        
      case 'lever':
        // Extract Lever posting ID
        const leverMatch = url.match(/jobs\.lever\.co\/([^\/]+)\/([^\/\?]+)/i);
        if (leverMatch) {
          identifiers.leverCompany = leverMatch[1];
          identifiers.leverPostingId = leverMatch[2];
        }
        break;
        
      case 'indeed':
        // Extract Indeed job key
        const indeedMatch = url.match(/jk=([^&]+)/i);
        if (indeedMatch) {
          identifiers.indeedJobKey = indeedMatch[1];
        }
        
        // Extract company ID if present
        const companyMatch = url.match(/cmp=([^&]+)/i);
        if (companyMatch) {
          identifiers.indeedCompanyId = companyMatch[1];
        }
        break;
    }
  } catch (error) {
    console.error('Error extracting job identifiers:', error);
  }
  
  return identifiers;
};

/**
 * Generate platform-specific search queries for Claude
 */
exports.generatePlatformSearchQueries = (careerProfile) => {
  const { targetJobTitles, targetKeywords, preferredLocations, experienceLevel } = careerProfile;
  
  const baseQueries = targetJobTitles.map(title => ({
    jobTitle: title,
    keywords: targetKeywords.slice(0, 5),
    locations: preferredLocations.slice(0, 3),
    experienceLevel
  }));
  
  return {
    greenhouse: baseQueries.map(query => ({
      ...query,
      platform: 'Greenhouse',
      searchContext: 'Tech startups and scale-ups with comprehensive job details',
      urlPattern: 'company.greenhouse.io/jobs',
      focusAreas: ['startups', 'tech companies', 'scale-ups', 'venture-backed companies']
    })),
    
    lever: baseQueries.map(query => ({
      ...query,
      platform: 'Lever',
      searchContext: 'Growth-stage companies with detailed role information',
      urlPattern: 'jobs.lever.co/company',
      focusAreas: ['growth companies', 'series A-C companies', 'expanding teams']
    })),
    
    indeed: baseQueries.map(query => ({
      ...query,
      platform: 'Indeed',
      searchContext: 'Established companies with verified direct postings',
      urlPattern: 'indeed.com/viewjob',
      focusAreas: ['established companies', 'direct postings', 'verified employers']
    }))
  };
};

/**
 * Enhanced Claude prompt for real job board discovery
 */
exports.createRealJobBoardSearchPrompt = (careerProfile) => {
  const searchQueries = this.generatePlatformSearchQueries(careerProfile);
  
  return `You are an expert job hunter with access to web search. Find 8-12 high-quality job opportunities from REAL company job boards.

TARGET PROFILE:
- Job Titles: ${careerProfile.targetJobTitles?.join(', ')}
- Keywords: ${careerProfile.targetKeywords?.join(', ')}
- Experience Level: ${careerProfile.experienceLevel}
- Industries: ${careerProfile.industries?.join(', ')}
- Locations: ${careerProfile.preferredLocations?.join(', ')}
- Salary Range: $${careerProfile.salaryExpectation?.min || 100000}-${careerProfile.salaryExpectation?.max || 150000}

SEARCH STRATEGY - TARGET THESE SPECIFIC PLATFORMS:

🌱 **GREENHOUSE JOBS** (Priority: Tech Startups & Scale-ups)
- Search for: [company].greenhouse.io/jobs URLs
- Target: VC-backed startups, tech scale-ups, innovative companies
- Look for: Comprehensive job descriptions, team info, tech stacks
- Focus companies: Well-funded startups, Series A-C companies

⚡ **LEVER JOBS** (Priority: Growth Companies)  
- Search for: jobs.lever.co/[company] URLs
- Target: Fast-growing companies, expanding teams
- Look for: Detailed role descriptions, hiring manager info
- Focus companies: Scale-ups, growth-stage companies

🔍 **INDEED** (Priority: Direct Company Postings ONLY)
- Search for: indeed.com/viewjob URLs from direct company postings
- Target: Established companies posting directly (NOT recruiters)
- Avoid: Staffing agencies, third-party recruiters
- Focus: Verified company accounts, direct employer postings

SEARCH PROCESS:
1. **Search each platform systematically** for the target job titles
2. **Verify URL authenticity** - ensure URLs match the expected patterns
3. **Extract comprehensive job content** from actual job posting pages
4. **Prioritize quality over quantity** - focus on complete, detailed postings
5. **Validate company legitimacy** - check for real companies with good reputations

CONTENT REQUIREMENTS:
- Each job MUST have substantial content (minimum 400 words)
- Include tech stack, team information when available
- Extract salary information if posted
- Capture application deadlines and hiring manager details
- Verify the job posting is recent (within 30 days)

Return JSON array with 8-12 verified jobs:
[
  {
    "title": "Senior Software Engineer",
    "company": "TechStartup Inc",
    "location": "San Francisco, CA (Remote OK)",
    "salary": {
      "min": 140000,
      "max": 190000,
      "currency": "USD"
    },
    "jobUrl": "https://techstartup.greenhouse.io/jobs/4567890",
    "sourcePlatform": "Greenhouse",
    "fullContent": "Complete job description extracted from the actual Greenhouse posting page...",
    "postedDate": "2024-01-15",
    "workArrangement": "hybrid",
    "experienceLevel": "Senior",
    "department": "Engineering",
    "techStack": ["Python", "React", "PostgreSQL", "AWS", "Docker"],
    "hiringManager": "Jane Smith, Engineering Manager",
    "teamSize": "12-person engineering team",
    "benefits": ["Equity", "Health insurance", "Unlimited PTO"],
    "applicationDeadline": "2024-02-15",
    "companySize": "Series B (50-100 employees)",
    "industry": "SaaS",
    "matchReason": "Perfect match for Python/React experience and senior level"
  }
]

CRITICAL VALIDATION:
- ✅ URL must match platform patterns exactly
- ✅ Content must be from actual job posting page
- ✅ Company must be legitimate (verify with web search if needed)
- ✅ Job must be recent and active
- ✅ Extract comprehensive details including tech stack
- ✅ Prioritize direct company postings over recruiter posts

PLATFORM-SPECIFIC NOTES:
- **Greenhouse**: Look for detailed engineering roles with team/culture info
- **Lever**: Focus on growth companies with clear role progression
- **Indeed**: ONLY direct company postings, avoid staffing agencies

Quality over quantity - return fewer jobs if needed to ensure all are high-quality, verified company postings.`;
};

/**
 * Assess job content quality from real job boards
 */
exports.assessRealJobBoardContentQuality = (jobData) => {
  if (!jobData || !jobData.fullContent) return { quality: 'low', score: 0, issues: ['No content'] };
  
  const content = jobData.fullContent;
  const issues = [];
  let score = 0;
  
  // Length assessment
  if (content.length < 200) {
    issues.push('Content too short');
  } else if (content.length >= 400) {
    score += 25;
  } else if (content.length >= 200) {
    score += 15;
  }
  
  // Section completeness
  const hasRequirements = /requirements?|qualifications?|must have/i.test(content);
  const hasResponsibilities = /responsibilit|duties|role|what you.ll do/i.test(content);
  const hasBenefits = /benefits?|perks|compensation|offer/i.test(content);
  const hasTechStack = /technologies?|tools|stack|languages?|frameworks?/i.test(content);
  const hasTeamInfo = /team|manager|reports|colleagues|hiring manager/i.test(content);
  const hasCompanyInfo = /company|about us|our mission|culture/i.test(content);
  
  if (hasRequirements) score += 15;
  else issues.push('Missing requirements section');
  
  if (hasResponsibilities) score += 15;
  else issues.push('Missing responsibilities section');
  
  if (hasBenefits) score += 10;
  if (hasTechStack) score += 15;
  if (hasTeamInfo) score += 10;
  if (hasCompanyInfo) score += 10;
  
  // Platform-specific bonuses
  if (jobData.sourcePlatform === 'Greenhouse' && (hasTechStack && hasTeamInfo)) {
    score += 5; // Greenhouse typically has good tech details
  }
  
  if (jobData.sourcePlatform === 'Lever' && hasTeamInfo) {
    score += 5; // Lever often includes good team context
  }
  
  // URL validation bonus
  if (this.validateJobBoardUrl(jobData.jobUrl, jobData.sourcePlatform)) {
    score += 5;
  } else {
    issues.push('Invalid URL for platform');
  }
  
  // Recent posting bonus
  if (jobData.postedDate) {
    const postDate = new Date(jobData.postedDate);
    const now = new Date();
    const daysDiff = (now - postDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 7) score += 10;
    else if (daysDiff <= 30) score += 5;
    else issues.push('Job posting is old');
  }
  
  // Determine quality level
  let quality = 'low';
  if (score >= 85) quality = 'high';
  else if (score >= 60) quality = 'medium';
  
  return {
    quality,
    score: Math.min(score, 100),
    issues,
    strengths: [
      hasRequirements && 'Clear requirements',
      hasResponsibilities && 'Detailed responsibilities', 
      hasTechStack && 'Tech stack included',
      hasTeamInfo && 'Team information',
      hasBenefits && 'Benefits listed',
      hasCompanyInfo && 'Company details'
    ].filter(Boolean)
  };
};

/**
 * Extract enhanced metadata from real job board postings
 */
exports.extractJobBoardMetadata = (jobData) => {
  const metadata = {
    platform: jobData.sourcePlatform,
    urlValidated: this.validateJobBoardUrl(jobData.jobUrl, jobData.sourcePlatform),
    contentLength: jobData.fullContent?.length || 0,
    hasComprehensiveDetails: false,
    hasTechStack: false,
    hasTeamInfo: false,
    hasApplicationDeadline: !!jobData.applicationDeadline,
    verifiedCompanyPosting: true, // Assume verified if from target platforms
    extractedAt: new Date()
  };
  
  if (jobData.fullContent) {
    const content = jobData.fullContent.toLowerCase();
    
    // Check for comprehensive details
    const hasMultipleSections = [
      /requirements?|qualifications?/,
      /responsibilit|duties/,
      /benefits?|perks/,
      /about|company|culture/
    ].filter(regex => regex.test(content)).length >= 3;
    
    metadata.hasComprehensiveDetails = hasMultipleSections;
    metadata.hasTechStack = /tech|stack|languages?|frameworks?|tools/i.test(content);
    metadata.hasTeamInfo = /team|manager|reports|colleagues/i.test(content);
  }
  
  // Platform-specific metadata
  const platformIdentifiers = this.extractJobIdentifiers(jobData.jobUrl, jobData.sourcePlatform);
  
  return {
    ...metadata,
    platformIdentifiers,
    qualityAssessment: this.assessRealJobBoardContentQuality(jobData)
  };
};

/**
 * Generate job board specific search parameters
 */
exports.generateJobBoardSearchParams = (careerProfile, platform) => {
  const baseParams = {
    jobTitles: careerProfile.targetJobTitles?.slice(0, 3) || [],
    keywords: careerProfile.targetKeywords?.slice(0, 5) || [],
    locations: careerProfile.preferredLocations?.slice(0, 2) || ['Remote'],
    experienceLevel: careerProfile.experienceLevel || 'Mid'
  };
  
  switch (platform.toLowerCase()) {
    case 'greenhouse':
      return {
        ...baseParams,
        platformFocus: 'tech startups and scale-ups',
        companyTypes: ['startup', 'scale-up', 'venture-backed'],
        searchModifiers: ['site:greenhouse.io', 'inurl:jobs'],
        expectedFeatures: ['comprehensive job descriptions', 'team culture info', 'tech stack details']
      };
      
    case 'lever':
      return {
        ...baseParams,
        platformFocus: 'growth-stage companies',
        companyTypes: ['growth-stage', 'expanding teams', 'series A-C'],
        searchModifiers: ['site:lever.co', 'inurl:jobs'],
        expectedFeatures: ['detailed role descriptions', 'career progression', 'team structure']
      };
      
    case 'indeed':
      return {
        ...baseParams,
        platformFocus: 'established companies with direct postings',
        companyTypes: ['established', 'direct employer', 'verified company'],
        searchModifiers: ['site:indeed.com', 'inurl:viewjob', '-recruiter', '-staffing'],
        expectedFeatures: ['direct company posting', 'verified employer', 'complete job details']
      };
      
    default:
      return baseParams;
  }
};

/**
 * Validate job posting freshness
 */
exports.validateJobFreshness = (postedDate, maxDaysOld = 30) => {
  if (!postedDate) return { isValid: false, reason: 'No posted date' };
  
  const postDate = new Date(postedDate);
  const now = new Date();
  const daysDiff = (now - postDate) / (1000 * 60 * 60 * 24);
  
  if (isNaN(daysDiff)) {
    return { isValid: false, reason: 'Invalid date format' };
  }
  
  if (daysDiff > maxDaysOld) {
    return { 
      isValid: false, 
      reason: `Job is ${Math.round(daysDiff)} days old (max: ${maxDaysOld})` 
    };
  }
  
  return {
    isValid: true,
    daysOld: Math.round(daysDiff),
    freshness: daysDiff <= 7 ? 'very fresh' : 
               daysDiff <= 14 ? 'fresh' : 
               daysDiff <= 30 ? 'recent' : 'old'
  };
};

/**
 * Enhanced job matching score calculation for real job board postings
 */
exports.calculateRealJobBoardMatchScore = (jobData, careerProfile) => {
  let score = 60; // Higher base score for real job board postings
  
  // Title matching (25 points)
  const jobTitle = (jobData.title || '').toLowerCase();
  const titleMatches = careerProfile.targetJobTitles?.some(target => 
    jobTitle.includes(target.toLowerCase()) || target.toLowerCase().includes(jobTitle)
  );
  if (titleMatches) score += 25;
  
  // Content quality bonus for real job boards (10 points)
  const contentQuality = this.assessRealJobBoardContentQuality(jobData);
  if (contentQuality.quality === 'high') score += 10;
  else if (contentQuality.quality === 'medium') score += 5;
  
  // Keyword matching (20 points max)
  const content = (jobData.fullContent || '').toLowerCase();
  const keywordMatches = careerProfile.targetKeywords?.filter(keyword => 
    content.includes(keyword.toLowerCase())
  ).length || 0;
  score += Math.min(keywordMatches * 4, 20);
  
  // Experience level matching (15 points)
  if (jobData.experienceLevel && 
      jobData.experienceLevel.toLowerCase() === careerProfile.experienceLevel?.toLowerCase()) {
    score += 15;
  }
  
  // Salary matching (10 points)
  if (jobData.salary?.min && careerProfile.salaryExpectation?.min) {
    if (jobData.salary.min >= careerProfile.salaryExpectation.min * 0.8) {
      score += 10;
    }
  }
  
  // Real job board platform bonus (5 points)
  if (['Greenhouse', 'Lever'].includes(jobData.sourcePlatform)) {
    score += 5; // These typically have higher quality postings
  }
  
  // Tech stack matching bonus (15 points max)
  if (jobData.techStack && Array.isArray(jobData.techStack)) {
    const techMatches = jobData.techStack.filter(tech => 
      careerProfile.mustHaveSkills?.some(skill => 
        skill.toLowerCase().includes(tech.toLowerCase()) || 
        tech.toLowerCase().includes(skill.toLowerCase())
      )
    ).length;
    score += Math.min(techMatches * 5, 15);
  }
  
  // Comprehensive details bonus (5 points)
  if (contentQuality.strengths?.length >= 4) {
    score += 5;
  }
  
  // Recent posting bonus (5 points)
  const freshnessCheck = this.validateJobFreshness(jobData.postedDate);
  if (freshnessCheck.isValid && freshnessCheck.daysOld <= 7) {
    score += 5;
  }
  
  return Math.min(Math.max(score, 0), 100);
};

/**
 * Generate job board discovery statistics
 */
exports.generateJobBoardStats = (discoveredJobs) => {
  const stats = {
    total: discoveredJobs.length,
    byPlatform: {
      greenhouse: 0,
      lever: 0,
      indeed: 0
    },
    qualityDistribution: {
      high: 0,
      medium: 0,
      low: 0
    },
    averageMatchScore: 0,
    averageContentLength: 0,
    featuresFound: {
      techStack: 0,
      teamInfo: 0,
      salary: 0,
      benefits: 0,
      applicationDeadline: 0
    }
  };
  
  if (discoveredJobs.length === 0) return stats;
  
  let totalMatchScore = 0;
  let totalContentLength = 0;
  
  discoveredJobs.forEach(job => {
    // Platform distribution
    const platform = job.sourcePlatform?.toLowerCase();
    if (stats.byPlatform.hasOwnProperty(platform)) {
      stats.byPlatform[platform]++;
    }
    
    // Quality assessment
    const quality = this.assessRealJobBoardContentQuality(job);
    stats.qualityDistribution[quality.quality]++;
    
    // Match scores
    totalMatchScore += job.matchScore || 0;
    
    // Content length
    totalContentLength += job.fullContent?.length || 0;
    
    // Features tracking
    if (job.techStack?.length > 0) stats.featuresFound.techStack++;
    if (job.hiringManager) stats.featuresFound.teamInfo++;
    if (job.salary?.min || job.salary?.max) stats.featuresFound.salary++;
    if (job.benefits?.length > 0) stats.featuresFound.benefits++;
    if (job.applicationDeadline) stats.featuresFound.applicationDeadline++;
  });
  
  stats.averageMatchScore = Math.round(totalMatchScore / discoveredJobs.length);
  stats.averageContentLength = Math.round(totalContentLength / discoveredJobs.length);
  
  return stats;
};

/**
 * Create job board specific error messages
 */
exports.createJobBoardErrorMessage = (platform, error) => {
  const platformMessages = {
    greenhouse: 'Failed to search Greenhouse job boards. This may be due to rate limiting or access restrictions.',
    lever: 'Failed to search Lever job boards. The platform may be temporarily unavailable.',
    indeed: 'Failed to search Indeed for direct company postings. Try again later.',
    general: 'Failed to search real job boards. This may be a temporary issue.'
  };
  
  const baseMessage = platformMessages[platform?.toLowerCase()] || platformMessages.general;
  
  return {
    message: baseMessage,
    suggestion: 'The search will retry automatically. You can also try running a new search.',
    platform: platform,
    timestamp: new Date(),
    errorDetails: error.message
  };
};

/**
 * Validate complete job board discovery result
 */
exports.validateJobBoardDiscoveryResult = (discoveredJobs) => {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: this.generateJobBoardStats(discoveredJobs),
    recommendations: []
  };
  
  if (discoveredJobs.length === 0) {
    validation.isValid = false;
    validation.errors.push('No jobs discovered from any job board');
    validation.recommendations.push('Try broadening search criteria or running search at different time');
  }
  
  // Check for platform diversity
  const platformCount = Object.values(validation.stats.byPlatform).filter(count => count > 0).length;
  if (platformCount < 2) {
    validation.warnings.push('Jobs found from only one platform - may indicate limited search scope');
    validation.recommendations.push('Ensure all target job boards (Greenhouse, Lever, Indeed) are accessible');
  }
  
  // Check quality distribution
  const highQualityPercentage = (validation.stats.qualityDistribution.high / discoveredJobs.length) * 100;
  if (highQualityPercentage < 50) {
    validation.warnings.push('Less than 50% of jobs are high quality');
    validation.recommendations.push('Consider adjusting search criteria to target higher quality postings');
  }
  
  // Check for comprehensive job details
  const withTechStack = validation.stats.featuresFound.techStack;
  if (withTechStack < discoveredJobs.length * 0.3) {
    validation.warnings.push('Few jobs include tech stack information');
  }
  
  return validation;
};

module.exports = exports;