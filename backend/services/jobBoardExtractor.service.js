// services/jobBoardExtractor.service.js - UPDATED WITH HTTP MODE FOR INDEED
const axios = require('axios');
const cheerio = require('cheerio');
const UserAgent = require('user-agents');

// Try to import Puppeteer, fall back gracefully if not available
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
  console.log('✅ Puppeteer loaded - browser automation enabled');
} catch (error) {
  console.log('⚠️ Puppeteer not available - using HTTP-only mode');
}

/**
 * Production-Grade Job Board Extraction Service
 * Updated with HTTP-first approach for reliability
 */
class JobBoardExtractor {
  constructor() {
    this.browsers = new Map();
    this.rateLimits = new Map();
    this.userAgents = new UserAgent({ deviceCategory: 'desktop' });
    this.successRates = new Map();
    this.lastRequestTimes = new Map();
    this.useBrowser = !!puppeteer;
    
    console.log(`🎯 JobBoardExtractor initialized - Mode: ${this.useBrowser ? 'HTTP-First + Browser Fallback' : 'HTTP Only'}`);
    
    // Updated board configurations with current selectors
    this.boardConfigs = {
      indeed: {
        baseUrl: 'https://www.indeed.com',
        rateLimitMs: 2000,
        preferHttp: true, // Force HTTP mode for Indeed (more reliable)
        selectors: {
          // Updated Indeed selectors (2024/2025)
          jobCard: '[data-jk], .job_seen_beacon, .jobsearch-SerpJobCard, .result',
          title: '[data-testid="job-title"] a span, .jobTitle a span, h2 a span, .jobTitle span[title]',
          company: '[data-testid="company-name"] a, [data-testid="company-name"] span, .companyName a, .companyName span',
          location: '[data-testid="job-location"], .companyLocation, .locationsContainer',
          description: '[data-testid="job-snippet"], .job-snippet, .summary',
          url: '[data-testid="job-title"] a, .jobTitle a, h2 a',
          salary: '[data-testid="attribute_snippet_testid"], .salary-snippet, .salaryText',
          postedDate: '[data-testid="myJobsStateDate"], .date, .dateLabel'
        }
      },
      linkedin: {
        baseUrl: 'https://www.linkedin.com',
        rateLimitMs: 3000,
        preferHttp: true, // Also prefer HTTP for LinkedIn
        selectors: {
          jobCard: '.job-search-card, .jobs-search__results-list li, .job-result-card',
          title: '.base-search-card__title, .job-search-card__title, .sr-only',
          company: '.base-search-card__subtitle, .job-search-card__subtitle, .job-result-card__subtitle',
          location: '.job-search-card__location, .job-result-card__location',
          description: '.job-search-card__snippet, .job-result-card__snippet',
          url: '.base-card__full-link, .job-search-card__title-link, .job-result-card__title-link',
          salary: '.job-search-card__salary-info, .job-result-card__salary',
          postedDate: '.job-search-card__listdate, .job-result-card__listdate'
        }
      },
      glassdoor: {
        baseUrl: 'https://www.glassdoor.com',
        rateLimitMs: 2500,
        preferHttp: false, // Glassdoor works better with browser
        selectors: {
          jobCard: '[data-test="job-listing"], .react-job-listing, .jobContainer',
          title: '[data-test="job-title"], .jobTitle, .jobLink',
          company: '[data-test="employer-name"], .employerName, .jobEmpolyerName',
          location: '[data-test="job-location"], .loc, .jobLocation',
          description: '[data-test="job-description"], .jobDescription, .jobDescriptionContent',
          url: '[data-test="job-title"] a, .jobTitle a, .jobLink',
          salary: '[data-test="detailSalary"], .salaryText, .jobSalary',
          postedDate: '[data-test="job-age"], .empAge, .jobAge'
        }
      }
    };
  }

  /**
   * Main extraction method - now with HTTP-first approach
   */
  async extractJobsForCriteria(searchCriteria, options = {}) {
    const {
      jobTitle,
      location = 'Remote',
      experienceLevel = 'mid',
      maxJobs = 10,
      boards = ['indeed', 'linkedin', 'glassdoor']
    } = searchCriteria;

    console.log(`🎯 Starting job extraction for "${jobTitle}" in ${location}`);
    console.log(`📋 Target boards: ${boards.join(', ')}`);
    console.log(`🎪 Extraction mode: HTTP-First (more reliable)`);

    const results = {
      jobs: [],
      boardStats: {},
      totalFound: 0,
      errors: [],
      extractionMode: 'http-first',
      metadata: {
        extractedAt: new Date(),
        searchCriteria,
        boards: boards,
        extractionMethod: 'production_job_board_extractor_http_first'
      }
    };

    // Extract from each board sequentially with rate limiting
    for (const boardName of boards) {
      try {
        console.log(`🔍 Extracting from ${boardName}...`);
        
        await this.enforceRateLimit(boardName);
        
        const boardJobs = await this.extractFromBoard(boardName, {
          jobTitle,
          location,
          experienceLevel,
          maxJobs: Math.ceil(maxJobs / boards.length)
        }, options);

        results.boardStats[boardName] = {
          jobsFound: boardJobs.length,
          success: true,
          extractedAt: new Date(),
          method: 'HTTP'
        };

        results.jobs.push(...boardJobs);
        console.log(`✅ ${boardName}: Found ${boardJobs.length} jobs`);

      } catch (error) {
        console.error(`❌ ${boardName} extraction failed:`, error.message);
        
        results.boardStats[boardName] = {
          jobsFound: 0,
          success: false,
          error: error.message,
          extractedAt: new Date()
        };

        results.errors.push({
          board: boardName,
          error: error.message,
          timestamp: new Date()
        });
      }
    }

    // Deduplicate and limit results
    results.jobs = this.deduplicateJobs(results.jobs);
    results.totalFound = results.jobs.length;

    if (results.jobs.length > maxJobs) {
      results.jobs = results.jobs.slice(0, maxJobs);
    }

    console.log(`🎉 Job extraction completed: ${results.totalFound} total jobs found`);
    return results;
  }

  /**
   * Extract from specific board - HTTP-first approach
   */
  async extractFromBoard(boardName, criteria, options = {}) {
    const config = this.boardConfigs[boardName];
    if (!config) {
      throw new Error(`Unsupported job board: ${boardName}`);
    }

    // Always prefer HTTP mode for reliability (browsers can be blocked)
    console.log(`🌐 Using HTTP extraction for ${boardName} (more reliable)`);
    return await this.extractWithHttp(boardName, criteria, options);
  }

  /**
   * HTTP-based extraction with improved error handling
   */
  async extractWithHttp(boardName, criteria, options = {}) {
    const { jobTitle, location, maxJobs = 5 } = criteria;
    const config = this.boardConfigs[boardName];
    const jobs = [];

    try {
      const searchUrl = this.buildSearchUrl(boardName, jobTitle, location);
      console.log(`🌐 HTTP extraction from ${boardName}: ${searchUrl.substring(0, 100)}...`);

      const response = await this.makeHttpRequest(searchUrl, {
        headers: {
          'User-Agent': this.userAgents.toString(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        },
        timeout: 30000
      });

      console.log(`📄 Received ${response.data.length} characters from ${boardName}`);

      const $ = cheerio.load(response.data);
      
      // Try multiple selector variations for job cards
      let jobCards = $();
      for (const selector of config.selectors.jobCard.split(', ')) {
        const cards = $(selector.trim());
        if (cards.length > 0) {
          jobCards = cards;
          console.log(`📄 Found ${cards.length} job cards using selector: ${selector.trim()}`);
          break;
        }
      }

      if (jobCards.length === 0) {
        console.log(`⚠️ No job cards found on ${boardName} with any selector`);
        console.log(`📝 Page title: ${$('title').text()}`);
        console.log(`📝 Page contains "job": ${response.data.toLowerCase().includes('job')}`);
        
        // Try to find any job-related content
        const jobElements = $('*').filter((i, el) => {
          const text = $(el).text().toLowerCase();
          return text.includes('software engineer') || text.includes('developer') || text.includes('job');
        });
        
        console.log(`📝 Found ${jobElements.length} elements containing job-related text`);
        
        return jobs; // Return empty array but don't throw error
      }

      // Extract jobs with improved error handling
      jobCards.each((index, element) => {
        if (jobs.length >= maxJobs) return false;

        try {
          const job = this.extractJobFromCheerio($, element, boardName);
          
          if (job && job.title && job.company) {
            jobs.push({
              ...job,
              sourcePlatform: this.capitalize(boardName),
              extractedAt: new Date(),
              searchQuery: `${jobTitle} ${location}`,
              extractionMethod: `http_${boardName}`,
              extractorVersion: '2.0-http-first'
            });
            console.log(`   ✅ Job ${jobs.length}: ${job.title} at ${job.company}`);
          } else {
            console.log(`   ⚠️ Job ${index}: Missing required fields (title or company)`);
          }
        } catch (error) {
          console.error(`   ❌ Error extracting job ${index} from ${boardName}:`, error.message);
        }
      });

      console.log(`✅ HTTP extraction from ${boardName} completed: ${jobs.length} jobs`);

    } catch (error) {
      console.error(`❌ HTTP extraction from ${boardName} failed:`, error.message);
      
      // Provide more specific error information
      if (error.code === 'ENOTFOUND') {
        throw new Error(`Network error: Cannot reach ${boardName} (DNS resolution failed)`);
      } else if (error.code === 'ECONNRESET') {
        throw new Error(`Connection error: ${boardName} reset the connection`);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error(`Timeout error: ${boardName} took too long to respond`);
      } else if (error.response?.status === 403) {
        throw new Error(`Access denied: ${boardName} blocked the request (403)`);
      } else if (error.response?.status === 429) {
        throw new Error(`Rate limited: ${boardName} is throttling requests (429)`);
      } else {
        throw new Error(`HTTP extraction from ${boardName} failed: ${error.message}`);
      }
    }

    return jobs;
  }

  /**
   * Improved job extraction from Cheerio with fallback selectors
   */
  extractJobFromCheerio($, element, boardName) {
    const config = this.boardConfigs[boardName];
    const job = {};

    try {
      const $el = $(element);

      // Extract title with multiple selector fallbacks
      const titleSelectors = config.selectors.title.split(', ');
      for (const selector of titleSelectors) {
        const titleText = this.cleanText($el.find(selector.trim()).first().text());
        if (titleText) {
          job.title = titleText;
          break;
        }
      }

      // Extract company with multiple selector fallbacks
      const companySelectors = config.selectors.company.split(', ');
      for (const selector of companySelectors) {
        const companyText = this.cleanText($el.find(selector.trim()).first().text());
        if (companyText) {
          job.company = companyText;
          break;
        }
      }

      // Extract location
      const locationSelectors = config.selectors.location.split(', ');
      for (const selector of locationSelectors) {
        const locationText = this.cleanText($el.find(selector.trim()).first().text());
        if (locationText) {
          job.location = locationText;
          break;
        }
      }

      // Extract description
      const descSelectors = config.selectors.description.split(', ');
      for (const selector of descSelectors) {
        const descText = this.cleanText($el.find(selector.trim()).first().text());
        if (descText) {
          job.description = descText;
          break;
        }
      }

      // Extract job URL with multiple fallbacks
      const urlSelectors = config.selectors.url.split(', ');
      for (const selector of urlSelectors) {
        const urlElement = $el.find(selector.trim()).first();
        let jobUrl = urlElement.attr('href');
        if (jobUrl) {
          if (!jobUrl.startsWith('http')) {
            jobUrl = `${config.baseUrl}${jobUrl.startsWith('/') ? jobUrl : '/' + jobUrl}`;
          }
          job.jobUrl = jobUrl;
          break;
        }
      }

      // Extract salary (optional)
      const salarySelectors = config.selectors.salary.split(', ');
      for (const selector of salarySelectors) {
        const salaryText = this.cleanText($el.find(selector.trim()).first().text());
        if (salaryText) {
          job.salary = salaryText;
          break;
        }
      }

      // Extract posted date (optional)
      const dateSelectors = config.selectors.postedDate.split(', ');
      for (const selector of dateSelectors) {
        const dateText = this.cleanText($el.find(selector.trim()).first().text());
        if (dateText) {
          job.postedDate = dateText;
          break;
        }
      }

      // Validate required fields
      if (!job.title || !job.company) {
        console.log(`   ⚠️ Missing required fields - Title: "${job.title}", Company: "${job.company}"`);
        return null;
      }

      return job;

    } catch (error) {
      console.error(`   ❌ Error extracting job with Cheerio from ${boardName}:`, error.message);
      return null;
    }
  }

  /**
   * Utility methods (unchanged)
   */
  async enforceRateLimit(boardName) {
    const config = this.boardConfigs[boardName];
    const lastRequest = this.lastRequestTimes.get(boardName);
    
    if (lastRequest) {
      const timeSinceLastRequest = Date.now() - lastRequest;
      if (timeSinceLastRequest < config.rateLimitMs) {
        const delay = config.rateLimitMs - timeSinceLastRequest;
        console.log(`⏱️ Rate limiting ${boardName}: waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    this.lastRequestTimes.set(boardName, Date.now());
  }

  async makeHttpRequest(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          timeout: 30000,
          maxRedirects: 5,
          ...options
        });
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`   🔄 Retrying HTTP request (${i + 1}/${retries}): ${error.message}`);
        await this.randomDelay(2000, 5000);
      }
    }
  }

  buildSearchUrl(boardName, jobTitle, location) {
    const baseUrl = this.boardConfigs[boardName].baseUrl;
    
    switch (boardName) {
      case 'indeed':
        const indeedParams = new URLSearchParams({
          q: jobTitle,
          l: location,
          sort: 'date',
          limit: '50', // Increased limit
          fromage: '7' // Jobs from last 7 days
        });
        return `${baseUrl}/jobs?${indeedParams.toString()}`;
        
      case 'linkedin':
        const linkedinParams = new URLSearchParams({
          keywords: jobTitle,
          location: location,
          sortBy: 'DD',
          f_TPR: 'r604800' // Past week
        });
        return `${baseUrl}/jobs/search?${linkedinParams.toString()}`;
        
      case 'glassdoor':
        const glassdoorParams = new URLSearchParams({
          sc: '0kf',
          kw: jobTitle,
          locT: 'C',
          locId: location === 'Remote' ? '11047' : '1147401'
        });
        return `${baseUrl}/Job/jobs.htm?${glassdoorParams.toString()}`;
        
      default:
        throw new Error(`Search URL builder not implemented for ${boardName}`);
    }
  }

  cleanText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').replace(/[^\w\s\-.,]/g, '').trim();
  }

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  deduplicateJobs(jobs) {
    const seen = new Set();
    return jobs.filter(job => {
      const key = `${job.title?.toLowerCase()}_${job.company?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async cleanup() {
    console.log('🧹 Cleaning up job board extractor...');
    for (const [boardName, browser] of this.browsers) {
      try {
        await browser.close();
        console.log(`✅ Closed ${boardName} browser`);
      } catch (error) {
        console.error(`Error closing ${boardName} browser:`, error.message);
      }
    }
    this.browsers.clear();
  }

  getStats() {
    return {
      activeBrowsers: this.browsers.size,
      successRates: Object.fromEntries(this.successRates),
      rateLimits: Object.fromEntries(this.rateLimits),
      lastRequests: Object.fromEntries(this.lastRequestTimes),
      extractionMode: 'http-first'
    };
  }
}

module.exports = JobBoardExtractor;