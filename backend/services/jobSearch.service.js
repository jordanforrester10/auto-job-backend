// services/jobSearch.service.js - ENHANCED WITH CLAUDE WEB SEARCH LIKE GENERAL CHAT
const Job = require('../models/mongodb/job.model');
const Resume = require('../models/mongodb/resume.model');
const AiJobSearch = require('../models/mongodb/aiJobSearch.model');
const { anthropic } = require('../config/anthropic');
const { openai } = require('../config/openai');
const jobAnalysisService = require('./jobAnalysis.service');

/**
 * ENHANCED 3-Phase AI Job Search - Now with Claude Web Search like General Chat
 * Phase 1: Career Analysis ($0.05) - GPT-4 Turbo
 * Phase 2: ENHANCED Job Discovery & Extraction ($0.30-0.50) - Claude 3.5 Sonnet with web search API
 * Phase 3: Premium Job Analysis ($0.01-0.02) - GPT-4o batch processing
 * 
 * Uses Claude's web search API exactly like the general chat example
 * Total Cost: $0.36-0.57 per search
 */
exports.findJobsWithAi = async (userId, resumeId) => {
  try {
    console.log(`🚀 Starting ENHANCED 3-Phase AI job search with Claude web search API for user ${userId}`);
    
    const resume = await Resume.findById(resumeId);
    if (!resume || !resume.parsedData) {
      throw new Error('Resume not found or not parsed');
    }
    
    // Create search record with CORRECT enum values
    const aiJobSearch = new AiJobSearch({
      userId,
      resumeId,
      resumeName: resume.name,
      searchCriteria: extractSearchCriteria(resume.parsedData),
      status: 'running',
      dailyLimit: 10,
      jobsFoundToday: 0,
      totalJobsFound: 0,
      searchApproach: '3-phase-intelligent-claude-web-search',  // FIXED: Use correct enum value
      approachVersion: '3.2-claude-web-search-api',
      qualityLevel: 'claude-web-search'  // FIXED: Use correct enum value
    });
    
    await aiJobSearch.save();
    
    // Add initialization reasoning log
    await aiJobSearch.addReasoningLog(
      'initialization',
      `ENHANCED 3-Phase AI job search with Claude web search API initialized for resume "${resume.name}"`,
      {
        searchCriteria: aiJobSearch.searchCriteria,
        dailyLimit: aiJobSearch.dailyLimit,
        enhancedApproach: '3-Phase: Career Analysis → Claude Web Search Discovery → Premium Analysis',
        webSearchMethod: 'Claude web search API (same as general chat)',
        qualityImprovement: 'Real job URLs found and content extracted like general chat',
        costEstimate: '$0.36-0.57 per search',
        phases: [
          'Phase 1: Career Analysis (GPT-4 Turbo)',
          'Phase 2: ENHANCED Job Discovery (Claude Web Search API)',
          'Phase 3: Premium Job Analysis (GPT-4o batch)'
        ]
      }
    );
    
    // Start background search
    performEnhancedJobSearch(aiJobSearch._id, userId, resume).catch(error => {
      console.error('Enhanced job search error:', error);
      updateSearchStatus(aiJobSearch._id, 'failed', error.message);
    });
    
    return {
      success: true,
      message: 'ENHANCED AI job search with Claude web search API started successfully',
      searchId: aiJobSearch._id,
      searchMethod: 'Claude web search API (same as general chat)'
    };
    
  } catch (error) {
    console.error('Error initiating enhanced job search:', error);
    throw error;
  }
};

async function addSearchError(search, errorType, message, phase = 'general', context = '') {
  // Map old error types to new enum values if needed
  const errorTypeMapping = {
    'intelligent_discovery_failed': 'web_search_failed',
    'job_search_failed': 'job_discovery_failed',
    'content_extraction_failed': 'content_extraction_failed'
  };
  
  const mappedErrorType = errorTypeMapping[errorType] || errorType;
  
  await search.addError(mappedErrorType, message, phase, context);
}

/**
 * ENHANCED 3-Phase Job Search with Claude Web Search API
 */
async function performEnhancedJobSearch(searchId, userId, resume) {
  const searchStartTime = Date.now();
  let search;
  
  try {
    search = await AiJobSearch.findById(searchId);
    if (!search || search.status !== 'running') return;
    
    // Check daily limits
    if (await isDailyLimitReached(search)) {
      await search.addReasoningLog(
        'completion',
        `Daily limit of ${search.dailyLimit} jobs reached. Search paused until tomorrow.`,
        { 
          dailyLimit: search.dailyLimit, 
          jobsFoundToday: search.jobsFoundToday,
          reason: 'daily_limit_reached'
        }
      );
      await updateSearchStatus(searchId, 'paused', 'Daily limit reached');
      return;
    }
    
    // PHASE 1: Career Analysis (Unchanged - GPT-4 Turbo)
    console.log(`📊 Phase 1: Career Analysis...`);
    const phase1Start = Date.now();
    
    await search.addReasoningLog(
      'career_analysis',
      'Starting enhanced career trajectory analysis using GPT-4 Turbo for optimal job targeting',
      { 
        phase: 'career_analysis_start',
        model: 'gpt-4-turbo',
        costEstimate: '$0.05'
      }
    );
    
    const careerProfile = await analyzeCareerTrajectoryEnhanced(resume.parsedData);
    const phase1Duration = Date.now() - phase1Start;
    
    await search.addReasoningLog(
      'career_analysis',
      `Career analysis completed. Generated ${careerProfile.targetJobTitles?.length || 0} target job titles and ${careerProfile.targetKeywords?.length || 0} search keywords.`,
      {
        phase: 'career_analysis_complete',
        targetJobTitles: careerProfile.targetJobTitles || [],
        targetKeywords: careerProfile.targetKeywords || [],
        experienceLevel: careerProfile.experienceLevel,
        preferredLocations: careerProfile.preferredLocations || [],
        model: 'gpt-4-turbo',
        duration: phase1Duration
      },
      true,
      phase1Duration
    );
    
    if (!careerProfile.targetJobTitles || careerProfile.targetJobTitles.length === 0) {
      await search.addReasoningLog(
        'error',
        'Career analysis failed to identify target job titles. Cannot proceed with job search.',
        { 
          phase: 'career_analysis_failed',
          suggestion: 'Resume may need more detailed experience information'
        },
        false,
        phase1Duration
      );
      await updateSearchStatus(searchId, 'completed', 'Career analysis insufficient');
      return;
    }
    
    // PHASE 2: ENHANCED Job Discovery & Extraction (CLAUDE WEB SEARCH API)
    console.log(`🎯 Phase 2: ENHANCED Job Discovery with Claude Web Search API...`);
    const phase2Start = Date.now();
    
    await search.addReasoningLog(
      'intelligent_discovery',
      'Starting ENHANCED job discovery using Claude web search API (same method as general chat)',
      { 
        phase: 'enhanced_job_discovery_start',
        model: 'claude-3.5-sonnet',
        approach: 'Step 1: Find job URLs with web search → Step 2: Extract content from URLs',
        webSearchMethod: 'Claude web search API (same as general chat)',
        costEstimate: '$0.30-0.50'
      }
    );
    
    const discoveredJobs = await performRealJobBoardDiscovery(careerProfile, search);
    const phase2Duration = Date.now() - phase2Start;
    
    if (discoveredJobs.length === 0) {
      await search.addReasoningLog(
        'completion',
        'Enhanced job discovery found no matching opportunities using Claude web search API. Search criteria may need adjustment.',
        { 
          phase: 'enhanced_discovery_no_results',
          searchMethod: 'Claude web search API',
          searchedTitles: careerProfile.targetJobTitles,
          suggestion: 'Try again tomorrow or broaden search criteria'
        },
        false,
        phase2Duration
      );
      await updateSearchStatus(searchId, 'completed', 'No job opportunities found with Claude web search');
      return;
    }
    
    await search.addReasoningLog(
      'intelligent_discovery',
      `Enhanced job discovery completed successfully. Found ${discoveredJobs.length} high-quality job opportunities using Claude web search API.`,
      {
        phase: 'enhanced_job_discovery_complete',
        totalJobsFound: discoveredJobs.length,
        searchMethod: 'Claude web search API',
        platformsFound: [...new Set(discoveredJobs.map(job => job.sourcePlatform))],
        averageContentLength: discoveredJobs.length > 0 ? 
          Math.round(discoveredJobs.reduce((sum, job) => sum + (job.fullContent?.length || 0), 0) / discoveredJobs.length) : 0,
        qualityJobs: discoveredJobs.filter(job => job.contentQuality === 'high').length,
        companiesFound: [...new Set(discoveredJobs.map(job => job.company))].length,
        model: 'claude-3.5-sonnet',
        duration: phase2Duration
      },
      true,
      phase2Duration
    );
    
// PHASE 3: Premium Job Analysis (Unchanged - GPT-4o Quality)
    console.log(`🔬 Phase 3: Premium Job Analysis...`);
    const phase3Start = Date.now();
    
    await search.addReasoningLog(
      'premium_analysis',
      'Starting premium job analysis using GPT-4o for same quality as manual job uploads',
      { 
        phase: 'premium_analysis_start',
        jobsToAnalyze: discoveredJobs.length,
        model: 'gpt-4o',
        quality: 'Same as manual job uploads',
        costEstimate: '$0.01-0.02'
      }
    );
    
    const analyzedJobs = await performPremiumJobAnalysis(discoveredJobs, search);
    const phase3Duration = Date.now() - phase3Start;
    
    const successfulAnalyses = analyzedJobs.filter(job => job.analysis && !job.analysisError).length;
    
    await search.addReasoningLog(
      'premium_analysis',
      `Premium job analysis completed. Successfully analyzed ${successfulAnalyses}/${analyzedJobs.length} jobs with GPT-4o quality.`,
      {
        phase: 'premium_analysis_complete',
        totalJobs: analyzedJobs.length,
        successfulAnalyses: successfulAnalyses,
        averageSkillsFound: successfulAnalyses > 0 ? 
          Math.round(analyzedJobs
            .filter(job => job.analysis?.keySkills)
            .reduce((sum, job) => sum + (job.analysis.keySkills.length || 0), 0) / successfulAnalyses) : 0,
        model: 'gpt-4o',
        quality: 'Premium analysis (same as manual)',
        duration: phase3Duration
      },
      successfulAnalyses > 0,
      phase3Duration
    );

    function getPhaseForLogging(originalPhase) {
  const phaseMapping = {
    'intelligent_discovery': 'web_search_discovery',
    'content_extraction': 'content_extraction',
    'job_search': 'web_search_discovery'
  };
  
  return phaseMapping[originalPhase] || originalPhase;
}

    
    // Save Jobs with Enhanced Metadata
    console.log(`💾 Saving ${analyzedJobs.length} analyzed jobs from Claude web search...`);
    const saveStart = Date.now();
    
    await search.addReasoningLog(
      'job_saving',
      `Saving ${analyzedJobs.length} premium-analyzed jobs from Claude web search with enhanced metadata and deduplication`,
      { 
        phase: 'job_saving_start',
        jobsToSave: analyzedJobs.length,
        discoveryMethod: 'Claude web search API'
      }
    );
    
    const savedCount = await saveJobsWithEnhancedMetadata(analyzedJobs, userId, searchId, search);
    const saveDuration = Date.now() - saveStart;
    
    await search.addReasoningLog(
      'job_saving',
      `Job saving completed. Saved ${savedCount} new premium jobs from Claude web search, skipped ${analyzedJobs.length - savedCount} duplicates.`,
      {
        phase: 'job_saving_complete',
        savedJobs: savedCount,
        duplicatesSkipped: analyzedJobs.length - savedCount,
        discoveryMethod: 'Claude web search API',
        duration: saveDuration
      },
      savedCount > 0,
      saveDuration
    );
    
    // Final completion with Claude web search summary
    const totalDuration = Date.now() - searchStartTime;
    const searchSummary = {
      phase1: 'GPT-4 Turbo - $0.05',
      phase2: 'Claude 3.5 Sonnet + Web Search API - $0.30-0.50', 
      phase3: 'GPT-4o Premium Analysis - $0.01-0.02',
      totalCost: '$0.36-0.57',
      qualityLevel: 'Real job postings found via Claude web search API',
      searchMethod: 'Same as Claude general chat',
      enhancement: 'Claude web search API + Premium analysis'
    };
    
    await search.addReasoningLog(
      'completion',
      `ENHANCED 3-Phase AI job search with Claude web search API completed in ${Math.round(totalDuration / 1000)}s. Found ${savedCount} premium jobs using the same method as general chat.`,
      {
        phase: 'search_complete',
        totalDuration: totalDuration,
        jobsSaved: savedCount,
        searchSummary: searchSummary,
        webSearchMethod: 'Claude web search API (same as general chat)',
        intelligence: 'Claude for job discovery + GPT-4o for analysis',
        nextRun: 'Will continue tomorrow with fresh opportunities via Claude web search'
      }
    );
    
    await updateSearchStatus(searchId, savedCount > 0 ? 'running' : 'completed', 
      `Found ${savedCount} premium jobs via Claude web search API`);
    console.log(`✅ ENHANCED 3-Phase AI job search complete: ${savedCount} jobs saved via Claude web search, cost: $0.36-0.57`);
    
  } catch (error) {
    console.error('Error in enhanced Claude web search:', error);
    
    if (search) {
      await search.addReasoningLog(
        'error',
        `Enhanced job search failed: ${error.message}`,
        { 
          phase: 'search_error',
          errorType: error.name,
          errorMessage: error.message,
          searchMethod: 'Claude web search API',
          suggestion: 'Try running the search again'
        },
        false
      );
    }
    
    await updateSearchStatus(searchId, 'failed', error.message);
  }
}

async function updateAiUsageForPhase(search, phase, type, tokens = 0, cost = 0) {
  // Map phases to match new enum values
  const phaseMapping = {
    'intelligent_discovery': 'web_search_discovery',
    'job_search': 'web_search_discovery',
    'content_extraction': 'web_search_discovery'
  };
  
  const mappedPhase = phaseMapping[phase] || phase;
  await search.updateAiUsage(mappedPhase, type, tokens, cost);
}

/**
 * ENHANCED PHASE 2: Real Job Board Discovery & Extraction
 * Uses Claude's web search API exactly like the general chat example
 */
async function performRealJobBoardDiscovery(careerProfile, search) {
  try {
    console.log(`🎯 Starting ENHANCED job discovery using Claude web search for ${careerProfile.targetJobTitles?.length || 0} target roles...`);
    
    // Step 1: Find job URLs using web search (like your general chat example)
    const jobUrls = await findJobUrlsWithWebSearch(careerProfile, search);
    
    if (jobUrls.length === 0) {
      await search.addReasoningLog(
        'web_search_discovery',
        'No job URLs found with Claude web search. May need to adjust search criteria.',
        { 
          searchTargets: careerProfile.targetJobTitles,
          searchKeywords: careerProfile.targetKeywords,
          searchMethod: 'Claude web search API'
        },
        false
      );
      return [];
    }
    
    // Step 2: Extract content from each job URL (like your URL extraction example)
const discoveredJobs = await extractJobContentFromUrls(jobUrls, search, careerProfile);
    
    await search.addReasoningLog(
      'web_search_discovery',
      `Enhanced job discovery completed. Found ${discoveredJobs.length} high-quality jobs using Claude web search API.`,
      {
        jobUrlsFound: jobUrls.length,
        successfulExtractions: discoveredJobs.length,
        jobBoards: [...new Set(discoveredJobs.map(job => job.sourcePlatform))],
        averageContentLength: discoveredJobs.length > 0 ? 
          Math.round(discoveredJobs.reduce((sum, job) => sum + (job.fullContent?.length || 0), 0) / discoveredJobs.length) : 0,
        searchMethod: 'Claude web search API (same as general chat)'
      }
    );
    
    return discoveredJobs;
    
  } catch (error) {
    console.error('Error in enhanced job discovery:', error);
    await search.addReasoningLog(
      'web_search_discovery',
      `Enhanced job discovery failed: ${error.message}`,
      { error: error.message, searchMethod: 'Claude web search API' },
      false
    );
    return [];
  }
}


/**
 * Step 1: Find Job URLs using Claude Web Search
 * Mimics the approach from your general chat example
 */
async function findJobUrlsWithWebSearch(careerProfile, search) {
  try {
    await search.addReasoningLog(
      'web_search_discovery',
      'Starting job URL discovery using Claude web search API',
      { 
        targetTitles: careerProfile.targetJobTitles,
        searchApproach: 'Claude web search like general chat',
        webSearchMethod: 'claude_web_search_api'
      }
    );
    
    console.log('🎯 DETAILED DEBUG: Starting Claude web search with profile:', {
      targetJobTitles: careerProfile.targetJobTitles,
      experienceLevel: careerProfile.experienceLevel,
      targetKeywords: careerProfile.targetKeywords,
      environment: process.env.NODE_ENV
    });
    
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: `I am looking for ${careerProfile.experienceLevel || 'mid-level'} ${careerProfile.targetJobTitles?.[0] || 'Software Engineer'} jobs at companies that are hiring. 

TARGET PROFILE:
- Job Titles: ${careerProfile.targetJobTitles?.join(', ')}
- Experience Level: ${careerProfile.experienceLevel}
- Preferred Skills: ${careerProfile.targetKeywords?.join(', ')}
- Work Arrangement: ${careerProfile.workArrangement || 'remote/hybrid'}
- Salary Range: $${careerProfile.salaryExpectation?.min || 100000}-${careerProfile.salaryExpectation?.max || 150000}

Please find 8-12 current job openings that match this profile. For each job, I need:
1. The company name and job title
2. The direct job application URL (especially from Greenhouse, Lever, Indeed, or company career pages)
3. Brief description of why it's a good match

Focus on:
- Direct company postings (not recruiters)
- Jobs posted in the last 30 days
- Companies with good reputations
- Remote/hybrid opportunities when possible
- Jobs from well-known ATS systems (Greenhouse, Lever, etc.)

Return the results in this format:
JOB 1: [Job Title] at [Company Name]
URL: [Direct job application URL]
Match Reason: [Why this is a good fit]

JOB 2: [Job Title] at [Company Name]  
URL: [Direct job application URL]
Match Reason: [Why this is a good fit]

etc.`
        }
      ],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search"
        }
      ],
      tool_choice: { type: "any" }
    });

    console.log('🎯 DETAILED DEBUG: Claude API Response received');
    console.log('🎯 Response content array length:', response.content?.length || 0);
    console.log('🎯 Response ID:', response.id);
    console.log('🎯 Response model:', response.model);
    console.log('🎯 Response usage:', JSON.stringify(response.usage, null, 2));

    const jobUrls = [];
    
    // ENHANCED: More detailed response processing with debugging
    for (let i = 0; i < response.content.length; i++) {
      const content = response.content[i];
      console.log(`🎯 DETAILED DEBUG: Content[${i}] type: ${content.type}`);
      
      if (content.type === 'text') {
        const text = content.text;
        console.log(`🎯 DETAILED DEBUG: Text content length: ${text.length}`);
        console.log(`🎯 DETAILED DEBUG: Text preview (first 500 chars): "${text.substring(0, 500)}"`);
        
        // ENHANCED: Multiple URL extraction patterns
        const urlPatterns = [
          /URL:\s*(https?:\/\/[^\s\n]+)/gi,
          /url:\s*(https?:\/\/[^\s\n]+)/gi,
          /(https?:\/\/[^\s\n]+\.(?:com|org|net|io|co|ai)[^\s\n]*)/gi,
          /\[Direct job application URL\]:\s*(https?:\/\/[^\s\n]+)/gi,
          /Application link:\s*(https?:\/\/[^\s\n]+)/gi
        ];
        
        let foundUrls = [];
        
        urlPatterns.forEach((pattern, patternIndex) => {
          const matches = text.match(pattern);
          if (matches) {
            console.log(`🎯 DETAILED DEBUG: Pattern ${patternIndex} found ${matches.length} matches`);
            foundUrls = foundUrls.concat(matches);
          }
        });
        
        console.log(`🎯 DETAILED DEBUG: Total URLs found with all patterns: ${foundUrls.length}`);
        console.log(`🎯 DETAILED DEBUG: Found URLs:`, foundUrls);
        
        // Process found URLs
        foundUrls.forEach((match, matchIndex) => {
          let url = match;
          
          // Clean up URL extraction
          url = url.replace(/^URL:\s*/i, '').trim();
          url = url.replace(/^url:\s*/i, '').trim();
          url = url.replace(/^\[Direct job application URL\]:\s*/i, '').trim();
          url = url.replace(/^Application link:\s*/i, '').trim();
          
          console.log(`🎯 DETAILED DEBUG: Processing URL ${matchIndex}: ${url}`);
          
          if (isValidJobUrl(url)) {
            // Extract job info from the surrounding text
            const lines = text.split('\n');
            const urlLineIndex = lines.findIndex(line => line.includes(url));
            
            let title = 'Unknown Title';
            let company = 'Unknown Company';
            let matchReason = 'Found via Claude web search';
            
            if (urlLineIndex > 0) {
              const jobLine = lines[urlLineIndex - 1] || '';
              const matchReasonLine = lines[urlLineIndex + 1] || '';
              
              // Enhanced job title and company extraction
              const jobPatterns = [
                /JOB\s+\d+:\s*(.+?)\s+at\s+(.+?)$/i,
                /(\w+.*?)\s+at\s+(.+?)$/i,
                /(.+?)\s+-\s+(.+?)$/i
              ];
              
              for (const pattern of jobPatterns) {
                const jobMatch = jobLine.match(pattern);
                if (jobMatch) {
                  title = jobMatch[1].trim();
                  company = jobMatch[2].trim();
                  break;
                }
              }
              
              // Extract match reason
              if (matchReasonLine.includes('Match Reason:')) {
                matchReason = matchReasonLine.replace(/^Match Reason:\s*/i, '').trim();
              }
            }
            
            // Determine source platform from URL
            const sourcePlatform = determineSourcePlatform(url);
            
            const jobUrlObj = {
              url: url,
              title: title,
              company: company,
              matchReason: matchReason,
              sourcePlatform: sourcePlatform,
              foundAt: new Date(),
              extractionMethod: 'enhanced_debugging'
            };
            
            jobUrls.push(jobUrlObj);
            console.log(`🎯 DETAILED DEBUG: Added job URL:`, jobUrlObj);
          } else {
            console.log(`🎯 DETAILED DEBUG: Invalid job URL rejected: ${url}`);
          }
        });
      } else if (content.type === 'tool_use') {
        console.log(`🎯 DETAILED DEBUG: Tool use detected:`, content.name);
      } else if (content.type === 'tool_result') {
        console.log(`🎯 DETAILED DEBUG: Tool result detected`);
      } else {
        console.log(`🎯 DETAILED DEBUG: Other content type: ${content.type}`);
      }
    }
    
    console.log(`🎯 FINAL DEBUG SUMMARY:`);
    console.log(`🎯 Total content blocks processed: ${response.content.length}`);
    console.log(`🎯 Total job URLs extracted: ${jobUrls.length}`);
    console.log(`🎯 Environment: ${process.env.NODE_ENV}`);
    console.log(`🎯 Claude API Key prefix: ${process.env.ANTHROPIC_API_KEY?.substring(0, 10)}...`);
    
    await search.addReasoningLog(
      'web_search_discovery',
      `Found ${jobUrls.length} job URLs using Claude web search API`,
      {
        totalUrls: jobUrls.length,
        platforms: [...new Set(jobUrls.map(job => job.sourcePlatform))],
        companies: [...new Set(jobUrls.map(job => job.company))],
        searchMethod: 'claude_web_search_api',
        webSearchMethod: 'claude_web_search_api',
        debugInfo: {
          contentBlocks: response.content.length,
          hasTextContent: response.content.some(c => c.type === 'text'),
          hasToolResults: response.content.some(c => c.type === 'tool_use' || c.type === 'tool_result'),
          environment: process.env.NODE_ENV
        }
      }
    );
    
    console.log(`✅ Found ${jobUrls.length} job URLs using Claude web search API`);
    return jobUrls;
    
  } catch (error) {
    console.error('🎯 DETAILED DEBUG: Error finding job URLs with web search:', error);
    console.error('🎯 Error name:', error.name);
    console.error('🎯 Error message:', error.message);
    console.error('🎯 Error stack:', error.stack);
    
    // Add error with correct enum
    await search.addError('web_search_failed', error.message, 'web_search_discovery', 'URL discovery failed');
    throw error;
  }
}


/**
 * Step 2: Extract Job Content from URLs
 * Mimics the URL content extraction from your example
 */
async function extractJobContentFromUrls(jobUrls, search, careerProfile) {
  const discoveredJobs = [];
  
  console.log(`📄 Extracting content from ${jobUrls.length} job URLs with detailed debugging...`);
  
  for (const jobUrl of jobUrls) {
    try {
      console.log(`\n🔍 === EXTRACTION DEBUG FOR: ${jobUrl.title} at ${jobUrl.company} ===`);
      console.log(`🔗 URL: ${jobUrl.url}`);
      console.log(`🏢 Platform: ${jobUrl.sourcePlatform}`);
      console.log(`💡 Match Reason: ${jobUrl.matchReason}`);
      
      await search.addReasoningLog(
        'content_extraction',
        `Starting content extraction from ${jobUrl.title} at ${jobUrl.company}`,
        {
          url: jobUrl.url,
          platform: jobUrl.sourcePlatform,
          extractionMethod: 'claude_web_fetch_debug'
        }
      );
      
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: `Please visit this job posting URL and extract the complete content: ${jobUrl.url}

Extract all job details including:
- Complete job description and overview
- Key responsibilities and duties  
- Required qualifications and skills
- Preferred qualifications
- Salary/compensation information
- Benefits and perks
- Work location and arrangement (remote/hybrid/onsite)
- Company information and culture
- Application process

Provide the comprehensive job posting content exactly as it appears on the page.`
          }
        ],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search"
          }
        ],
        tool_choice: { type: "any" }
      });

      console.log(`📡 Claude API Response Structure:`);
      console.log(`- Response content array length: ${response.content?.length || 0}`);
      
      let fullContent = '';
      let hasTextContent = false;
      let hasToolResults = false;
      let allTextFragments = []; // NEW: Collect all text fragments
      
      // FIXED: Examine the full response structure and collect ALL text content
      for (let i = 0; i < response.content.length; i++) {
        const content = response.content[i];
        console.log(`- Content[${i}] type: ${content.type}`);
        
        if (content.type === 'text') {
          hasTextContent = true;
          allTextFragments.push(content.text); // COLLECT each text fragment
          console.log(`- Text content length: ${content.text.length} characters`);
          console.log(`- Text preview: "${content.text.substring(0, 100)}..."`);
        } else if (content.type === 'tool_use') {
          hasToolResults = true;
          console.log(`- Tool use detected: ${content.name}`);
        } else if (content.type === 'tool_result') {
          console.log(`- Tool result detected`);
        }
      }
      
      // FIXED: Concatenate ALL text fragments into one complete content
      fullContent = allTextFragments.join('').trim();
      
      console.log(`📊 Content Analysis:`);
      console.log(`- Has text content: ${hasTextContent}`);
      console.log(`- Has tool results: ${hasToolResults}`);
      console.log(`- Number of text fragments: ${allTextFragments.length}`);
      console.log(`- Total concatenated content length: ${fullContent.length}`);
      console.log(`- Full content preview: "${fullContent.substring(0, 300)}..."`);
      
      // More detailed content analysis
      if (fullContent.length > 0) {
        const lowerContent = fullContent.toLowerCase();
        const hasJobKeywords = /job|position|role|career|responsibilities|qualifications|requirements/i.test(fullContent);
        const hasCompanyInfo = /company|organization|team|culture/i.test(fullContent);
        const hasSalaryInfo = /salary|compensation|\$|pay|benefits/i.test(fullContent);
        
        console.log(`📋 Content Quality Check:`);
        console.log(`- Has job keywords: ${hasJobKeywords}`);
        console.log(`- Has company info: ${hasCompanyInfo}`);
        console.log(`- Has salary info: ${hasSalaryInfo}`);
        
        // Check if content looks like an error message
        const isErrorContent = /error|not found|404|access denied|blocked|unavailable/i.test(fullContent);
        console.log(`- Is error content: ${isErrorContent}`);
        
        if (isErrorContent) {
          console.log(`❌ ERROR: Content appears to be an error message`);
          console.log(`Error content preview: "${fullContent.substring(0, 300)}"`);
        }
      }
      
      // Only proceed if we have substantial, valid content
      if (fullContent && fullContent.length > 300 && !/error|not found|404|access denied/i.test(fullContent)) {
        console.log(`✅ EXTRACTION SUCCESSFUL - Processing content...`);
        
        // Extract structured data from the content
        const extractedData = parseJobContent(fullContent, jobUrl, careerProfile);
        
        const job = {
          title: extractedData.title || jobUrl.title,
          company: extractedData.company || jobUrl.company,
          location: extractedData.location || 'Not specified',
          salary: extractedData.salary || {},
          jobUrl: jobUrl.url,
          sourcePlatform: jobUrl.sourcePlatform,
          fullContent: fullContent,
          postedDate: extractedData.postedDate || new Date().toISOString().split('T')[0],
          workArrangement: extractedData.workArrangement || 'unknown',
          matchReason: jobUrl.matchReason,
          experienceLevel: extractedData.experienceLevel || careerProfile.experienceLevel,
          keyRequirements: extractedData.keyRequirements || [],
          department: extractedData.department || 'Not specified',
          companySize: extractedData.companySize || 'Not specified',
          industry: extractedData.industry || 'Technology',
          benefits: extractedData.benefits || [],
          techStack: extractedData.techStack || [],
          extractionMethod: 'claude_web_content_extraction',
          extractedAt: new Date(),
          matchScore: calculateEnhancedMatchScore(extractedData, careerProfile),
          contentQuality: assessContentQuality(fullContent),
          metadata: {
            discoveryMethod: 'claude_web_search_and_extract',
            platform: jobUrl.sourcePlatform,
            extractedAt: new Date(),
            contentLength: fullContent.length,
            urlValidated: true,
            directCompanyPosting: true
          }
        };
        
        discoveredJobs.push(job);
        
        await search.addReasoningLog(
          'content_extraction',
          `Successfully extracted ${fullContent.length} characters from ${job.title} at ${job.company}`,
          {
            contentLength: fullContent.length,
            qualityScore: job.contentQuality,
            matchScore: job.matchScore,
            extractionSuccess: true
          },
          true
        );
        
        console.log(`✅ JOB CREATED: ${job.title} at ${job.company} (${fullContent.length} chars)`);
        
      } else {
        console.log(`❌ EXTRACTION FAILED: Insufficient or invalid content`);
        console.log(`- Content length: ${fullContent.length}`);
        console.log(`- Content preview: "${fullContent.substring(0, 200)}"`);
        
        await search.addReasoningLog(
          'content_extraction',
          `Failed to extract sufficient content from ${jobUrl.title} at ${jobUrl.company}`,
          {
            url: jobUrl.url,
            contentLength: fullContent.length,
            extractionSuccess: false,
            failureReason: fullContent.length === 0 ? 'No content returned' : 'Content too short or invalid'
          },
          false
        );
      }
      
      console.log(`=== END EXTRACTION DEBUG ===\n`);
      
      // Delay between extractions
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`❌ EXTRACTION ERROR for ${jobUrl.url}:`, error);
      console.error(`Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n')[0]
      });
      
      await search.addReasoningLog(
        'content_extraction',
        `Error extracting content from ${jobUrl.title}: ${error.message}`,
        {
          url: jobUrl.url,
          error: error.message,
          extractionSuccess: false
        },
        false
      );
    }
  }
  
  console.log(`\n📊 FINAL EXTRACTION RESULTS:`);
  console.log(`- URLs processed: ${jobUrls.length}`);
  console.log(`- Jobs successfully created: ${discoveredJobs.length}`);
  console.log(`- Success rate: ${Math.round((discoveredJobs.length / jobUrls.length) * 100)}%`);
  
  return discoveredJobs;
}

/**
 * Helper Functions
 */

function determineSourcePlatform(url) {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('greenhouse.io')) return 'Greenhouse';
  if (lowerUrl.includes('lever.co')) return 'Lever';
  if (lowerUrl.includes('indeed.com')) return 'Indeed';
  if (lowerUrl.includes('linkedin.com')) return 'LinkedIn';
  if (lowerUrl.includes('workday.com')) return 'Workday';
  if (lowerUrl.includes('careers.') || lowerUrl.includes('/careers/')) return 'Company Career Page';
  if (lowerUrl.includes('bamboohr.com')) return 'BambooHR';
  if (lowerUrl.includes('smartrecruiters.com')) return 'SmartRecruiters';
  if (lowerUrl.includes('jobvite.com')) return 'Jobvite';
  
  return 'Other';
}

function isValidJobUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  const lowerUrl = url.toLowerCase();
  
  // Check if it's a valid HTTP/HTTPS URL
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) return false;
  
  // Check if it contains job-related keywords
  const jobKeywords = [
    'job', 'jobs', 'career', 'careers', 'apply', 'position', 'opening',
    'greenhouse.io', 'lever.co', 'indeed.com', 'linkedin.com/jobs'
  ];
  
  return jobKeywords.some(keyword => lowerUrl.includes(keyword));
}

function parseJobContent(content, jobUrl, careerProfile) {
  console.log(`🔧 Parsing job content for: ${jobUrl.title}`);
  
  const data = {
    title: jobUrl.title,
    company: jobUrl.company
  };
  
  try {
    const lowerContent = content.toLowerCase();
    
    // Extract salary with better patterns
    const salaryPatterns = [
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-?\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)?/g,
      /(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)\s*(?:per year|annually|\/year)/gi,
      /salary.*?(\d{1,3}(?:,\d{3})*)/gi
    ];
    
    for (const pattern of salaryPatterns) {
      const salaryMatches = content.match(pattern);
      if (salaryMatches && salaryMatches.length > 0) {
        const salaryMatch = salaryMatches[0].match(/(\d{1,3}(?:,\d{3})*)/g);
        if (salaryMatch) {
          data.salary = {
            min: parseInt(salaryMatch[0].replace(/,/g, '')),
            max: salaryMatch[1] ? parseInt(salaryMatch[1].replace(/,/g, '')) : undefined,
            currency: 'USD'
          };
          console.log(`💰 Found salary: $${data.salary.min}${data.salary.max ? `-$${data.salary.max}` : ''}`);
          break;
        }
      }
    }
    
    // FIXED: Extract work arrangement with proper enum values
    const workPatterns = [
      { pattern: /remote.*?first|fully remote|100%\s*remote|work from home|wfh/i, arrangement: 'remote' },
      { pattern: /hybrid|flexible|mix of remote|part remote|some remote/i, arrangement: 'hybrid' },
      { pattern: /on-?site|in-?office|office-?based|on-premise/i, arrangement: 'onsite' }
    ];
    
    // Default to remote if no pattern found
    data.workArrangement = 'remote';
    
    for (const wp of workPatterns) {
      if (wp.pattern.test(content)) {
        data.workArrangement = wp.arrangement;
        console.log(`🏠 Found work arrangement: ${data.workArrangement}`);
        break;
      }
    }
    
    // Extract experience level with proper enum values
    const expPatterns = [
      { pattern: /senior|sr\.|lead/i, level: 'senior' },
      { pattern: /principal|staff|architect/i, level: 'lead' },
      { pattern: /junior|jr\.|entry|associate/i, level: 'junior' },
      { pattern: /director|vp|head of/i, level: 'executive' }
    ];
    
    // Default to mid if no pattern found
    data.experienceLevel = 'mid';
    
    for (const ep of expPatterns) {
      if (ep.pattern.test(content)) {
        data.experienceLevel = ep.level;
        console.log(`📈 Found experience level: ${data.experienceLevel}`);
        break;
      }
    }
    
    // Extract requirements with better keyword matching
    const skillKeywords = [
      'product management', 'product strategy', 'roadmap', 'analytics', 'data analysis',
      'ai', 'machine learning', 'artificial intelligence', 'python', 'sql', 'tableau',
      'javascript', 'react', 'node.js', 'aws', 'typescript', 'java', 'kubernetes',
      'agile', 'scrum', 'jira', 'figma', 'sketch', 'user research', 'a/b testing'
    ];
    
    data.keyRequirements = skillKeywords.filter(skill => 
      lowerContent.includes(skill.toLowerCase())
    );
    console.log(`🎯 Found ${data.keyRequirements.length} skill requirements`);
    
    // Extract benefits
    const benefitKeywords = [
      'health insurance', 'dental', 'vision', '401k', 'pto', 'vacation', 
      'equity', 'stock options', 'bonus', 'flexible hours', 'remote work'
    ];
    
    data.benefits = benefitKeywords.filter(benefit => 
      lowerContent.includes(benefit.toLowerCase())
    );
    console.log(`🎁 Found ${data.benefits.length} benefits`);
    
    // FIXED: Extract location from content with better patterns and validation
    const locationPatterns = [
      /(?:location|located|based|headquarters?):\s*([A-Za-z\s,]+(?:CA|NY|TX|FL|WA|IL|MA|PA|OH|GA|NC|NJ|VA|MI|AZ|CO|TN|IN|SC|MO|MD|WI|MN|AL|UT|NV|KS|LA|AR|NE|IA|MS|OK|CT|OR|DE|NH|VT|ME|RI|MT|ND|SD|WY|AK|HI|DC))/i,
      /(?:office|headquarters|hq)(?:\s+(?:in|at|located))?\s*([A-Za-z\s,]+(?:CA|NY|TX|FL|WA|IL|MA|PA|OH|GA|NC|NJ|VA|MI|AZ|CO|TN|IN|SC|MO|MD|WI|MN|AL|UT|NV|KS|LA|AR|NE|IA|MS|OK|CT|OR|DE|NH|VT|ME|RI|MT|ND|SD|WY|AK|HI|DC))/i,
      /(?:remote|anywhere|distributed|global)/i,
      /(?:san francisco|new york|los angeles|chicago|boston|seattle|austin|denver|atlanta|miami|dallas|houston|philadelphia|washington|portland|san diego|phoenix|detroit|minneapolis|tampa|orlando|charlotte|nashville|baltimore|milwaukee|kansas city|cleveland|columbus|indianapolis|jacksonville|memphis|louisville|oklahoma city|las vegas|albuquerque|tucson|fresno|sacramento|long beach|mesa|virginia beach|colorado springs|omaha|raleigh|tulsa|wichita|arlington|bakersfield|new orleans|honolulu|anaheim|santa ana|riverside|corpus christi|lexington|stockton|henderson|saint paul|pittsburgh|cincinnati|anchorage|toledo|newark|greensboro|lincoln|buffalo|fort wayne|jersey city|chula vista|madison|norfolk|chandler|laredo|baton rouge|lubbock|scottsdale|garland|glendale|reno|hialeah|chesapeake|irving|north las vegas|fremont|gilbert|san bernardino|boise|birmingham)/i
    ];
    
    // Default location
    data.location = 'Not specified';
    
    for (const pattern of locationPatterns) {
      const locationMatch = content.match(pattern);
      if (locationMatch) {
        let location = locationMatch[1] ? locationMatch[1].trim() : locationMatch[0].trim();
        
        // Clean up location string
        location = location.replace(/[:;,\.]$/, ''); // Remove trailing punctuation
        location = location.replace(/^[\s,]+|[\s,]+$/g, ''); // Remove leading/trailing spaces and commas
        
        // Validate location - should not contain job-related terms or company names
        const invalidLocationTerms = [
          'job level', 'assessed', 'interviews', 'application', 'process', 'details',
          'arrangements', 'not available', 'posting', 'content', 'provided',
          'experience', 'requirements', 'qualifications', 'responsibilities',
          'benefits', 'salary', 'compensation', 'title', 'role', 'position',
          'thirty madison', 'temporal technologies', 'company', 'organization',
          'employer', 'team', 'startup', 'corporation', 'inc', 'llc', 'ltd'
        ];
        
        const isValidLocation = !invalidLocationTerms.some(term => 
          location.toLowerCase().includes(term.toLowerCase())
        );
        
        if (isValidLocation && location.length > 2 && location.length < 100) {
          data.location = location;
          console.log(`📍 Found valid location: ${data.location}`);
          break;
        } else {
          console.log(`📍 Rejected invalid location: ${location}`);
        }
      }
    }
    
    // If no specific location found, check for remote work indicators
    if (data.location === 'Not specified') {
      if (/remote|distributed|anywhere|work from home|wfh/i.test(content)) {
        data.location = 'Remote';
        console.log(`📍 Set location to Remote based on content`);
      }
    }
    
    console.log(`✅ Content parsing completed for: ${jobUrl.title}`);
    console.log(`🔧 Final workArrangement: ${data.workArrangement}`);
    console.log(`🔧 Final experienceLevel: ${data.experienceLevel}`);
    
  } catch (error) {
    console.error(`❌ Error parsing job content for ${jobUrl.title}:`, error);
  }
  
  return data;
}


function calculateEnhancedMatchScore(jobData, careerProfile) {
  let score = 70; // Base score for Claude-discovered jobs
  
  // Title matching
  const jobTitle = (jobData.title || '').toLowerCase();
  const titleMatches = careerProfile.targetJobTitles?.some(target => 
    jobTitle.includes(target.toLowerCase()) || target.toLowerCase().includes(jobTitle)
  );
  if (titleMatches) score += 20;
  
  // Keyword matching
  const content = (jobData.fullContent || '').toLowerCase();
  const keywordMatches = careerProfile.targetKeywords?.filter(keyword => 
    content.includes(keyword.toLowerCase())
  ).length || 0;
  score += Math.min(keywordMatches * 3, 15);
  
  // Experience level matching
  if (jobData.experienceLevel && jobData.experienceLevel.toLowerCase() === careerProfile.experienceLevel?.toLowerCase()) {
    score += 10;
  }
  
  // Salary matching
  if (jobData.salary?.min && careerProfile.salaryExpectation?.min) {
    if (jobData.salary.min >= careerProfile.salaryExpectation.min * 0.8) {
      score += 10;
    }
  }
  
  // Work arrangement preference
  if (jobData.workArrangement && careerProfile.workArrangement) {
    if (jobData.workArrangement === careerProfile.workArrangement || 
        (careerProfile.workArrangement === 'remote' && jobData.workArrangement === 'hybrid')) {
      score += 5;
    }
  }
  
  return Math.min(Math.max(score, 0), 100);
}

function assessContentQuality(content) {
  if (!content) return 'low';
  
  const length = content.length;
  const hasRequirements = /requirements?|qualifications?|skills?/i.test(content);
  const hasResponsibilities = /responsibilit|duties|role|job description/i.test(content);
  const hasBenefits = /benefits?|perks|compensation|salary/i.test(content);
  const hasCompanyInfo = /company|about us|culture|mission/i.test(content);
  const hasWorkArrangement = /remote|hybrid|onsite|office|location/i.test(content);
  const hasApplyInfo = /apply|application|submit|contact/i.test(content);
  
  let qualityScore = 0;
  
  // Length scoring
  if (length > 3000) qualityScore += 4;
  else if (length > 2000) qualityScore += 3;
  else if (length > 1000) qualityScore += 2;
  else if (length > 500) qualityScore += 1;
  
  // Content sections scoring
  if (hasRequirements) qualityScore += 2;
  if (hasResponsibilities) qualityScore += 2;
  if (hasBenefits) qualityScore += 1;
  if (hasCompanyInfo) qualityScore += 1;
  if (hasWorkArrangement) qualityScore += 1;
  if (hasApplyInfo) qualityScore += 1;
  
  console.log(`📊 Content quality score: ${qualityScore}/12`);
  
  if (qualityScore >= 8) return 'high';
  else if (qualityScore >= 5) return 'medium';
  else return 'low';
}

/**
 * Enhanced save jobs function with Claude web search metadata and technical requirements
 * (Uses your existing parseJobContent and parseLocationEnhanced functions)
 */
async function saveJobsWithEnhancedMetadata(analyzedJobs, userId, searchId, search) {
  let savedCount = 0;
  
  for (const jobData of analyzedJobs) {
    try {
      // Enhanced duplicate checking
      const existing = await Job.findOne({
        userId,
        $or: [
          { sourceUrl: jobData.jobUrl },
          { 
            title: jobData.title, 
            company: jobData.company,
            sourcePlatform: { $regex: jobData.sourcePlatform, $options: 'i' }
          }
        ]
      });
      
      if (existing) {
        await search.addReasoningLog(
          'job_saving',
          `Skipped duplicate: "${jobData.title}" at ${jobData.company} (${jobData.sourcePlatform})`,
          { 
            reason: 'duplicate_prevention',
            originalPlatform: jobData.sourcePlatform 
          }
        );
        continue;
      }
      
      // Fix the sourcePlatform enum issue
      let sourcePlatform = `AI_FOUND_INTELLIGENT`;
      if (jobData.sourcePlatform && jobData.sourcePlatform.toLowerCase().includes('greenhouse')) {
        sourcePlatform = 'AI_FOUND_INTELLIGENT';
      } else if (jobData.sourcePlatform && jobData.sourcePlatform.toLowerCase().includes('lever')) {
        sourcePlatform = 'AI_FOUND_INTELLIGENT';
      } else if (jobData.sourcePlatform && jobData.sourcePlatform.toLowerCase().includes('indeed')) {
        sourcePlatform = 'AI_FOUND_INTELLIGENT';
      } else {
        sourcePlatform = 'AI_FOUND_INTELLIGENT';
      }
      
      // Use your existing parseLocationEnhanced function
      const enhancedLocation = parseLocationEnhanced(jobData.location);
      
      // ENHANCED: Extract technical requirements for AI jobs to match manual job quality
      const technicalRequirements = extractTechnicalRequirements(jobData);
      
      // Create enhanced job record with Claude web search data
      const job = new Job({
        userId,
        title: jobData.title,
        company: jobData.company,
        location: enhancedLocation, // Using your enhanced location parsing
        description: jobData.fullContent,
        sourceUrl: jobData.jobUrl,
        sourcePlatform: sourcePlatform,
        isAiGenerated: true,
        applicationStatus: 'NOT_APPLIED',
        aiSearchId: searchId,
        salary: jobData.salary || {},
        jobType: jobData.jobType || 'FULL_TIME',
        
        // FIXED: Add proper analysis status to prevent infinite analysis loop
        analysisStatus: {
          status: 'completed',
          progress: 100,
          message: `Premium analysis complete! Found ${jobData.analysis?.keySkills?.length || 0} key skills via Claude web search.`,
          updatedAt: new Date(),
          completedAt: new Date(),
          canViewJob: true,
          skillsFound: jobData.analysis?.keySkills?.length || 0,
          experienceLevel: jobData.analysis?.experienceLevel,
          modelUsed: 'gpt-4o',
          analysisType: 'claude_web_search_discovery_premium',
          searchApproach: '3-phase-intelligent-claude-web-search',
          qualityLevel: 'premium'
        },
        
        // Enhanced parsed data (premium quality) - FIXED to match manual job analysis
        parsedData: {
          requirements: jobData.analysis?.requirements || [],
          responsibilities: jobData.analysis?.responsibilities || [],
          qualifications: jobData.analysis?.qualifications || { required: [], preferred: [] },
          benefits: jobData.analysis?.benefits || jobData.benefits || [],
          keySkills: jobData.analysis?.keySkills || [],
          experienceLevel: jobData.analysis?.experienceLevel || jobData.experienceLevel || 'Mid',
          yearsOfExperience: jobData.analysis?.yearsOfExperience || { minimum: 3, preferred: 5 },
          educationRequirements: jobData.analysis?.educationRequirements || [],
          workArrangement: jobData.analysis?.workArrangement || jobData.workArrangement || 'remote',
          industryContext: jobData.analysis?.industryContext || jobData.industry || 'technology',
          roleCategory: jobData.analysis?.roleCategory || 'general',
          technicalComplexity: jobData.analysis?.technicalComplexity || 'medium',
          leadershipRequired: jobData.analysis?.leadershipRequired || false,
          companyStage: jobData.analysis?.companyStage || jobData.companySize || 'unknown',
          extractedAt: new Date(),
          extractionMethod: 'claude_web_search_premium',
          
          // FIXED: Add the technical requirements that were missing
          technicalRequirements: jobData.analysis?.technicalRequirements || technicalRequirements,
          
          // Enhanced Claude web search specific data
          claudeWebSearchData: {
            platform: jobData.sourcePlatform,
            originalUrl: jobData.jobUrl,
            postedDate: jobData.postedDate,
            matchReason: jobData.matchReason,
            techStack: jobData.techStack || [],
            department: jobData.department,
            directCompanyPosting: true,
            discoveryMethod: 'claude_web_search_api'
          },
          analysisMetadata: jobData.analysis?.analysisMetadata || {
            analyzedAt: new Date(),
            algorithmVersion: '3.2-claude-web-search-premium',
            model: 'gpt-4o',
            analysisType: 'claude_web_search_discovery_premium',
            qualityLevel: 'same_as_manual',
            discoveryPlatform: jobData.sourcePlatform,
            hasFullTechnicalAnalysis: true
          }
        },
        
        // Enhanced AI search metadata for Claude web search
        aiSearchMetadata: {
          searchScore: jobData.matchScore || 85,
          discoveryMethod: 'claude_web_search_discovery',
          extractionSuccess: !jobData.analysisError,
          contentQuality: jobData.contentQuality || 'high',
          premiumAnalysis: jobData.premiumAnalysis || true,
          intelligentDiscovery: true,
          claudeWebSearchDiscovery: true,
          phase: '3-phase-intelligent-claude-web-search',
          originalPlatform: jobData.sourcePlatform,
          postedDate: jobData.postedDate,
          workArrangement: jobData.workArrangement,
          experienceLevel: jobData.experienceLevel,
          department: jobData.department,
          companySize: jobData.companySize,
          industry: jobData.industry,
          keyRequirements: jobData.keyRequirements || [],
          matchReason: jobData.matchReason,
          benefits: jobData.benefits || [],
          techStack: jobData.techStack || [],
          claudeWebSearchMetadata: {
            discoveryMethod: 'claude_web_search_api',
            extractionMethod: 'claude_web_content_extraction',
            searchQuery: jobData.searchQuery,
            foundAt: jobData.foundAt
          }
        }
      });
      
      await job.save();
      savedCount++;
      
      // Update search progress with Claude web search info
      await AiJobSearch.findByIdAndUpdate(searchId, {
        $inc: { jobsFoundToday: 1, totalJobsFound: 1 },
        $push: {
          jobsFound: {
            jobId: job._id,
            title: job.title,
            company: job.company,
            foundAt: new Date(),
            extractionMethod: 'claude_web_search_discovery',
            contentQuality: jobData.contentQuality,
            matchScore: jobData.matchScore,
            premiumAnalysis: true,
            sourcePlatform: jobData.sourcePlatform,
            directCompanyPosting: true
          }
        }
      });
      
      console.log(`✅ Saved: ${job.title} at ${job.company} (${jobData.sourcePlatform} - Claude web search discovery)`);
      console.log(`📍 Location: ${enhancedLocation.city || enhancedLocation.remote ? 'Remote' : 'Not specified'}`);
      console.log(`🔧 Technical Requirements: ${technicalRequirements.length} extracted`);
      
    } catch (error) {
      console.error(`Error saving job ${jobData.title}:`, error);
    }
  }
  
  return savedCount;
}

/**
 * ENHANCED: Extract technical requirements from AI jobs to match manual job analysis quality
 */
function extractTechnicalRequirements(jobData) {
  const content = jobData.fullContent || '';
  const technicalRequirements = [];
  
  try {
    // Extract programming languages
    const languages = [
      'JavaScript', 'Python', 'Java', 'TypeScript', 'Go', 'Rust', 'C++', 'C#', 'PHP', 
      'Ruby', 'Swift', 'Kotlin', 'Scala', 'R', 'Dart', 'Elixir', 'Clojure', 'Haskell'
    ];
    languages.forEach(lang => {
      if (new RegExp(`\\b${lang}\\b`, 'i').test(content)) {
        technicalRequirements.push({
          category: 'Programming Languages',
          requirement: lang,
          importance: 'high'
        });
      }
    });
    
    // Extract frameworks and technologies
    const frameworks = [
      'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 
      'Rails', 'Laravel', 'Next.js', 'Nuxt.js', 'Svelte', 'Ember.js', 'Backbone.js',
      'jQuery', 'Bootstrap', 'Tailwind', 'Material-UI', 'Ant Design'
    ];
    frameworks.forEach(framework => {
      if (new RegExp(`\\b${framework}\\b`, 'i').test(content)) {
        technicalRequirements.push({
          category: 'Frameworks & Technologies',
          requirement: framework,
          importance: 'medium'
        });
      }
    });
    
    // Extract cloud platforms and infrastructure
    const cloudPlatforms = [
      'AWS', 'Amazon Web Services', 'Azure', 'Google Cloud', 'GCP', 'Kubernetes', 'Docker',
      'Terraform', 'Ansible', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI',
      'Heroku', 'Vercel', 'Netlify', 'DigitalOcean', 'Linode'
    ];
    cloudPlatforms.forEach(platform => {
      if (new RegExp(`\\b${platform}\\b`, 'i').test(content)) {
        technicalRequirements.push({
          category: 'Cloud & Infrastructure',
          requirement: platform,
          importance: 'medium'
        });
      }
    });
    
    // Extract databases
    const databases = [
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra',
      'Oracle', 'SQL Server', 'SQLite', 'MariaDB', 'CouchDB', 'Neo4j', 'InfluxDB'
    ];
    databases.forEach(db => {
      if (new RegExp(`\\b${db}\\b`, 'i').test(content)) {
        technicalRequirements.push({
          category: 'Databases',
          requirement: db,
          importance: 'medium'
        });
      }
    });
    
    // Extract AI/ML technologies
    const aiMlTech = [
      'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'Jupyter', 'MLflow', 
      'Airflow', 'Keras', 'OpenCV', 'NLTK', 'spaCy', 'Hugging Face', 'Transformers',
      'LangChain', 'OpenAI', 'Anthropic', 'Claude', 'GPT', 'BERT', 'ResNet'
    ];
    aiMlTech.forEach(tech => {
      if (new RegExp(`\\b${tech}\\b`, 'i').test(content)) {
        technicalRequirements.push({
          category: 'AI/ML Technologies',
          requirement: tech,
          importance: 'high'
        });
      }
    });
    
    // Extract development tools
    const devTools = [
      'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Slack', 'Teams',
      'VS Code', 'IntelliJ', 'Eclipse', 'Vim', 'Emacs', 'Postman', 'Insomnia',
      'Figma', 'Sketch', 'Adobe Creative Suite', 'Photoshop', 'Illustrator'
    ];
    devTools.forEach(tool => {
      if (new RegExp(`\\b${tool}\\b`, 'i').test(content)) {
        technicalRequirements.push({
          category: 'Development Tools',
          requirement: tool,
          importance: 'low'
        });
      }
    });
    
    // Extract testing frameworks
    const testingFrameworks = [
      'Jest', 'Mocha', 'Jasmine', 'Cypress', 'Selenium', 'TestNG', 'JUnit', 'PyTest',
      'RSpec', 'Cucumber', 'Playwright', 'Puppeteer'
    ];
    testingFrameworks.forEach(framework => {
      if (new RegExp(`\\b${framework}\\b`, 'i').test(content)) {
        technicalRequirements.push({
          category: 'Testing Frameworks',
          requirement: framework,
          importance: 'medium'
        });
      }
    });
    
    // Remove duplicates based on requirement name
    const uniqueRequirements = technicalRequirements.filter((req, index, self) =>
      index === self.findIndex(r => r.requirement === req.requirement)
    );
    
    console.log(`🔧 Extracted ${uniqueRequirements.length} technical requirements for ${jobData.title}`);
    return uniqueRequirements;
    
  } catch (error) {
    console.error(`❌ Error extracting technical requirements for ${jobData.title}:`, error);
    return [];
  }
}
/**
 * Enhanced Phase 3: Premium Job Analysis (unchanged but with Claude web search context)
 */
async function performPremiumJobAnalysis(discoveredJobs, search) {
  const analyzedJobs = [];
  
  console.log(`🔬 Starting premium analysis of ${discoveredJobs.length} jobs from Claude web search with GPT-4o...`);
  
  // Process jobs in batches of 3 for efficiency
  const batchSize = 3;
  for (let i = 0; i < discoveredJobs.length; i += batchSize) {
    const batch = discoveredJobs.slice(i, i + batchSize);
    
    try {
      console.log(`  📊 Analyzing Claude web search batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(discoveredJobs.length/batchSize)}...`);
      
      await search.addReasoningLog(
        'premium_analysis',
        `Analyzing Claude web search batch ${Math.floor(i/batchSize) + 1}: ${batch.map(job => `"${job.title}" at ${job.company} (${job.sourcePlatform})`).join(', ')}`,
        {
          batchNumber: Math.floor(i/batchSize) + 1,
          jobsInBatch: batch.length,
          model: 'gpt-4o',
          discoveryMethod: 'Claude web search API',
          sourcePlatforms: [...new Set(batch.map(job => job.sourcePlatform))]
        }
      );
      
      const batchResults = await analyzeBatchWithGPT4o(batch);
      
      // Process batch results
      for (let j = 0; j < batch.length; j++) {
        const job = batch[j];
        const analysis = batchResults[j];
        
        const hasGoodAnalysis = analysis && 
          (analysis.requirements?.length > 0 || analysis.responsibilities?.length > 0) &&
          analysis.keySkills?.length > 0;
        
        analyzedJobs.push({
          ...job,
          analysis: analysis,
          analysisError: !hasGoodAnalysis ? 'Analysis incomplete' : null,
          premiumAnalysis: true,
          analysisQuality: 'premium',
          claudeWebSearchDiscovery: true
        });
        
        await search.addReasoningLog(
          'content_extraction',
          `"${job.title}" at ${job.company} (${job.sourcePlatform}) - ${hasGoodAnalysis ? 'Premium analysis successful' : 'Analysis incomplete'}`,
          {
            jobTitle: job.title,
            companyName: job.company,
            discoveryPlatform: job.sourcePlatform,
            contentLength: job.fullContent?.length || 0,
            skillsFound: analysis?.keySkills?.length || 0,
            hasRequirements: !!(analysis?.requirements?.length > 0),
            hasResponsibilities: !!(analysis?.responsibilities?.length > 0),
            experienceLevel: analysis?.experienceLevel,
            model: 'gpt-4o',
            quality: 'premium',
            discoveryMethod: 'Claude web search'
          },
          hasGoodAnalysis
        );
      }
      
      // Small delay between batches to be respectful
      if (i + batchSize < discoveredJobs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`Error analyzing Claude web search batch ${Math.floor(i/batchSize) + 1}:`, error);
      
      // Add failed jobs with error
      batch.forEach(job => {
        analyzedJobs.push({
          ...job,
          analysis: null,
          analysisError: error.message,
          premiumAnalysis: false,
          claudeWebSearchDiscovery: true
        });
      });
    }
  }
  
  return analyzedJobs;
}

/**
 * Batch analysis with GPT-4o specifically for Claude web search content
 */
async function analyzeBatchWithGPT4o(jobBatch) {
  try {
    // Prepare batch content for analysis with Claude web search context
    const batchContent = jobBatch.map((job, index) => 
      `JOB ${index + 1} (${job.sourcePlatform}):
Title: ${job.title}
Company: ${job.company}
Source: ${job.sourcePlatform} (Found via Claude Web Search)
Location: ${job.location || 'Not specified'}
Tech Stack: ${job.techStack ? job.techStack.join(', ') : 'Not specified'}
Match Reason: ${job.matchReason || 'Not specified'}
Content: ${job.fullContent.substring(0, 2000)}...
---`
    ).join('\n\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are an expert job analyst providing premium analysis for jobs discovered via Claude's web search API. These are real job postings found through intelligent web search, similar to how jobs are found in general chat. Analyze multiple job postings and return detailed structured data for each. Focus on extracting comprehensive requirements, responsibilities, and skills with high accuracy. Return valid JSON array.`
        },
        {
          role: "user",
          content: `Analyze these ${jobBatch.length} job postings discovered via Claude web search and return detailed analysis for each:

${batchContent}

These jobs were discovered using Claude's web search API (same method as general chat), so they should have high-quality, comprehensive content from real job postings.

Return JSON array with ${jobBatch.length} objects in this EXACT format:
[
  {
    "requirements": ["Specific requirement 1", "Specific requirement 2"],
    "responsibilities": ["Key responsibility 1", "Key responsibility 2"],
    "qualifications": {
      "required": ["Must-have qualification 1", "Must-have qualification 2"],
      "preferred": ["Nice-to-have qualification 1", "Nice-to-have qualification 2"]
    },
    "keySkills": [
      {
        "name": "Python",
        "importance": 9,
        "category": "technical",
        "skillType": "programming"
      },
      {
        "name": "Leadership",
        "importance": 7,
        "category": "soft",
        "skillType": "management"
      }
    ],
    "experienceLevel": "mid/senior/lead",
    "yearsOfExperience": {
      "minimum": 3,
      "preferred": 5
    },
    "educationRequirements": ["Bachelor's degree in relevant field"],
    "benefits": ["Health insurance", "401k", "Remote work"],
    "salary": {
      "min": 120000,
      "max": 150000,
      "currency": "USD"
    },
    "workArrangement": "remote/hybrid/onsite",
    "industryContext": "technology/finance/healthcare",
    "roleCategory": "software-engineering/product-management",
    "technicalComplexity": "high/medium/low",
    "leadershipRequired": true/false,
    "companyStage": "startup/growth/enterprise"
  }
]

IMPORTANT:
- Skills importance: 9-10=critical, 7-8=very important, 5-6=important, 3-4=nice to have
- Extract comprehensive information from each job posting discovered via Claude web search
- These are high-quality job postings so expect detailed content
- Maintain high accuracy and detail level
- Return exactly ${jobBatch.length} analysis objects`
        }
      ]
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const analyses = JSON.parse(jsonMatch[0]);
      
      // Ensure we have the right number of analyses
      if (analyses.length === jobBatch.length) {
        return analyses.map((analysis, index) => ({
          ...analysis,
          analysisMetadata: {
            analyzedAt: new Date(),
            algorithmVersion: '3.2-claude-web-search-premium',
            model: 'gpt-4o',
            analysisType: 'claude_web_search_discovery_premium',
            qualityLevel: 'same_as_manual',
            discoveryPlatform: jobBatch[index].sourcePlatform,
            claudeWebSearchDiscovery: true
          }
        }));
      }
    }
    
    // Fallback: return individual analyses
    return jobBatch.map((job) => createFallbackSingleAnalysis(job.sourcePlatform));
    
  } catch (error) {
    console.error('Error in GPT-4o batch analysis for Claude web search jobs:', error);
    return jobBatch.map((job) => createFallbackSingleAnalysis(job.sourcePlatform));
  }
}

/**
 * Create fallback single analysis for Claude web search
 */
function createFallbackSingleAnalysis(sourcePlatform = 'Unknown') {
  return {
    requirements: ['Relevant experience in the field'],
    responsibilities: ['Perform assigned duties effectively'],
    qualifications: {
      required: ['Relevant education or experience'],
      preferred: ['Additional qualifications preferred']
    },
    keySkills: [
      {
        name: 'Communication',
        importance: 6,
        category: 'soft',
        skillType: 'general'
      },
      {
        name: 'Problem Solving',
        importance: 6,
        category: 'soft',
        skillType: 'general'
      }
    ],
    experienceLevel: 'mid',
    yearsOfExperience: { minimum: 3, preferred: 5 },
    educationRequirements: ['Bachelor\'s degree preferred'],
    benefits: ['Competitive benefits package'],
    workArrangement: 'unknown',
    industryContext: 'general',
    roleCategory: 'general',
    technicalComplexity: 'medium',
    leadershipRequired: false,
    companyStage: 'unknown',
    analysisMetadata: {
      analyzedAt: new Date(),
      algorithmVersion: '3.2-claude-web-search-fallback',
      model: 'gpt-4o-fallback',
      analysisType: 'claude_web_search_discovery_fallback',
      discoveryPlatform: sourcePlatform,
      claudeWebSearchDiscovery: true
    }
  };
}

/**
 * Enhanced career analysis for Claude web search targeting
 */
async function analyzeCareerTrajectoryEnhanced(resumeData) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are an expert career strategist. Analyze resume data to create targeted job search criteria for AI job discovery using Claude's web search API. Focus on generating specific, searchable job titles and keywords that will find the best opportunities through web search. Return only valid JSON.`
        },
        {
          role: "user",
          content: `Analyze this career data and create targeted search criteria for Claude web search job discovery:

Experience: ${JSON.stringify(resumeData.experience?.slice(0, 3), null, 2)}
Skills: ${JSON.stringify(resumeData.skills?.slice(0, 15), null, 2)}
Education: ${JSON.stringify(resumeData.education?.slice(0, 2), null, 2)}

Create targeted search criteria in this EXACT JSON format for Claude web search:
{
  "targetJobTitles": [
    "Primary Target Title",
    "Alternative Title 1", 
    "Alternative Title 2",
    "Growth Opportunity Title"
  ],
  "targetKeywords": [
    "keyword1", "keyword2", "keyword3"
  ],
  "experienceLevel": "Mid/Senior/Lead",
  "industries": ["Industry 1", "Industry 2"],
  "preferredLocations": ["Remote", "Major City"],
  "salaryExpectation": {
    "min": 120000,
    "max": 180000,
    "currency": "USD"
  },
  "mustHaveSkills": ["Critical Skill 1", "Critical Skill 2"],
  "niceToHaveSkills": ["Bonus Skill 1", "Bonus Skill 2"],
  "avoidKeywords": ["keyword to avoid"],
  "workArrangement": "remote/hybrid/onsite",
  "careerDirection": "Brief description of career goals",
  "targetCompanyTypes": ["Startup", "Scale-up", "Enterprise"],
  "webSearchPreferences": {
    "focus": "Direct company postings and reputable job boards",
    "avoid": "Recruitment agencies and low-quality job aggregators",
    "prioritize": "Greenhouse, Lever, Indeed, LinkedIn, company career pages"
  }
}

Focus on:
1. Specific job titles that match experience level and are commonly searched
2. Keywords that companies actually use in job postings
3. Realistic salary expectations based on current market
4. Skills that are in high demand
5. Company types and job boards that typically have quality postings
6. Avoiding overqualified or underqualified positions`
        }
      ]
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return createEnhancedFallbackCareerProfile(resumeData);
    
  } catch (error) {
    console.error('Error in enhanced career trajectory analysis:', error);
    return createEnhancedFallbackCareerProfile(resumeData);
  }
}

/**
 * Enhanced fallback career profile for Claude web search
 */
function createEnhancedFallbackCareerProfile(resumeData) {
  return {
    targetJobTitles: [
      resumeData.experience?.[0]?.title || 'Software Engineer',
      'Senior Software Engineer',
      'Software Developer',
      'Full Stack Developer'
    ],
    targetKeywords: [
      'software development',
      'programming',
      'engineering',
      'technology'
    ],
    experienceLevel: calculateExperienceLevel(resumeData.experience),
    industries: ['Technology', 'Software', 'SaaS'],
    preferredLocations: ['Remote', 'San Francisco', 'New York', 'Austin'],
    salaryExpectation: {
      min: 100000,
      max: 150000,
      currency: 'USD'
    },
    mustHaveSkills: resumeData.skills?.slice(0, 3).map(s => typeof s === 'string' ? s : s.name) || [],
    niceToHaveSkills: resumeData.skills?.slice(3, 6).map(s => typeof s === 'string' ? s : s.name) || [],
    workArrangement: 'remote',
    careerDirection: 'Software engineering role with growth opportunities',
    targetCompanyTypes: ['Startup', 'Scale-up', 'Enterprise'],
    webSearchPreferences: {
      focus: 'Direct company postings and reputable job boards',
      avoid: 'Recruitment agencies and low-quality job aggregators',
      prioritize: 'Greenhouse, Lever, Indeed, LinkedIn, company career pages'
    }
  };
}

function parseLocationEnhanced(locationString) {
  if (!locationString) return { remote: true };
  
  const lower = locationString.toLowerCase();
  const remote = lower.includes('remote') || lower.includes('anywhere');
  
  if (remote) {
    return {
      remote: true,
      city: lower.includes('remote') ? null : extractCity(locationString),
      country: 'USA'
    };
  }
  
  const parts = locationString.split(',').map(p => p.trim());
  return {
    city: parts[0] || null,
    state: parts[1] || null,
    country: parts[2] || 'USA',
    remote: false
  };
}

function extractCity(locationString) {
  const parts = locationString.split(',').map(p => p.trim());
  return parts.find(part => !part.toLowerCase().includes('remote')) || null;
}

// Keep all existing utility functions
function extractSearchCriteria(resumeData) {
  return {
    jobTitle: resumeData.experience?.[0]?.title || 'Software Engineer',
    skills: resumeData.skills?.slice(0, 10).map(s => typeof s === 'string' ? s : s.name) || [],
    location: resumeData.contactInfo?.location || 'Remote',
    experienceLevel: calculateExperienceLevel(resumeData.experience)
  };
}

function calculateExperienceLevel(experiences) {
  const years = calculateYearsOfExperience(experiences);
  if (years < 2) return 'Entry';
  if (years < 5) return 'Mid';
  if (years < 10) return 'Senior';
  return 'Lead';
}

function calculateYearsOfExperience(experiences) {
  if (!experiences?.length) return 0;
  
  const sorted = experiences
    .filter(exp => exp.startDate)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  
  if (!sorted.length) return 0;
  
  const first = new Date(sorted[0].startDate);
  const last = sorted[sorted.length - 1].endDate 
    ? new Date(sorted[sorted.length - 1].endDate)
    : new Date();
  
  return Math.round((last - first) / (1000 * 60 * 60 * 24 * 365));
}

async function isDailyLimitReached(search) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!search.lastSearchDate || search.lastSearchDate < today) {
    search.jobsFoundToday = 0;
    search.lastSearchDate = today;
    await search.save();
    return false;
  }
  
  return search.jobsFoundToday >= search.dailyLimit;
}

async function updateSearchStatus(searchId, status, message) {
  await AiJobSearch.findByIdAndUpdate(searchId, {
    status,
    lastUpdateMessage: message,
    lastUpdated: new Date()
  });
  console.log(`Search ${searchId}: ${status} - ${message}`);
}

// Export existing functions for compatibility
exports.getUserAiSearches = async (userId) => {
  return await AiJobSearch.find({ userId }).sort({ createdAt: -1 });
};

exports.pauseAiSearch = async (userId, searchId) => {
  const search = await AiJobSearch.findOne({ _id: searchId, userId });
  if (!search) throw new Error('Search not found');
  
  await search.addReasoningLog(
    'completion',
    'Claude web search paused by user request',
    { phase: 'user_pause', pausedAt: new Date() }
  );
  
  search.status = 'paused';
  search.lastUpdateMessage = 'Paused by user';
  await search.save();
  
  return { message: 'Claude web search paused successfully' };
};

exports.resumeAiSearch = async (userId, searchId) => {
  const search = await AiJobSearch.findOne({ _id: searchId, userId });
  if (!search) throw new Error('Search not found');
  
  await search.addReasoningLog(
    'initialization',
    'Claude web search resumed by user - continuing with ENHANCED 3-Phase approach using Claude web search API',
    { 
      phase: 'user_resume', 
      resumedAt: new Date(),
      searchMethod: 'Claude web search API (same as general chat)'
    }
  );
  
  search.status = 'running';
  search.lastUpdateMessage = 'Resumed by user - Claude web search';
  await search.save();
  
  const resume = await Resume.findById(search.resumeId);
  if (resume) {
    performEnhancedJobSearch(searchId, userId, resume).catch(error => {
      console.error('Error resuming Claude web search:', error);
    });
  }
  
  return { message: 'Claude web search resumed successfully with enhanced approach' };
};

exports.deleteAiSearch = async (userId, searchId) => {
  const search = await AiJobSearch.findOne({ _id: searchId, userId });
  if (!search) throw new Error('Search not found');
  
  await search.addReasoningLog(
    'completion',
    'Claude web search cancelled by user request',
    { 
      phase: 'user_cancellation', 
      cancelledAt: new Date(),
      searchMethod: 'Claude web search API'
    }
  );
  
  search.status = 'cancelled';
  search.lastUpdateMessage = 'Cancelled by user';
  await search.save();
  
  return { message: 'Claude web search cancelled successfully' };
};