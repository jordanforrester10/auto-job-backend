// services/jobSearch.service.js - UPDATED WITH PERSISTENT WEEKLY TRACKING
const Job = require('../models/mongodb/job.model');
const Resume = require('../models/mongodb/resume.model');
const AiJobSearch = require('../models/mongodb/aiJobSearch.model');
const WeeklyJobTracking = require('../models/mongodb/weeklyJobTracking.model');
const { openai } = require('../config/openai');
const ActiveJobsDBExtractor = require('./activeJobsDB.service');
const jobAnalysisService = require('./jobAnalysis.service');
const subscriptionService = require('./subscription.service');

// 🔄 UPDATED: Weekly job discovery strategy with persistent tracking
const WEEKLY_SEARCH_CONFIG = {
  CASUAL_PLAN: {
    weeklyLimit: 50,        // 50 jobs per week
    maxLocations: 5,        // Max 5 locations per search
    searchFrequency: 'weekly'
  },
  HUNTER_PLAN: {
    weeklyLimit: 100,       // 100 jobs per week
    maxLocations: 10,       // Max 10 locations per search
    searchFrequency: 'weekly'
  },
  API_CALLS_PER_LOCATION: 2,  // Conservative API usage
  TARGET_JOBS_PER_LOCATION: 25 // Aim for 25 jobs per location
};

// CENTRALIZED VALIDATION UTILITIES (same as before but updated for locations)
class ValidationUtils {
  static normalizeSkillCategory(category) {
    if (!category || typeof category !== 'string') {
      return 'technical';
    }
    
    const normalized = category.toLowerCase().trim();
    
    const categoryMappings = {
      'technical': 'technical',
      'tech': 'technical',
      'technology': 'technical',
      'programming': 'technical',
      'development': 'technical',
      'engineering': 'technical',
      
      'soft': 'soft',
      'soft skills': 'soft',
      'interpersonal': 'soft',
      'communication': 'soft',
      'leadership': 'soft',
      'management': 'soft',
      'managerial': 'soft',
      'people': 'soft',
      'social': 'soft',
      
      'business': 'business',
      'strategy': 'business',
      'strategic': 'business',
      'analytical': 'business',
      'analysis': 'business',
      'finance': 'business',
      'marketing': 'business',
      'sales': 'business'
    };
    
    if (categoryMappings[normalized]) {
      return categoryMappings[normalized];
    }
    
    for (const [key, value] of Object.entries(categoryMappings)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
    
    return 'technical';
  }

  static validateAndNormalizeSkills(skills) {
    if (!Array.isArray(skills)) {
      return [];
    }
    
    return skills.map(skill => {
      if (typeof skill === 'string') {
        return {
          name: skill,
          importance: 5,
          category: 'technical',
          skillType: 'general'
        };
      }
      
      return {
        name: skill.name || 'Unknown Skill',
        importance: (skill.importance >= 1 && skill.importance <= 10) ? skill.importance : 5,
        category: this.normalizeSkillCategory(skill.category),
        skillType: skill.skillType && ['general', 'programming', 'analytical', 'communication', 'management'].includes(skill.skillType) 
          ? skill.skillType 
          : 'general'
      };
    });
  }

  static normalizeExperienceLevel(experienceLevel) {
    if (!experienceLevel || typeof experienceLevel !== 'string') {
      return 'mid';
    }
    
    const level = experienceLevel.toLowerCase().trim();
    
    const levelMappings = {
      'entry': 'entry', 'junior': 'junior', 'mid': 'mid', 'senior': 'senior', 
      'lead': 'lead', 'principal': 'principal', 'executive': 'executive'
    };
    
    if (levelMappings[level]) {
      return levelMappings[level];
    }
    
    if (level.includes('entry') || level.includes('graduate')) return 'entry';
    if (level.includes('junior') || level.includes('jr')) return 'junior';
    if (level.includes('senior') || level.includes('sr')) return 'senior';
    if (level.includes('lead') || level.includes('principal')) return 'lead';
    if (level.includes('director') || level.includes('executive')) return 'executive';
    
    return 'mid';
  }

  static normalizeWorkArrangement(workArrangement) {
    if (!workArrangement || typeof workArrangement !== 'string') {
      return 'unknown';
    }
    
    const normalized = workArrangement.toLowerCase().trim();
    
    if (normalized.includes('remote')) return 'remote';
    if (normalized.includes('hybrid') || normalized.includes('flexible')) return 'hybrid';
    if (normalized.includes('onsite') || normalized.includes('office')) return 'onsite';
    
    return 'unknown';
  }
}

// 🆕 NEW: Main weekly search function with persistent tracking and job titles input
exports.findJobsWithAi = async (userId, resumeId, searchCriteria = {}) => {
  try {
    console.log(`🚀 Starting WEEKLY AI job search with job titles input for user ${userId}`);
    
    // 🆕 NEW: Validate job titles input
    if (!searchCriteria.jobTitles || !Array.isArray(searchCriteria.jobTitles) || searchCriteria.jobTitles.length === 0) {
      throw new Error('Job titles are required for AI job search');
    }
    
    console.log(`🎯 Job titles provided: ${searchCriteria.jobTitles.join(', ')}`);
    
    // Get user's subscription to determine weekly limit
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    const userPlan = subscription.user.subscriptionTier;
    const weeklyLimit = userPlan === 'hunter' 
      ? WEEKLY_SEARCH_CONFIG.HUNTER_PLAN.weeklyLimit 
      : WEEKLY_SEARCH_CONFIG.CASUAL_PLAN.weeklyLimit;
    
    console.log(`💼 Plan: ${userPlan}, Weekly limit: ${weeklyLimit} jobs`);
    
    // 🔧 NEW: Check persistent weekly stats first
    const weeklyStats = await WeeklyJobTracking.getCurrentWeeklyStats(userId, weeklyLimit);
    if (weeklyStats.isLimitReached) {
      throw new Error(`Weekly limit reached: ${weeklyStats.jobsFoundThisWeek}/${weeklyStats.weeklyLimit} jobs found this week`);
    }
    
    console.log(`📊 Persistent weekly status: ${weeklyStats.jobsFoundThisWeek}/${weeklyStats.weeklyLimit} used, ${weeklyStats.remainingThisWeek} remaining`);
    
    // Check if user can create an AI search (slot-based)
    const slotCheck = await subscriptionService.checkAiJobDiscoverySlotAvailability(userId);
    if (!slotCheck.allowed) {
      throw new Error(slotCheck.reason);
    }
    
    const resume = await Resume.findById(resumeId);
    if (!resume || !resume.parsedData) {
      throw new Error('Resume not found or not parsed');
    }
    
    // Extract and validate search locations
    const searchLocations = searchCriteria.searchLocations || [{ name: 'Remote', type: 'remote' }];
    const maxLocations = userPlan === 'hunter' 
      ? WEEKLY_SEARCH_CONFIG.HUNTER_PLAN.maxLocations 
      : WEEKLY_SEARCH_CONFIG.CASUAL_PLAN.maxLocations;
    
    if (searchLocations.length > maxLocations) {
      throw new Error(`Maximum ${maxLocations} locations allowed for ${userPlan} plan`);
    }
    
    // 🆕 NEW: Create search record with job titles instead of resume-derived criteria
    const aiJobSearch = new AiJobSearch({
      userId,
      resumeId,
      resumeName: resume.name,
      searchCriteria: {
        jobTitles: searchCriteria.jobTitles, // 🆕 NEW: Use provided job titles
        // Legacy fields for backward compatibility
        jobTitle: searchCriteria.jobTitles[0], // Use first job title as primary
        skills: resume.parsedData.skills?.slice(0, 10).map(s => typeof s === 'string' ? s : s.name) || [],
        location: searchLocations[0]?.name || 'Remote',
        searchLocations: searchLocations,
        remoteWork: searchCriteria.includeRemote !== false,
        experienceLevel: searchCriteria.experienceLevel || 'mid'
      },
      status: 'running',
      searchType: 'weekly_active_jobs',
      weeklyLimit: weeklyLimit,
      jobsFoundThisWeek: 0,
      totalJobsFound: 0,
      searchApproach: '3-phase-intelligent-active-jobs-weekly',
      approachVersion: '6.0-job-titles-input-persistent',
      qualityLevel: 'active-jobs-weekly-enhanced'
    });
    
    await aiJobSearch.save();
    
    await aiJobSearch.addReasoningLog(
      'initialization',
      `Starting WEEKLY AI search with persistent tracking - targeting ${weeklyStats.remainingThisWeek} remaining jobs this week!`,
      {
        searchCriteria: aiJobSearch.searchCriteria,
        weeklyLimit: aiJobSearch.weeklyLimit,
        remainingThisWeek: weeklyStats.remainingThisWeek,
        locationsCount: searchLocations.length,
        locations: searchLocations.map(loc => loc.name),
        userPlan: userPlan,
        searchApproach: 'Enhanced weekly discovery with persistent tracking',
        trackingMethod: 'persistent_weekly_tracking'
      }
    );
    
    // Schedule next weekly run (Monday 9 AM)
    await aiJobSearch.scheduleNextWeeklyRun(1, '09:00');
    
    // Start background search with persistent weekly tracking
    performWeeklySearchWithTracking(aiJobSearch._id, userId, resume, searchLocations, userPlan, weeklyLimit).catch(error => {
      console.error('Weekly search error:', error);
      updateSearchStatus(aiJobSearch._id, 'failed', error.message);
    });
    
    return {
      success: true,
      message: `WEEKLY AI job search started! Will find up to ${weeklyStats.remainingThisWeek} remaining jobs across ${searchLocations.length} locations this week.`,
      searchId: aiJobSearch._id,
      searchMethod: 'Weekly Multi-Location Discovery with Persistent Tracking',
      weeklyLimit: weeklyLimit,
      remainingThisWeek: weeklyStats.remainingThisWeek,
      locations: searchLocations.map(loc => loc.name),
      nextRun: aiJobSearch.schedule.nextScheduledRun
    };
    
  } catch (error) {
    console.error('Error initiating weekly search:', error);
    throw error;
  }
};

// 🆕 NEW: Weekly search process with persistent tracking
async function performWeeklySearchWithTracking(searchId, userId, resume, searchLocations, userPlan, weeklyLimit) {
  const searchStartTime = Date.now();
  let search;
  
  try {
    search = await AiJobSearch.findById(searchId);
    if (!search || search.status !== 'running') return;
    
    // 🔧 NEW: Check persistent weekly limits
    const weeklyStats = await WeeklyJobTracking.getCurrentWeeklyStats(userId, weeklyLimit);
    if (weeklyStats.isLimitReached) {
      await search.addReasoningLog(
        'completion',
        `User has already reached this week's limit of ${weeklyLimit} job discoveries using persistent tracking.`,
        { 
          weeklyLimit: weeklyLimit, 
          jobsFoundThisWeek: weeklyStats.jobsFoundThisWeek,
          remainingThisWeek: weeklyStats.remainingThisWeek,
          reason: 'persistent_weekly_limit_reached',
          trackingMethod: 'persistent_weekly_tracking'
        }
      );
      await updateSearchStatus(searchId, 'completed', `Weekly limit reached: ${weeklyStats.jobsFoundThisWeek}/${weeklyLimit} jobs found this week (persistent tracking)`);
      return;
    }
    
    console.log(`📊 Persistent weekly status: ${weeklyStats.jobsFoundThisWeek}/${weeklyStats.weeklyLimit} used, ${weeklyStats.remainingThisWeek} remaining`);
    
    // PHASE 1: Enhanced Career Analysis for Location-Based Search using provided job titles
    console.log(`📊 Phase 1: Enhanced Career Analysis for Multi-Location Search using provided job titles...`);
    const careerProfile = await analyzeCareerForLocationTargeting(resume.parsedData, searchLocations, search.searchCriteria.jobTitles);
    
    await search.addReasoningLog(
      'career_analysis',
      `Enhanced career analysis complete! Optimized for ${searchLocations.length} locations with ${weeklyStats.remainingThisWeek} jobs remaining this week.`,
      {
        targetJobTitles: careerProfile.targetJobTitles || [],
        targetKeywords: careerProfile.targetKeywords || [],
        experienceLevel: careerProfile.experienceLevel,
        locationsToSearch: searchLocations.map(loc => loc.name),
        salaryFocused: true,
        weeklyStats: weeklyStats,
        trackingMethod: 'persistent_weekly_tracking'
      }
    );
    
    // PHASE 2: Multi-Location Job Discovery with Enhanced Salary Extraction
    console.log(`🌍 Phase 2: Multi-Location Job Discovery with Enhanced Salary Extraction...`);
    const discoveryResults = await performMultiLocationJobDiscovery(careerProfile, search, searchLocations);
    
    if (discoveryResults.jobs.length === 0) {
      await search.addReasoningLog(
        'completion',
        `No jobs found across ${searchLocations.length} locations this week.`,
        { 
          phase: 'no_results', 
          locationsSearched: searchLocations.map(loc => loc.name),
          weeklyAttempt: true,
          weeklyStats: weeklyStats,
          trackingMethod: 'persistent_weekly_tracking'
        }
      );
      await updateSearchStatus(searchId, 'completed', `No jobs found this week across ${searchLocations.length} locations`);
      return;
    }
    
    // PHASE 3: Enhanced Job Analysis with Salary Extraction
    console.log(`🔬 Phase 3: Enhanced Analysis of ${discoveryResults.jobs.length} jobs with salary extraction...`);
    const analyzedJobs = await performEnhancedJobAnalysisWithSalary(discoveryResults.jobs, search, careerProfile);
    
    // 🔧 FIX: Remove duplicates before saving
    console.log(`🔄 Removing duplicates from ${analyzedJobs.length} analyzed jobs...`);
    const uniqueJobs = await removeDuplicateJobs(analyzedJobs, userId);
    console.log(`✅ After duplicate removal: ${uniqueJobs.length} unique jobs`);
    
    // 🔧 NEW: Save Jobs with Persistent Weekly Tracking
    console.log(`💾 Saving jobs with persistent weekly tracking...`);
    const savedCount = await saveJobsWithPersistentTracking(uniqueJobs, userId, searchId, search, userPlan, weeklyLimit);
    
    const totalDuration = Date.now() - searchStartTime;
    
    // Get updated weekly stats after saving
    const finalWeeklyStats = await WeeklyJobTracking.getCurrentWeeklyStats(userId, weeklyLimit);
    
    await search.addReasoningLog(
      'completion',
      `WEEKLY search complete with persistent tracking! Found ${savedCount} jobs. Weekly total: ${finalWeeklyStats.jobsFoundThisWeek}/${finalWeeklyStats.weeklyLimit} jobs.`,
      {
        jobsSaved: savedCount,
        locationsSearched: searchLocations.length,
        locationStats: discoveryResults.locationStats,
        salaryStats: discoveryResults.salaryStats,
        totalDuration: totalDuration,
        searchTime: `${Math.round(totalDuration / 1000)} seconds`,
        weeklyStats: finalWeeklyStats,
        trackingMethod: 'persistent_weekly_tracking'
      }
    );
    
    // Update search status
    const statusMessage = finalWeeklyStats.isLimitReached 
      ? `Weekly limit reached: ${finalWeeklyStats.jobsFoundThisWeek}/${finalWeeklyStats.weeklyLimit} jobs found (persistent tracking)`
      : `Found ${savedCount} jobs (${finalWeeklyStats.remainingThisWeek} remaining this week)`;
    
    await updateSearchStatus(searchId, 'running', statusMessage);
    console.log(`✅ Weekly search complete with persistent tracking: ${savedCount} jobs saved. Weekly total: ${finalWeeklyStats.jobsFoundThisWeek}/${finalWeeklyStats.weeklyLimit}`);
    
  } catch (error) {
    console.error('Error in weekly search with persistent tracking:', error);
    
    if (search) {
      await search.addReasoningLog(
        'error',
        `Weekly search encountered an issue: ${error.message}`,
        { 
          error: error.message, 
          searchLocations: searchLocations.length,
          trackingMethod: 'persistent_weekly_tracking'
        },
        false
      );
    }
    
    await updateSearchStatus(searchId, 'failed', error.message);
  }
}

// 🆕 NEW: Remove duplicate jobs based on title, company, and similar job URLs
async function removeDuplicateJobs(jobs, userId) {
  const uniqueJobs = [];
  const seenJobs = new Set();
  
  for (const job of jobs) {
    // Create a unique key based on title, company, and normalized URL
    const normalizedTitle = job.title.toLowerCase().trim();
    const normalizedCompany = job.company.toLowerCase().trim();
    const normalizedUrl = job.jobUrl ? job.jobUrl.split('?')[0].toLowerCase() : '';
    
    const uniqueKey = `${normalizedCompany}::${normalizedTitle}`;
    
    // Check if we've seen this job before
    if (seenJobs.has(uniqueKey)) {
      console.log(`🔄 Skipping duplicate: ${job.title} at ${job.company}`);
      continue;
    }
    
    // Check if similar job already exists in database for this user
    const existingJob = await Job.findOne({
      userId: userId,
      $and: [
        { title: { $regex: normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\    const uniqueKey = `${normalizedCompany}::${'), $options: 'i' } },
        { company: { $regex: normalizedCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\    const uniqueKey = `${normalizedCompany}::${'), $options: 'i' } }
      ]
    });
    
    if (existingJob) {
      console.log(`🔄 Skipping existing job: ${job.title} at ${job.company} (already in database)`);
      continue;
    }
    
    // This is a unique job
    seenJobs.add(uniqueKey);
    uniqueJobs.push(job);
  }
  
  return uniqueJobs;
}

// 🆕 NEW: Enhanced career analysis using provided job titles (no more resume analysis dependency)
async function analyzeCareerForLocationTargeting(resumeData, searchLocations, providedJobTitles = []) {
  try {
    // 🆕 NEW: Use provided job titles instead of deriving from resume
    const jobTitles = providedJobTitles && providedJobTitles.length > 0 
      ? providedJobTitles 
      : [resumeData.experience?.[0]?.title || 'Professional'];
    
    const skills = resumeData.skills?.map(skill => typeof skill === 'string' ? skill : skill.name).join(', ') || '';
    const locationNames = searchLocations.map(loc => loc.name).join(', ');
    const hasRemote = searchLocations.some(loc => loc.type === 'remote' || loc.name === 'Remote');
    
    console.log(`🎯 Using provided job titles for career analysis: ${jobTitles.join(', ')}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `Analyze these PROVIDED JOB TITLES for WEEKLY MULTI-LOCATION job targeting with salary focus:

PROVIDED JOB TITLES: ${jobTitles.join(', ')}
Relevant Skills: ${skills}
Target Locations: ${locationNames}
Remote Work: ${hasRemote ? 'Yes' : 'No'}

Return JSON optimized for weekly job discovery across multiple locations using the PROVIDED job titles:
{
  "targetJobTitles": [
    "// Use the PROVIDED job titles exactly as given",
    "// These are what the user wants to search for"
  ],
  "targetKeywords": [
    "// TOP 3-5 most important skills for these specific job titles",
    "// Focus on skills that match the provided job titles"
  ],
  "experienceLevel": "// entry, junior, mid, senior, lead, principal, executive",
  "careerDirection": "// Brief description focusing on salary potential for these titles",
  "locationOptimization": {
    "remotePreference": ${hasRemote},
    "marketAdaptation": "// How to adapt search for different markets",
    "salaryExpectation": "// Expected salary range for these job titles"
  }
}

IMPORTANT: Use the PROVIDED job titles exactly - do not modify or suggest alternatives!`
        }
      ]
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const profile = JSON.parse(jsonMatch[0]);
      
      // 🆕 NEW: Ensure we use the provided job titles exactly
      profile.targetJobTitles = jobTitles;
      profile.targetKeywords = (profile.targetKeywords || []).slice(0, 5);
      
      return {
        ...profile,
        searchLocations: searchLocations,
        workArrangement: hasRemote ? 'flexible' : 'location_specific'
      };
    }
    
    return createLocationFallbackCareerProfile(jobTitles[0], skills, searchLocations, jobTitles);
    
  } catch (error) {
    console.error('Error in location-based career analysis:', error);
    return createLocationFallbackCareerProfile(
      jobTitles[0] || 'Professional',
      resumeData.skills?.map(s => typeof s === 'string' ? s : s.name).join(', ') || '',
      searchLocations,
      jobTitles
    );
  }
}

function createLocationFallbackCareerProfile(currentRole, skills, searchLocations) {
  const baseRole = currentRole.replace(/^(senior|sr|junior|jr|lead|principal|staff|director|head|chief|vp|vice president)\s+/i, '').trim() || 'Professional';
  const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0).slice(0, 3);
  const hasRemote = searchLocations.some(loc => loc.type === 'remote' || loc.name === 'Remote');
  
  return {
    targetJobTitles: [baseRole],
    targetKeywords: skillsArray.length > 0 ? skillsArray : ['professional', 'experience'],
    experienceLevel: 'mid',
    careerDirection: `${baseRole} career progression with salary optimization`,
    searchLocations: searchLocations,
    workArrangement: hasRemote ? 'flexible' : 'location_specific',
    locationOptimization: {
      remotePreference: hasRemote,
      marketAdaptation: 'Standard search across all locations',
      salaryExpectation: 'Market rate for role and experience'
    }
  };
}

// 🆕 NEW: Multi-location job discovery
async function performMultiLocationJobDiscovery(careerProfile, search, searchLocations) {
  try {
    const activeJobsDBExtractor = new ActiveJobsDBExtractor();
    
    // Test API health
    const apiHealth = await activeJobsDBExtractor.getApiHealth();
    if (apiHealth.status !== 'healthy') {
      throw new Error(`Active Jobs DB API unavailable: ${apiHealth.message}`);
    }
    
    console.log(`🌍 MULTI-LOCATION DISCOVERY: Searching across ${searchLocations.length} locations...`);
    
    // Prepare search parameters
    const searchParams = {
      jobTitle: careerProfile.targetJobTitles?.[0] || 'Professional',
      searchLocations: searchLocations,
      experienceLevel: careerProfile.experienceLevel,
      weeklyLimit: search.weeklyLimit,
      keywords: careerProfile.targetKeywords || []
    };
    
    // Execute multi-location search
    const searchResults = await activeJobsDBExtractor.searchActiveJobsDBWithLocations(searchParams);
    
    await search.addReasoningLog(
      'active_jobs_discovery',
      `Multi-location discovery completed! Found ${searchResults.totalFound} jobs across ${searchResults.locationsSearched} locations.`,
      {
        totalJobsFound: searchResults.totalFound,
        locationsSearched: searchResults.locationsSearched,
        locationStats: searchResults.locationStats,
        salaryStats: searchResults.salaryStats,
        apiProvider: 'active_jobs_db',
        searchApproach: 'weekly_multi_location_persistent',
        enhancedSalaryExtraction: true
      }
    );
    
    return searchResults;
    
  } catch (error) {
    console.error('Error in multi-location job discovery:', error);
    throw error;
  }
}

// 🆕 NEW: Enhanced job analysis with salary extraction
async function performEnhancedJobAnalysisWithSalary(jobs, search, careerProfile) {
  const analyzedJobs = [];
  
  console.log(`🔬 Starting ENHANCED analysis of ${jobs.length} jobs with salary extraction...`);
  
  for (const job of jobs) {
    try {
      console.log(`🤖 Analyzing "${job.title}" at ${job.company} with enhanced salary extraction...`);
      
      // Create enhanced job metadata for analysis
      const jobMetadata = {
        title: job.title,
        company: job.company,
        location: job.location?.original || job.location,
        salary: job.salary,
        workArrangement: job.workArrangement,
        isRemote: job.isRemote,
        benefits: job.benefits,
        experienceLevel: job.experienceLevel
      };
      
      // Use premium job analysis service with salary focus
      const enhancedAnalysis = await jobAnalysisService.analyzeJob(
        job.description || job.fullContent || 'Job description not available',
        jobMetadata,
        {
          isAiDiscovery: true,
          prioritizeCost: false, // Use premium analysis
          focusOnSalary: true,   // 🆕 NEW: Focus on salary extraction
          enhanceLocation: true  // 🆕 NEW: Enhanced location parsing
        }
      );
      
      // Merge extracted salary with API salary data
      const combinedSalary = mergeSalaryData(job.salary, enhancedAnalysis.salary);
      
      analyzedJobs.push({
        ...job,
        analysis: enhancedAnalysis,
        salary: combinedSalary, // Use combined salary data
        analysisError: null,
        enhancedAnalysis: true,
        salaryExtracted: !!(combinedSalary.min || combinedSalary.max),
        locationConfidence: job.metadata?.locationConfidence || 85
      });
      
      await search.addReasoningLog(
        'premium_analysis',
        `"${job.title}" at ${job.company} - Enhanced analysis with salary extraction complete`,
        {
          jobTitle: job.title,
          companyName: job.company,
          location: job.location?.original,
          salaryExtracted: !!(combinedSalary.min || combinedSalary.max),
          salaryRange: combinedSalary,
          workArrangement: job.workArrangement,
          isRemote: job.isRemote,
          skillsFound: enhancedAnalysis.keySkills?.length || 0,
          modelUsed: enhancedAnalysis.analysisMetadata?.model || 'gpt-4o',
          analysisType: 'weekly_location_salary_enhanced_persistent'
        }
      );
      
    } catch (error) {
      console.error(`❌ Error in enhanced analysis for ${job.title}:`, error);
      
      // Fallback to basic analysis
      console.log(`🔄 Falling back to basic analysis for ${job.title}...`);
      const basicAnalysis = createBasicAnalysisWithSalary(job, careerProfile);
      
      analyzedJobs.push({
        ...job,
        analysis: basicAnalysis,
        analysisError: error.message,
        enhancedAnalysis: false,
        salaryExtracted: !!(job.salary?.min || job.salary?.max),
        fallbackUsed: true
      });
    }
  }
  
  const enhancedCount = analyzedJobs.filter(job => job.enhancedAnalysis).length;
  const salaryCount = analyzedJobs.filter(job => job.salaryExtracted).length;
  
  console.log(`✅ Analysis complete: ${enhancedCount} enhanced, ${salaryCount} with salary data`);
  
  return analyzedJobs;
}

// 🆕 NEW: Merge salary data from different sources
function mergeSalaryData(apiSalary, analysisSalary) {
  const merged = {
    min: null,
    max: null,
    currency: 'USD',
    period: 'annually',
    source: null,
    confidence: 0,
    extractionMethod: null
  };
  
  // Priority 1: API salary data (highest confidence)
  if (apiSalary && (apiSalary.min || apiSalary.max)) {
    Object.assign(merged, apiSalary);
    if (apiSalary.confidence > merged.confidence) {
      merged.source = apiSalary.source || 'api';
      merged.extractionMethod = apiSalary.extractionMethod || 'api_direct';
    }
  }
  
  // Priority 2: Analysis salary data (if no API data or lower confidence)
  if (analysisSalary && (analysisSalary.min || analysisSalary.max)) {
    if (!merged.min && analysisSalary.min) merged.min = analysisSalary.min;
    if (!merged.max && analysisSalary.max) merged.max = analysisSalary.max;
    
    if (!merged.source || (analysisSalary.confidence > merged.confidence)) {
      merged.source = analysisSalary.source || 'description';
      merged.extractionMethod = analysisSalary.extractionMethod || 'analysis_extraction';
      merged.confidence = analysisSalary.confidence || merged.confidence;
    }
  }
  
  // Ensure logical salary range
  if (merged.min && merged.max && merged.min > merged.max) {
    [merged.min, merged.max] = [merged.max, merged.min];
  }
  
  return merged;
}

// 🆕 NEW: Create basic analysis with salary for fallback
function createBasicAnalysisWithSalary(job, careerProfile) {
  const skills = createTargetedSkillsForCareer(careerProfile);

  return {
    requirements: ['Relevant experience in the field', 'Strong problem-solving skills'],
    responsibilities: ['Execute on key initiatives', 'Collaborate with team members'],
    qualifications: {
      required: ['Bachelor\'s degree or equivalent experience', 'Relevant years of experience'],
      preferred: ['Advanced degree', 'Industry certifications']
    },
    keySkills: skills,
    experienceLevel: ValidationUtils.normalizeExperienceLevel(careerProfile.experienceLevel || 'mid'),
    workArrangement: ValidationUtils.normalizeWorkArrangement(job.workArrangement || 'unknown'),
    // 🆕 NEW: Include salary in basic analysis
    salary: job.salary || {
      min: null,
      max: null,
      currency: 'USD',
      source: 'job_data',
      extractionMethod: 'basic_fallback'
    },
    analysisMetadata: {
      analyzedAt: new Date(),
      algorithmVersion: '5.0-weekly-location-salary-persistent',
      analysisType: 'basic_weekly_fallback_persistent',
      qualityLevel: 'basic',
      salaryIncluded: !!(job.salary?.min || job.salary?.max),
      locationIncluded: !!job.location,
      fallback: true,
      persistentTracking: true
    }
  };
}

function createTargetedSkillsForCareer(careerProfile) {
  const careerField = (careerProfile.careerDirection || '').toLowerCase();
  let skills = [];
  
  if (careerField.includes('engineering') || careerField.includes('software') || careerField.includes('developer')) {
    skills = [
      { name: 'Programming', importance: 8, category: 'technical', skillType: 'programming' },
      { name: 'Problem Solving', importance: 7, category: 'soft', skillType: 'analytical' },
      { name: 'Team Collaboration', importance: 6, category: 'soft', skillType: 'communication' }
    ];
  } else if (careerField.includes('product') && careerField.includes('management')) {
    skills = [
      { name: 'Product Strategy', importance: 8, category: 'business', skillType: 'management' },
      { name: 'Stakeholder Management', importance: 7, category: 'soft', skillType: 'communication' },
      { name: 'Data Analysis', importance: 6, category: 'technical', skillType: 'analytical' }
    ];
  } else {
    skills = [
      { name: 'Communication', importance: 7, category: 'soft', skillType: 'communication' },
      { name: 'Problem Solving', importance: 7, category: 'soft', skillType: 'general' },
      { name: 'Leadership', importance: 6, category: 'soft', skillType: 'management' },
      { name: 'Project Management', importance: 6, category: 'business', skillType: 'management' }
    ];
  }
  
  return ValidationUtils.validateAndNormalizeSkills(skills);
}

// 🔧 NEW: Save jobs with persistent weekly tracking
async function saveJobsWithPersistentTracking(analyzedJobs, userId, searchId, search, userPlan, weeklyLimit) {
  let savedCount = 0;
  
  // 🔧 NEW: Get persistent weekly stats BEFORE starting to save
  const userWeeklyStats = await WeeklyJobTracking.getCurrentWeeklyStats(userId, weeklyLimit);
  const maxJobsToSave = Math.min(analyzedJobs.length, userWeeklyStats.remainingThisWeek);
  
  console.log(`💾 Saving ${maxJobsToSave} analyzed jobs with persistent tracking (${userWeeklyStats.jobsFoundThisWeek}/${userWeeklyStats.weeklyLimit} used this week)...`);
  
  // If user has already hit weekly limit
  if (userWeeklyStats.isLimitReached) {
    console.log(`⚠️ User weekly limit already reached via persistent tracking: ${userWeeklyStats.jobsFoundThisWeek}/${userWeeklyStats.weeklyLimit}`);
    return 0;
  }
  
  // If no jobs to save
  if (maxJobsToSave === 0) {
    console.log(`⚠️ No jobs to save - weekly limit via persistent tracking: ${userWeeklyStats.jobsFoundThisWeek}/${userWeeklyStats.weeklyLimit}`);
    return 0;
  }
  
  for (const jobData of analyzedJobs.slice(0, maxJobsToSave)) {
    try {
      // Validate and normalize data from enhanced analysis
      const experienceLevel = ValidationUtils.normalizeExperienceLevel(jobData.analysis?.experienceLevel || jobData.experienceLevel || 'mid');
      const workArrangement = ValidationUtils.normalizeWorkArrangement(jobData.analysis?.workArrangement || jobData.workArrangement || 'unknown');
      const normalizedSkills = ValidationUtils.validateAndNormalizeSkills(jobData.analysis?.keySkills || []);
      
      // Determine analysis quality
      const isEnhanced = jobData.enhancedAnalysis === true;
      const hasSalary = !!(jobData.salary?.min || jobData.salary?.max);
      const analysisType = isEnhanced ? 'weekly_location_salary_enhanced_persistent' : 'weekly_location_salary_basic_persistent';
      const modelUsed = isEnhanced ? (jobData.analysis?.analysisMetadata?.model || 'gpt-4o') : 'basic-fallback';
      const qualityLevel = isEnhanced ? 'premium' : 'basic';
      
      // Create job record with enhanced location and salary data
      const job = new Job({
        userId,
        title: jobData.title,
        company: jobData.company,
        location: parseLocationEnhanced(jobData.location),
        description: jobData.fullContent || jobData.description || 'Job description not available',
        sourceUrl: jobData.jobUrl || jobData.sourceUrl,
        sourcePlatform: createValidActiveJobsDBSourcePlatform(jobData.sourcePlatform),
        isAiGenerated: true,
        applicationStatus: 'NOT_APPLIED',
        aiSearchId: searchId,
        salary: parseAndValidateSalary(jobData.salary),
        jobType: jobData.jobType || 'FULL_TIME',
        
        analysisStatus: {
          status: 'completed',
          progress: 100,
          message: isEnhanced 
            ? `Enhanced analysis complete! Found ${normalizedSkills.length} skills with salary extraction.`
            : `Basic analysis complete. Found ${normalizedSkills.length} skills.`,
          updatedAt: new Date(),
          completedAt: new Date(),
          canViewJob: true,
          skillsFound: normalizedSkills.length,
          experienceLevel: experienceLevel,
          modelUsed: modelUsed,
          analysisType: analysisType,
          searchApproach: '3-phase-intelligent-active-jobs-weekly-persistent',
          qualityLevel: qualityLevel,
          enhancedAnalysis: isEnhanced,
          salaryExtracted: hasSalary,
          locationEnhanced: !!jobData.location?.parsed,
          weeklySearch: true,
          persistentTracking: true
        },
        
        // Enhanced parsed data with location and salary
        parsedData: {
          requirements: jobData.analysis?.requirements || [],
          responsibilities: jobData.analysis?.responsibilities || [],
          qualifications: jobData.analysis?.qualifications || { required: [], preferred: [] },
          benefits: jobData.analysis?.benefits || jobData.benefits || [],
          keySkills: normalizedSkills,
          experienceLevel: experienceLevel,
          yearsOfExperience: jobData.analysis?.yearsOfExperience || { minimum: 3, preferred: 5 },
          educationRequirements: jobData.analysis?.educationRequirements || [],
          workArrangement: workArrangement,
          industryContext: jobData.analysis?.industryContext || 'technology',
          roleCategory: jobData.analysis?.roleCategory || 'general',
          technicalComplexity: jobData.analysis?.technicalComplexity || 'medium',
          leadershipRequired: jobData.analysis?.leadershipRequired || false,
          extractedAt: new Date(),
          extractionMethod: isEnhanced ? 'enhanced_weekly_location_salary_persistent' : 'basic_weekly_fallback_persistent',
          
          // Enhanced: Technical requirements and tools
          technicalRequirements: jobData.analysis?.technicalRequirements || [],
          toolsAndTechnologies: jobData.analysis?.toolsAndTechnologies || [],
          companyStage: jobData.analysis?.companyStage || 'unknown',
          department: jobData.analysis?.department || 'unknown',
          roleLevel: jobData.analysis?.roleLevel || 'individual-contributor',
          
          // 🆕 NEW: Enhanced location data
          locationData: {
            original: jobData.location?.original,
            parsed: jobData.location?.parsed,
            searchLocation: jobData.metadata?.searchLocation,
            isRemote: jobData.isRemote || false,
            workArrangement: workArrangement,
            locationConfidence: jobData.locationConfidence || jobData.metadata?.locationConfidence || 80
          },
          
          // 🆕 NEW: Enhanced salary data
          salaryData: {
            ...jobData.salary,
            extractionMethod: jobData.salary?.extractionMethod || 'unknown',
            confidence: jobData.salary?.confidence || 0,
            source: jobData.salary?.source || 'unknown',
            isEstimated: jobData.salary?.source === 'inferred'
          },
          
          // Active Jobs DB specific data
          activeJobsDBData: {
            platform: jobData.sourcePlatform,
            originalUrl: jobData.jobUrl,
            postedDate: jobData.postedDate,
            activeJobsDBId: jobData.activeJobsDBData?.id,
            category: jobData.activeJobsDBData?.category,
            discoveryMethod: 'weekly_multi_location_persistent',
            searchLocation: jobData.activeJobsDBData?.searchLocation,
            isDirectEmployer: jobData.isDirectEmployer || false,
            company_url: jobData.activeJobsDBData?.company_url,
            apply_url: jobData.activeJobsDBData?.apply_url,
            remote: jobData.activeJobsDBData?.remote,
            enhancedExtraction: true,
            weeklySearch: true,
            persistentTracking: true
          },
          
          // Analysis metadata
          analysisMetadata: jobData.analysis?.analysisMetadata || {
            analyzedAt: new Date(),
            algorithmVersion: '5.0-weekly-location-salary-persistent',
            analysisType: analysisType,
            qualityLevel: qualityLevel,
            enhancedAnalysis: isEnhanced,
            salaryExtracted: hasSalary,
            locationEnhanced: !!jobData.location?.parsed,
            model: modelUsed,
            fallback: !isEnhanced,
            weeklySearch: true,
            persistentTracking: true
          }
        },
        
        aiSearchMetadata: {
          searchScore: jobData.matchScore || 85,
          discoveryMethod: 'weekly_multi_location_persistent',
          extractionSuccess: !jobData.analysisError,
          contentQuality: jobData.contentQuality || 'high',
          premiumAnalysis: isEnhanced,
          weeklyDiscovery: true,
          activeJobsDBDiscovery: true,
          enhancedAnalysis: isEnhanced,
          salaryExtracted: hasSalary,
          locationEnhanced: !!jobData.location?.parsed,
          phase: 'weekly-multi-location-salary-persistent',
          originalPlatform: jobData.sourcePlatform,
          relevanceScore: jobData.matchScore || 85,
          isDirectEmployer: jobData.isDirectEmployer || false,
          searchLocation: jobData.activeJobsDBData?.searchLocation,
          persistentTracking: true,
          
          // Enhanced metadata
          enhancedMetadata: {
            analysisModel: modelUsed,
            analysisType: analysisType,
            qualityLevel: qualityLevel,
            enhancedAnalysis: isEnhanced,
            salaryExtracted: hasSalary,
            salarySource: jobData.salary?.source,
            salaryConfidence: jobData.salary?.confidence || 0,
            locationConfidence: jobData.locationConfidence || 80,
            workArrangement: workArrangement,
            isRemote: jobData.isRemote || false,
            weeklySearch: true,
            persistentTracking: true
          },
          
          // Active Jobs DB specific metadata
          activeJobsDBMetadata: {
            discoveryMethod: 'weekly_multi_location_persistent',
            apiProvider: 'active_jobs_db',
            enhancedSalaryExtraction: true,
            locationTargeting: true,
            directEmployerLinks: jobData.isDirectEmployer || false,
            weeklyQuotaManagement: true,
            persistentTracking: true
          }
        }
      });
      
      await job.save();
      savedCount++;
      
      // Update search progress
      await AiJobSearch.findByIdAndUpdate(searchId, {
        $inc: { jobsFoundThisWeek: 1, totalJobsFound: 1 },
        $push: {
          jobsFound: {
            jobId: job._id,
            title: job.title,
            company: job.company,
            foundAt: new Date(),
            location: {
              original: jobData.location?.original,
              parsed: jobData.location?.parsed
            },
            salary: jobData.salary,
            extractionMethod: isEnhanced ? 'enhanced_weekly_location_salary_persistent' : 'basic_weekly_fallback_persistent',
            contentQuality: jobData.contentQuality || 'high',
            matchScore: jobData.matchScore || 85,
            premiumAnalysis: isEnhanced,
            enhancedAnalysis: isEnhanced,
            salaryExtracted: hasSalary,
            sourcePlatform: jobData.sourcePlatform,
            relevanceScore: jobData.matchScore || 85,
            apiSource: 'active_jobs_db',
            modelUsed: modelUsed,
            weeklySearch: true,
            persistentTracking: true,
            searchLocation: jobData.activeJobsDBData?.searchLocation,
            workArrangement: workArrangement,
            isRemote: jobData.isRemote || false,
            benefits: jobData.benefits || [],
            requiredSkills: jobData.requiredSkills || [],
            preferredSkills: jobData.preferredSkills || []
          }
        }
      });
      
      const qualityIndicator = isEnhanced ? '🔥 ENHANCED' : '🔄 BASIC';
      const salaryIndicator = hasSalary ? '💰 SALARY' : '📊 NO SALARY';
      console.log(`✅ ${qualityIndicator} ${salaryIndicator}: ${job.title} at ${job.company} [${savedCount}/${maxJobsToSave}]`);
      
    } catch (error) {
      console.error(`❌ ERROR saving job ${jobData.title}:`, error);
    }
  }
  
  // 🔧 NEW: Add jobs to persistent weekly tracking
  if (savedCount > 0) {
    const trackingResult = await WeeklyJobTracking.addJobsToWeeklyTracking(
      userId, 
      searchId, 
      savedCount, 
      search.resumeName, 
      search.resumeName, 
      userPlan, 
      weeklyLimit
    );
    
    if (trackingResult.success) {
      console.log(`📊 Added ${trackingResult.jobsAdded} jobs to persistent weekly tracking. Total: ${trackingResult.totalThisWeek}/${trackingResult.weeklyLimit}`);
    } else {
      console.log(`⚠️ Persistent weekly tracking: ${trackingResult.reason}`);
    }
  }
  
  console.log(`💾 Weekly job saving with persistent tracking completed: ${savedCount} jobs saved`);
  
  return savedCount;
}

// 🔧 NEW: Get user weekly job stats using persistent tracking
async function getUserWeeklyJobStatsWithPersistentTracking(userId, weeklyLimit) {
  try {
    console.log(`📅 Getting persistent weekly stats for user ${userId}`);
    
    // Use the new persistent tracking method
    const persistentStats = await WeeklyJobTracking.getCurrentWeeklyStats(userId, weeklyLimit);
    
    console.log(`📊 Persistent weekly summary: ${persistentStats.jobsFoundThisWeek}/${persistentStats.weeklyLimit} used, ${persistentStats.remainingThisWeek} remaining, limit reached: ${persistentStats.isLimitReached}`);
    
    return persistentStats;
    
  } catch (error) {
    console.error('Error getting persistent weekly stats:', error);
    return {
      jobsFoundThisWeek: 0,
      weeklyLimit: weeklyLimit,
      remainingThisWeek: weeklyLimit,
      isLimitReached: false,
      weekStart: new Date(),
      weekEnd: new Date(),
      error: error.message,
      calculationMethod: 'persistent_tracking_error_fallback'
    };
  }
}

// 🆕 NEW: Enhanced location parsing
function parseLocationEnhanced(locationData) {
  if (!locationData) {
    return { remote: true, city: null, country: 'USA' };
  }
  
  // If already parsed
  if (locationData.parsed) {
    return {
      city: locationData.parsed.city,
      state: locationData.parsed.state,
      country: locationData.parsed.country || 'USA',
      remote: locationData.parsed.isRemote || false,
      coordinates: locationData.parsed.coordinates,
      originalLocation: locationData.original
    };
  }
  
  // Parse from string
  const locationString = locationData.original || locationData;
  if (typeof locationString === 'string') {
    const lower = locationString.toLowerCase();
    if (lower.includes('remote')) {
      return { remote: true, city: null, country: 'USA', originalLocation: locationString };
    }
    
    const parts = locationString.split(',').map(p => p.trim());
    return {
      city: parts[0] || null,
      state: parts[1] || null,
      country: parts[2] || 'USA',
      remote: false,
      originalLocation: locationString
    };
  }
  
  return { remote: true, city: null, country: 'USA' };
}

// 🆕 NEW: Parse and validate salary data
function parseAndValidateSalary(salaryData) {
  if (!salaryData) {
    return {};
  }
  
  const salary = {
    min: salaryData.min || null,
    max: salaryData.max || null,
    currency: salaryData.currency || 'USD',
    period: salaryData.period || 'annually',
    isExplicit: !!(salaryData.min || salaryData.max),
    source: salaryData.source || 'unknown',
    extractionMethod: salaryData.extractionMethod || 'unknown',
    confidence: salaryData.confidence || 0
  };
  
  // Validate salary numbers
  if (salary.min && (salary.min < 1000 || salary.min > 1000000)) {
    salary.min = null;
  }
  if (salary.max && (salary.max < 1000 || salary.max > 1000000)) {
    salary.max = null;
  }
  
  // Ensure logical range
  if (salary.min && salary.max && salary.min > salary.max) {
    [salary.min, salary.max] = [salary.max, salary.min];
  }
  
  return salary;
}

function createValidActiveJobsDBSourcePlatform(originalPlatform) {
  if (!originalPlatform) return 'ACTIVE_JOBS_DB_WEEKLY';
  
  const platform = originalPlatform.toLowerCase();
  
  const platformMap = {
    'greenhouse': 'ACTIVE_JOBS_DB_GREENHOUSE',
    'lever': 'ACTIVE_JOBS_DB_LEVER',
    'workday': 'ACTIVE_JOBS_DB_WORKDAY',
    'indeed': 'ACTIVE_JOBS_DB_INDEED',
    'linkedin': 'ACTIVE_JOBS_DB_LINKEDIN',
    'monster': 'ACTIVE_JOBS_DB_MONSTER',
    'careerbuilder': 'ACTIVE_JOBS_DB_CAREERBUILDER',
    'glassdoor': 'ACTIVE_JOBS_DB_GLASSDOOR',
    'ziprecruiter': 'ACTIVE_JOBS_DB_ZIPRECRUITER',
    'dice': 'ACTIVE_JOBS_DB_DICE'
  };
  
  for (const [key, value] of Object.entries(platformMap)) {
    if (platform.includes(key)) {
      return value;
    }
  }
  
  return 'ACTIVE_JOBS_DB_WEEKLY_OTHER';
}

function extractSearchCriteria(resumeData) {
  return {
    jobTitle: resumeData.experience?.[0]?.title || 'Professional',
    skills: resumeData.skills?.slice(0, 10).map(s => typeof s === 'string' ? s : s.name) || [],
    location: resumeData.contactInfo?.location || 'Remote',
    experienceLevel: 'Mid'
  };
}

async function updateSearchStatus(searchId, status, message) {
  await AiJobSearch.findByIdAndUpdate(searchId, {
    status,
    lastUpdateMessage: message,
    lastUpdated: new Date()
  });
  console.log(`Search ${searchId}: ${status} - ${message}`);
}

// 🔧 NEW: Export function to get user weekly stats with persistent tracking
exports.getUserWeeklyJobStats = getUserWeeklyJobStatsWithPersistentTracking;

// 🔧 NEW: Export function to get user weekly stats for subscription service (uses persistent tracking)
exports.getUserWeeklyJobStatsForSubscription = async (userId, weeklyLimit) => {
  return await getUserWeeklyJobStatsWithPersistentTracking(userId, weeklyLimit);
};

// 🆕 NEW: Onboarding-specific job search - finds 3 jobs from anywhere in US for first-time users
exports.searchJobsForOnboarding = async (resumeId, limit = 3) => {
  try {
    console.log(`🎯 Starting onboarding job search for resume ${resumeId}, limit: ${limit}`);
    
    const Resume = require('../models/mongodb/resume.model');
    const resume = await Resume.findById(resumeId);
    
    if (!resume || !resume.parsedData) {
      throw new Error('Resume not found or not parsed');
    }
    
    console.log(`📊 Resume found: ${resume.name}`);
    
    // Extract search criteria from resume
    const searchCriteria = {
      jobTitle: resume.parsedData.experience?.[0]?.title || 'Professional',
      skills: resume.parsedData.skills?.slice(0, 10).map(s => typeof s === 'string' ? s : s.name) || [],
      experienceLevel: resume.analysis?.experienceLevel || 'Mid',
      // For onboarding, search anywhere in US
      searchLocations: [{ name: 'United States', type: 'country' }],
      remoteWork: true // Include remote jobs for broader reach
    };
    
    console.log(`🔍 Search criteria:`, {
      jobTitle: searchCriteria.jobTitle,
      skillsCount: searchCriteria.skills.length,
      experienceLevel: searchCriteria.experienceLevel,
      locations: searchCriteria.searchLocations.map(loc => loc.name)
    });
    
    // Use existing ActiveJobsDB service for job discovery
    const ActiveJobsDBExtractor = require('./activeJobsDB.service');
    const activeJobsDBExtractor = new ActiveJobsDBExtractor();
    
    // Test API health first
    const apiHealth = await activeJobsDBExtractor.getApiHealth();
    if (apiHealth.status !== 'healthy') {
      console.warn(`⚠️ ActiveJobs DB API not healthy: ${apiHealth.message}, using fallback`);
      return { jobs: [], source: 'fallback_empty' };
    }
    
    // Prepare search parameters for onboarding
    const searchParams = {
      jobTitle: searchCriteria.jobTitle,
      searchLocations: searchCriteria.searchLocations,
      experienceLevel: searchCriteria.experienceLevel,
      keywords: searchCriteria.skills.slice(0, 5), // Top 5 skills
      limit: limit,
      onboardingSearch: true // Flag for onboarding
    };
    
    console.log(`🌍 Executing onboarding job search...`);
    
    // Execute job search
    const searchResults = await activeJobsDBExtractor.searchActiveJobsDBWithLocations(searchParams);
    
    if (!searchResults || !searchResults.jobs) {
      console.warn(`⚠️ No search results returned`);
      return { jobs: [], source: 'no_results' };
    }
    
    const jobs = searchResults.jobs.slice(0, limit);
    
    console.log(`✅ Onboarding job search completed: ${jobs.length} jobs found`);
    
    // Enhance jobs with onboarding-specific analysis
    const enhancedJobs = await Promise.all(jobs.map(async (job) => {
      try {
        // Use existing job analysis service for enhanced analysis
        const jobAnalysisService = require('./jobAnalysis.service');
        
        const jobMetadata = {
          title: job.title,
          company: job.company,
          location: job.location?.original || job.location,
          salary: job.salary,
          workArrangement: job.workArrangement,
          isRemote: job.isRemote
        };
        
        // Analyze job with onboarding focus
        const analysis = await jobAnalysisService.analyzeJob(
          job.description || job.fullContent || 'Job description not available',
          jobMetadata,
          {
            isAiDiscovery: true,
            prioritizeCost: true, // Use cost-effective analysis for onboarding
            focusOnSalary: true,
            enhanceLocation: true,
            onboardingAnalysis: true // Flag for onboarding-specific analysis
          }
        );
        
        return {
          ...job,
          analysis,
          isOnboardingJob: true,
          enhancedForOnboarding: true
        };
        
      } catch (analysisError) {
        console.error(`❌ Error analyzing job ${job.title}:`, analysisError);
        // Return job without enhanced analysis
        return {
          ...job,
          analysis: createBasicOnboardingAnalysis(job),
          isOnboardingJob: true,
          enhancedForOnboarding: false
        };
      }
    }));
    
    const result = {
      jobs: enhancedJobs,
      metadata: {
        searchCriteria,
        totalFound: enhancedJobs.length,
        source: 'active_jobs_db',
        searchType: 'onboarding',
        enhancedAnalysis: true,
        generatedAt: new Date().toISOString()
      }
    };
    
    console.log(`🎉 Onboarding job search completed successfully:`, {
      jobsFound: result.jobs.length,
      enhancedJobs: result.jobs.filter(j => j.enhancedForOnboarding).length,
      source: result.metadata.source
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in onboarding job search:', error);
    
    // Return fallback result instead of throwing
    return {
      jobs: [],
      metadata: {
        error: error.message,
        source: 'error_fallback',
        searchType: 'onboarding',
        generatedAt: new Date().toISOString()
      }
    };
  }
};

// Helper function to create basic analysis for onboarding jobs
function createBasicOnboardingAnalysis(job) {
  return {
    requirements: ['Relevant experience', 'Strong communication skills'],
    responsibilities: ['Execute key tasks', 'Collaborate with team'],
    qualifications: {
      required: ['Bachelor\'s degree or equivalent', 'Relevant experience'],
      preferred: ['Advanced degree', 'Industry certifications']
    },
    keySkills: [
      { name: 'Communication', importance: 7, category: 'soft', skillType: 'communication' },
      { name: 'Problem Solving', importance: 7, category: 'soft', skillType: 'analytical' },
      { name: 'Teamwork', importance: 6, category: 'soft', skillType: 'communication' }
    ],
    experienceLevel: 'mid',
    workArrangement: job.workArrangement || 'unknown',
    salary: job.salary || { min: null, max: null, currency: 'USD' },
    analysisMetadata: {
      analyzedAt: new Date(),
      algorithmVersion: '1.0-onboarding-basic',
      analysisType: 'onboarding_basic',
      qualityLevel: 'basic',
      onboardingAnalysis: true
    }
  };
}

// EXISTING EXPORTS - UPDATED FOR PERSISTENT WEEKLY TRACKING
exports.getUserAiSearches = async (userId) => {
  try {
    console.log(`📋 Getting AI searches for user ${userId}`);
    
    const searches = await AiJobSearch.find({ 
      userId, 
      status: { $ne: 'cancelled' } // Exclude cancelled/deleted searches
    })
    .populate('resumeId', 'name')
    .sort({ createdAt: -1 })
    .lean();
    
    console.log(`📊 Found ${searches.length} active AI searches for user ${userId}`);
    
    return searches;
    
  } catch (error) {
    console.error(`❌ Error getting AI searches for user ${userId}:`, error);
    throw new Error(`Failed to get AI searches: ${error.message}`);
  }
};

exports.pauseAiSearch = async (userId, searchId) => {
  try {
    console.log(`⏸️ Pausing AI search ${searchId} for user ${userId}`);
    
    const search = await AiJobSearch.findOne({ _id: searchId, userId });
    if (!search) {
      throw new Error('AI search not found');
    }
    
    await search.addReasoningLog(
      'completion',
      'Weekly AI search paused by user request - persistent tracking preserved',
      { 
        phase: 'user_pause', 
        pausedAt: new Date(), 
        weeklySearch: true,
        persistentTracking: true,
        weeklyProgress: search.getWeeklyProgress()
      }
    );
    
    // Use the safe update method
    await AiJobSearch.safeUpdateStatus(searchId, userId, 'paused', 'Search paused by user - weekly search and persistent tracking preserved');
    
    console.log(`✅ Successfully paused AI search ${searchId}`);
    
    return {
      success: true,
      message: 'AI search paused successfully'
    };
    
  } catch (error) {
    console.error(`❌ Error pausing AI search ${searchId}:`, error);
    
    return {
      success: false,
      message: `Failed to pause AI search: ${error.message}`,
      error: error.message
    };
  }
};

exports.resumeAiSearch = async (userId, searchId) => {
  try {
    console.log(`▶️ Resuming AI search ${searchId} for user ${userId}`);
    
    const search = await AiJobSearch.findOne({ _id: searchId, userId });
    if (!search) {
      throw new Error('AI search not found');
    }
    
    await search.addReasoningLog(
      'initialization',
      'Weekly AI search resumed by user - persistent tracking continues',
      { 
        phase: 'user_resume', 
        resumedAt: new Date(),
        searchMethod: 'Weekly multi-location discovery with persistent tracking',
        weeklyLimit: search.weeklyLimit,
        persistentTracking: true
      }
    );
    
    // Use the safe update method
    await AiJobSearch.safeUpdateStatus(searchId, userId, 'running', 'Resumed by user - weekly approach with persistent tracking');
    
    console.log(`✅ Successfully resumed AI search ${searchId}`);
    
    // Don't immediately start a new search - let the scheduler handle it
    console.log('Weekly search resumed - will run on next scheduled time');
    
    return {
      success: true,
      message: 'AI search resumed successfully'
    };
    
  } catch (error) {
    console.error(`❌ Error resuming AI search ${searchId}:`, error);
    
    return {
      success: false,
      message: `Failed to resume AI search: ${error.message}`,
      error: error.message
    };
  }
};

exports.deleteAiSearch = async (userId, searchId) => {
  try {
    console.log(`🗑️ Deleting AI search ${searchId} for user ${userId}`);
    
    const search = await AiJobSearch.findOne({ _id: searchId, userId });
    if (!search) {
      throw new Error('AI search not found or does not belong to user');
    }
    
    console.log(`🔍 Found AI search: ${search.resumeName} (Status: ${search.status})`);
    
    await search.addReasoningLog(
      'completion',
      'Weekly AI search deleted by user request - persistent tracking marks as deleted but preserves job count',
      { 
        phase: 'user_deletion', 
        deletedAt: new Date(),
        searchMethod: 'Weekly multi-location discovery with persistent tracking',
        weeklyProgress: search.getWeeklyProgress(),
        totalJobsFound: search.totalJobsFound,
        persistentTracking: true
      }
    );
    
    // 🔧 NEW: Mark search as deleted in persistent tracking (preserves job count)
    await WeeklyJobTracking.markSearchAsDeleted(userId, searchId);
    
    // Use the safe delete method from the model
    await AiJobSearch.safeDeleteById(searchId, userId);
    
    console.log(`✅ Successfully deleted AI search ${searchId} and marked in persistent tracking`);
    
    return {
      success: true,
      message: 'AI search deleted successfully - weekly job count preserved in tracking',
      searchId: searchId,
      searchName: search.resumeName
    };
    
  } catch (error) {
    console.error(`❌ Error deleting AI search ${searchId}:`, error);
    
    return {
      success: false,
      message: `Failed to delete AI search: ${error.message}`,
      error: error.message
    };
  }
};

// 🔧 NEW: Function to get weekly tracking summary for UI
exports.getWeeklyTrackingSummary = async (userId, weeklyLimit) => {
  try {
    const weeklyStats = await WeeklyJobTracking.getCurrentWeeklyStats(userId, weeklyLimit);
    
    // Get additional details if record exists
    const { weekStart } = WeeklyJobTracking.calculateWeekDates();
    const weeklyRecord = await WeeklyJobTracking.findOne({
      userId,
      weekStart: weekStart
    });
    
    return {
      ...weeklyStats,
      searchRuns: weeklyRecord?.getSearchRunsBreakdown() || [],
      summary: weeklyRecord?.getWeeklySummary() || null
    };
    
  } catch (error) {
    console.error('Error getting weekly tracking summary:', error);
    return {
      jobsFoundThisWeek: 0,
      weeklyLimit: weeklyLimit,
      remainingThisWeek: weeklyLimit,
      isLimitReached: false,
      searchRuns: [],
      summary: null,
      error: error.message
    };
  }
};
