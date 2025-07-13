// services/jobSearch.service.js - OPTIMIZED WITH EARLY DUPLICATE DETECTION
const Job = require('../models/mongodb/job.model');
const Resume = require('../models/mongodb/resume.model');
const AiJobSearch = require('../models/mongodb/aiJobSearch.model');
const { openai } = require('../config/openai');
const ActiveJobsDBExtractor = require('./activeJobsDB.service');
const jobAnalysisService = require('./jobAnalysis.service');

// BUDGET-CONSCIOUS SEARCH STRATEGY
const SEARCH_BUDGET = {
  MONTHLY_LIMIT: 250,        // Free plan limit
  DAILY_SAFE_LIMIT: 8,       // Conservative daily limit (250/31 days)
  JOBS_PER_API_CALL: 8,      // Small targeted calls
  MAX_API_CALLS_PER_SEARCH: 1, // Usually just 1 call per search
  TARGET_JOBS_TO_SAVE: 8     // Save all fetched jobs if they're good
};

// CENTRALIZED VALIDATION UTILITIES
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

  static normalizeSkillType(skillType) {
    if (!skillType || typeof skillType !== 'string') {
      return 'general';
    }
    
    const normalized = skillType.toLowerCase().trim();
    
    const typeMappings = {
      'programming': 'programming',
      'management': 'management',
      'analytical': 'analytical',
      'communication': 'communication',
      'design': 'design',
      'general': 'general'
    };
    
    if (typeMappings[normalized]) {
      return typeMappings[normalized];
    }
    
    for (const [key, value] of Object.entries(typeMappings)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
    
    return 'general';
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
        skillType: this.normalizeSkillType(skill.skillType)
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

// MAIN SEARCH FUNCTION - OPTIMIZED
exports.findJobsWithAi = async (userId, resumeId) => {
  try {
    console.log(`🚀 Starting OPTIMIZED AI job search with early duplicate detection for user ${userId}`);
    console.log(`💰 Budget limits: ${SEARCH_BUDGET.DAILY_SAFE_LIMIT} jobs/day, ${SEARCH_BUDGET.MONTHLY_LIMIT} jobs/month`);
    
    const resume = await Resume.findById(resumeId);
    if (!resume || !resume.parsedData) {
      throw new Error('Resume not found or not parsed');
    }
    
    // Create search record
    const aiJobSearch = new AiJobSearch({
      userId,
      resumeId,
      resumeName: resume.name,
      searchCriteria: extractSearchCriteria(resume.parsedData),
      status: 'running',
      dailyLimit: SEARCH_BUDGET.DAILY_SAFE_LIMIT,
      jobsFoundToday: 0,
      totalJobsFound: 0,
      searchApproach: '3-phase-intelligent-adzuna-api',
      approachVersion: '6.1-optimized-duplicate-detection',
      qualityLevel: 'adzuna-api-enhanced'
    });
    
    await aiJobSearch.save();
    
    await aiJobSearch.addReasoningLog(
      'initialization',
      `Starting OPTIMIZED AI search with early duplicate detection - targeting ${SEARCH_BUDGET.DAILY_SAFE_LIMIT} fresh jobs with GPT-4o analysis!`,
      {
        searchCriteria: aiJobSearch.searchCriteria,
        dailyLimit: aiJobSearch.dailyLimit,
        optimizations: 'Early duplicate detection, fresh job targeting',
        analysisModel: 'gpt-4o'
      }
    );
    
    // Start background search with optimizations
    performOptimizedSearch(aiJobSearch._id, userId, resume).catch(error => {
      console.error('Optimized search error:', error);
      updateSearchStatus(aiJobSearch._id, 'failed', error.message);
    });
    
    return {
      success: true,
      message: `OPTIMIZED AI job search started with early duplicate detection! Targeting ${SEARCH_BUDGET.DAILY_SAFE_LIMIT} fresh jobs with premium GPT-4o analysis.`,
      searchId: aiJobSearch._id,
      searchMethod: 'Optimized AI Discovery with Duplicate Prevention',
      analysisQuality: 'Premium analysis only on fresh jobs'
    };
    
  } catch (error) {
    console.error('Error initiating optimized search:', error);
    throw error;
  }
};

// OPTIMIZED SEARCH PROCESS WITH EARLY DUPLICATE DETECTION
async function performOptimizedSearch(searchId, userId, resume) {
  const searchStartTime = Date.now();
  let search;
  
  try {
    search = await AiJobSearch.findById(searchId);
    if (!search || search.status !== 'running') return;
    
    // Check daily limits
    if (await isDailyLimitReached(search)) {
      await search.addReasoningLog(
        'completion',
        `Reached today's limit of ${search.dailyLimit} job discoveries.`,
        { dailyLimit: search.dailyLimit, reason: 'daily_limit_reached' }
      );
      await updateSearchStatus(searchId, 'paused', 'Daily limit reached');
      return;
    }
    
    // PHASE 1: PRECISION Career Analysis
    console.log(`📊 Phase 1: PRECISION Career Analysis...`);
    const careerProfile = await analyzeCareerForPrecisionTargeting(resume.parsedData);
    
    await search.addReasoningLog(
      'career_analysis',
      `PRECISION career analysis complete! Optimized search for fresh jobs with ${careerProfile.targetJobTitles?.length || 0} target titles.`,
      {
        targetJobTitles: careerProfile.targetJobTitles || [],
        targetKeywords: careerProfile.targetKeywords || [],
        experienceLevel: careerProfile.experienceLevel,
        careerField: careerProfile.careerDirection
      }
    );
    
    // PHASE 2: 🔧 OPTIMIZED Job Discovery with Early Duplicate Detection
    console.log(`🎯 Phase 2: OPTIMIZED Job Discovery with Early Duplicate Detection...`);
    const { freshJobs, skippedDuplicates } = await performOptimizedJobDiscovery(careerProfile, search, userId);
    
    if (freshJobs.length === 0) {
      await search.addReasoningLog(
        'completion',
        `No fresh opportunities found. Skipped ${skippedDuplicates} duplicates during discovery phase.`,
        { 
          phase: 'no_fresh_results', 
          careerField: careerProfile.careerDirection,
          duplicatesSkipped: skippedDuplicates,
          optimizationWorked: skippedDuplicates > 0
        }
      );
      await updateSearchStatus(searchId, 'completed', `No fresh jobs found (${skippedDuplicates} duplicates avoided)`);
      return;
    }
    
    // PHASE 3: 🔥 ENHANCED ROLE-SPECIFIC Job Analysis (Only for Fresh Jobs!)
    console.log(`🔬 Phase 3: ENHANCED Analysis of ${freshJobs.length} FRESH jobs (${skippedDuplicates} duplicates skipped)...`);
    const analyzedJobs = await performEnhancedJobAnalysis(freshJobs, search, careerProfile);
    
    // Save Jobs
    console.log(`💾 Saving fresh job results...`);
    const savedCount = await saveJobsOptimized(analyzedJobs, userId, searchId, search);
    
    const totalDuration = Date.now() - searchStartTime;
    
    await search.addReasoningLog(
      'completion',
      `OPTIMIZED search complete! Found ${savedCount} fresh opportunities. Avoided ${skippedDuplicates} duplicates before analysis.`,
      {
        jobsSaved: savedCount,
        duplicatesAvoided: skippedDuplicates,
        totalDuration: totalDuration,
        searchTime: `${Math.round(totalDuration / 1000)} seconds`,
        careerField: careerProfile.careerDirection,
        optimizationSuccess: `Saved ${skippedDuplicates} GPT-4o calls by early duplicate detection`
      }
    );
    
    await updateSearchStatus(searchId, savedCount > 0 ? 'running' : 'completed', 
      `Found ${savedCount} fresh jobs (${skippedDuplicates} duplicates avoided)`);
    console.log(`✅ Optimized search complete: ${savedCount} fresh jobs saved, ${skippedDuplicates} duplicates avoided`);
    
  } catch (error) {
    console.error('Error in optimized search:', error);
    
    if (search) {
      await search.addReasoningLog(
        'error',
        `Optimized search encountered an issue: ${error.message}`,
        { error: error.message },
        false
      );
    }
    
    await updateSearchStatus(searchId, 'failed', error.message);
  }
}

// 🔧 OPTIMIZED JOB DISCOVERY WITH EARLY DUPLICATE DETECTION
async function performOptimizedJobDiscovery(careerProfile, search, userId) {
  try {
    const activeJobsDBExtractor = new ActiveJobsDBExtractor();
    
    // Test API health
    const apiHealth = await activeJobsDBExtractor.getApiHealth();
    if (apiHealth.status !== 'healthy') {
      throw new Error(`Active Jobs DB API unavailable: ${apiHealth.message}`);
    }
    
    console.log(`🎯 OPTIMIZED DISCOVERY: Early duplicate detection enabled...`);
    
    // 🔧 STEP 1: Get existing jobs to avoid duplicates
    const existingJobs = await getExistingJobsForDuplicateCheck(userId);
    console.log(`📊 Found ${existingJobs.length} existing jobs to check against`);
    
    // 🔧 STEP 2: Try multiple search variations to get fresh jobs
    const freshJobs = [];
    let totalSkipped = 0;
    const maxAttempts = 3; // Try different search variations
    
    for (let attempt = 1; attempt <= maxAttempts && freshJobs.length < SEARCH_BUDGET.TARGET_JOBS_TO_SAVE; attempt++) {
      console.log(`🔍 Search attempt ${attempt}/${maxAttempts}...`);
      
      // Vary the search query for each attempt
      const searchQuery = craftVariedSearchQuery(careerProfile, attempt);
      const discoveredJobs = await executeSinglePrecisionSearch(activeJobsDBExtractor, searchQuery, search);
      
      // 🔧 STEP 3: Filter out duplicates BEFORE analysis
      const { fresh, duplicates } = await filterFreshJobs(discoveredJobs, existingJobs, freshJobs);
      
      freshJobs.push(...fresh);
      totalSkipped += duplicates;
      
      console.log(`📊 Attempt ${attempt}: Found ${fresh.length} fresh, skipped ${duplicates} duplicates`);
      
      // Add fresh jobs to existing list for next iteration
      existingJobs.push(...fresh.map(job => ({
        title: job.title,
        company: job.company,
        sourceUrl: job.jobUrl || job.sourceUrl
      })));
      
      if (fresh.length === 0) {
        console.log(`⚠️ No fresh jobs in attempt ${attempt}, trying different search...`);
      }
    }
    
    await search.addReasoningLog(
      'web_search_discovery',
      `OPTIMIZED discovery completed! Found ${freshJobs.length} fresh jobs, avoided ${totalSkipped} duplicates before analysis.`,
      {
        totalJobsFound: freshJobs.length,
        duplicatesSkipped: totalSkipped,
        searchAttempts: maxAttempts,
        careerField: careerProfile.careerDirection || 'General',
        databaseProvider: 'Active Jobs DB',
        optimization: 'Early duplicate detection saved GPT-4o API calls'
      }
    );
    
    return {
      freshJobs: freshJobs.slice(0, SEARCH_BUDGET.TARGET_JOBS_TO_SAVE),
      skippedDuplicates: totalSkipped
    };
    
  } catch (error) {
    console.error('Error in optimized job discovery:', error);
    throw error;
  }
}

// 🔧 GET EXISTING JOBS FOR DUPLICATE CHECK
async function getExistingJobsForDuplicateCheck(userId) {
  try {
    // Get recent jobs (last 30 days) to check against
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const existingJobs = await Job.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    }).select('title company sourceUrl').lean();
    
    return existingJobs.map(job => ({
      title: job.title,
      company: job.company,
      sourceUrl: job.sourceUrl
    }));
  } catch (error) {
    console.error('Error fetching existing jobs for duplicate check:', error);
    return []; // If error, proceed without duplicate check
  }
}

// 🔧 FILTER FRESH JOBS (EARLY DUPLICATE DETECTION)
async function filterFreshJobs(discoveredJobs, existingJobs, alreadyFoundJobs = []) {
  const fresh = [];
  let duplicateCount = 0;
  
  for (const job of discoveredJobs) {
    const isDuplicate = checkIfDuplicate(job, existingJobs, alreadyFoundJobs);
    
    if (isDuplicate) {
      duplicateCount++;
      console.log(`🔍 EARLY SKIP: "${job.title}" at ${job.company} (duplicate detected)`);
    } else {
      fresh.push(job);
      console.log(`✅ FRESH JOB: "${job.title}" at ${job.company} (will analyze)`);
    }
  }
  
  return {
    fresh,
    duplicates: duplicateCount
  };
}

// 🔧 CHECK IF JOB IS DUPLICATE
function checkIfDuplicate(newJob, existingJobs, alreadyFoundJobs = []) {
  const newTitle = newJob.title.toLowerCase().trim();
  const newCompany = newJob.company.toLowerCase().trim();
  const newUrl = newJob.jobUrl || newJob.sourceUrl || '';
  
  // Check against existing jobs in database
  for (const existing of existingJobs) {
    // URL match (most reliable)
    if (newUrl && existing.sourceUrl && newUrl === existing.sourceUrl) {
      return true;
    }
    
    // Title + Company match
    if (newTitle === existing.title.toLowerCase().trim() && 
        newCompany === existing.company.toLowerCase().trim()) {
      return true;
    }
  }
  
  // Check against already found jobs in this search
  for (const found of alreadyFoundJobs) {
    const foundTitle = found.title.toLowerCase().trim();
    const foundCompany = found.company.toLowerCase().trim();
    const foundUrl = found.jobUrl || found.sourceUrl || '';
    
    // URL match
    if (newUrl && foundUrl && newUrl === foundUrl) {
      return true;
    }
    
    // Title + Company match
    if (newTitle === foundTitle && newCompany === foundCompany) {
      return true;
    }
  }
  
  return false;
}

// 🔧 CRAFT VARIED SEARCH QUERIES
function craftVariedSearchQuery(careerProfile, attempt) {
  const primaryTitle = careerProfile.targetJobTitles?.[0] || 'Product Manager';
  let cleanTitle = primaryTitle.trim();
  
  // Vary the search based on attempt
  switch (attempt) {
    case 1:
      // First attempt: Use primary title as-is
      break;
    case 2:
      // Second attempt: Try without seniority level
      cleanTitle = cleanTitle.replace(/^(senior|sr|junior|jr|lead|principal|staff)\s+/i, '').trim();
      break;
    case 3:
      // Third attempt: Try alternative title if available
      if (careerProfile.targetJobTitles?.[1]) {
        cleanTitle = careerProfile.targetJobTitles[1].trim();
      } else {
        // Or try a related title
        cleanTitle = cleanTitle.replace(/manager/i, 'lead').replace(/lead/i, 'manager');
      }
      break;
  }
  
  // Remove duplicate words
  const words = cleanTitle.split(' ');
  const uniqueWords = [...new Set(words)];
  cleanTitle = uniqueWords.join(' ');
  
  console.log(`🎯 Search attempt ${attempt} query: "${cleanTitle}"`);
  
  return {
    jobTitle: cleanTitle,
    location: 'Remote',
    experienceLevel: careerProfile.experienceLevel,
    limit: SEARCH_BUDGET.JOBS_PER_API_CALL,
    remote: true,
    keywords: []
  };
}

// EXECUTE SINGLE PRECISION SEARCH
async function executeSinglePrecisionSearch(extractor, precisionQuery, search) {
  console.log(`🔍 Executing search with query: "${precisionQuery.jobTitle}"...`);
  
  const searchResult = await extractor.searchActiveJobsDB(precisionQuery);
  
  console.log(`📊 Search results: ${searchResult.jobs?.length || 0} jobs from API`);
  
  if (!searchResult.jobs || searchResult.jobs.length === 0) {
    console.log(`⚠️ No jobs found with query: "${precisionQuery.jobTitle}"`);
    return [];
  }
  
  // Return jobs with additional metadata
  const relevantJobs = searchResult.jobs.map(job => ({
    ...job,
    extractedAt: new Date(),
    extractionMethod: 'active_jobs_db_precision',
    contentQuality: job.contentQuality || 'high',
    matchScore: job.relevanceScore || 85,
    budgetEfficient: true,
    searchQuery: precisionQuery.jobTitle
  }));
  
  return relevantJobs;
}

// 🔥 ENHANCED ROLE-SPECIFIC JOB ANALYSIS (Same as before)
async function performEnhancedJobAnalysis(freshJobs, search, careerProfile) {
  const analyzedJobs = [];
  
  console.log(`🔬 Starting ENHANCED analysis of ${freshJobs.length} FRESH jobs with GPT-4o...`);
  console.log(`🎯 No duplicates will be analyzed - saving GPT-4o API costs!`);
  
  for (const job of freshJobs) {
    try {
      console.log(`🤖 Analyzing "${job.title}" at ${job.company} with ENHANCED GPT-4o...`);
      
      // USE THE SAME ENHANCED ANALYSIS AS MANUAL UPLOADS
      const enhancedAnalysis = await jobAnalysisService.analyzeJob(
        job.description || job.fullContent || 'Job description not available',
        {
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary
        },
        {
          isAiDiscovery: true,
          prioritizeCost: false
        }
      );
      
      analyzedJobs.push({
        ...job,
        analysis: enhancedAnalysis,
        analysisError: null,
        enhancedAnalysis: true,
        lightweightAnalysis: false,
        budgetEfficient: true,
        roleSpecificAnalysis: true
      });
      
      await search.addReasoningLog(
        'premium_analysis',
        `"${job.title}" at ${job.company} - ENHANCED analysis complete (FRESH job)`,
        {
          jobTitle: job.title,
          companyName: job.company,
          relevanceScore: job.relevanceScore || 85,
          enhancedAnalysis: true,
          roleSpecificAnalysis: true,
          modelUsed: enhancedAnalysis.analysisMetadata?.model || 'gpt-4o',
          analysisType: enhancedAnalysis.analysisMetadata?.analysisType || 'ai_discovery_role_specific',
          skillsFound: enhancedAnalysis.keySkills?.length || 0,
          technicalRequirements: enhancedAnalysis.technicalRequirements?.length || 0,
          careerField: careerProfile.careerDirection,
          freshJob: true
        }
      );
      
    } catch (error) {
      console.error(`❌ Error in enhanced analysis for ${job.title}:`, error);
      
      // Fallback to lightweight only if enhanced analysis fails
      console.log(`🔄 Falling back to lightweight analysis for ${job.title}...`);
      const lightweightAnalysis = createLightweightAnalysis(job, careerProfile);
      
      analyzedJobs.push({
        ...job,
        analysis: lightweightAnalysis,
        analysisError: error.message,
        enhancedAnalysis: false,
        lightweightAnalysis: true,
        fallbackUsed: true
      });
    }
  }
  
  const enhancedCount = analyzedJobs.filter(job => job.enhancedAnalysis).length;
  const lightweightCount = analyzedJobs.filter(job => job.lightweightAnalysis).length;
  
  console.log(`✅ Analysis complete: ${enhancedCount} enhanced, ${lightweightCount} lightweight fallbacks`);
  
  return analyzedJobs;
}

// CAREER ANALYSIS (Same as before)
async function analyzeCareerForPrecisionTargeting(resumeData) {
  try {
    const currentRole = resumeData.experience?.[0]?.title || '';
    const allRoles = resumeData.experience?.map(exp => exp.title).join(', ') || '';
    const skills = resumeData.skills?.map(skill => typeof skill === 'string' ? skill : skill.name).join(', ') || '';
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      temperature: 0.1,
      messages: [
        {
          role: "system",
content: `Analyze this career profile for PRECISION job targeting:

Current Role: "${currentRole}"
Career History: ${allRoles}
Skills: ${skills}

Return JSON with PRECISION targeting:
{
  "targetJobTitles": [
    "// ONLY clean job titles like 'Product Manager', 'Senior Software Engineer'",
    "// MAX 2 clean titles only"
  ],
  "targetKeywords": [
    "// TOP 3-4 most important skills/technologies only"
  ],
  "experienceLevel": "// entry, junior, mid, senior, lead, principal, executive",
  "careerDirection": "// Brief description of PRIMARY career focus"
}

Keep job titles GENERIC and put specifics in keywords!`
        }
      ]
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const profile = JSON.parse(jsonMatch[0]);
      
      profile.targetJobTitles = (profile.targetJobTitles || []).slice(0, 2);
      profile.targetKeywords = (profile.targetKeywords || []).slice(0, 4);
      
      return {
        ...profile,
        preferredLocations: ['Remote'],
        workArrangement: 'remote'
      };
    }
    
    return createPrecisionFallbackCareerProfile(currentRole, skills);
    
  } catch (error) {
    console.error('Error in precision career analysis:', error);
    return createPrecisionFallbackCareerProfile(
      resumeData.experience?.[0]?.title || 'Professional',
      resumeData.skills?.map(s => typeof s === 'string' ? s : s.name).join(', ') || ''
    );
  }
}

function createPrecisionFallbackCareerProfile(currentRole, skills) {
  const baseRole = currentRole.replace(/^(senior|sr|junior|jr|lead|principal|staff|director|head|chief|vp|vice president)\s+/i, '').trim() || 'Professional';
  const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0).slice(0, 3);
  
  return {
    targetJobTitles: [baseRole],
    targetKeywords: skillsArray.length > 0 ? skillsArray : ['professional', 'experience'],
    experienceLevel: 'mid',
    careerDirection: `${baseRole} career progression`,
    preferredLocations: ['Remote'],
    workArrangement: 'remote'
  };
}

// LIGHTWEIGHT JOB ANALYSIS - FALLBACK ONLY
function createLightweightAnalysis(job, careerProfile) {
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
    workArrangement: ValidationUtils.normalizeWorkArrangement('remote'),
    analysisMetadata: {
      analyzedAt: new Date(),
      algorithmVersion: '6.1-lightweight-fallback',
      analysisType: 'lightweight_fallback_only',
      qualityLevel: 'basic',
      careerField: careerProfile.careerDirection,
      fallback: true
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

// JOB SAVING - OPTIMIZED (No Duplicate Check Since Already Done)
async function saveJobsOptimized(analyzedJobs, userId, searchId, search) {
  let savedCount = 0;
  const maxJobsToSave = SEARCH_BUDGET.TARGET_JOBS_TO_SAVE;
  
  console.log(`💾 Saving ${Math.min(analyzedJobs.length, maxJobsToSave)} FRESH analyzed jobs (no duplicates to check)...`);
  
  for (const jobData of analyzedJobs.slice(0, maxJobsToSave)) {
    try {
      // 🔧 NO DUPLICATE CHECK NEEDED - Already done before analysis
      
      // Validate and normalize data from ENHANCED analysis
      const experienceLevel = ValidationUtils.normalizeExperienceLevel(jobData.analysis?.experienceLevel || 'mid');
      const workArrangement = ValidationUtils.normalizeWorkArrangement(jobData.analysis?.workArrangement || 'unknown');
      const normalizedSkills = ValidationUtils.validateAndNormalizeSkills(jobData.analysis?.keySkills || []);
      
      // Determine analysis quality
      const isEnhanced = jobData.enhancedAnalysis === true;
      const analysisType = isEnhanced ? 'ai_discovery_role_specific_enhanced' : 'ai_discovery_lightweight_fallback';
      const modelUsed = isEnhanced ? (jobData.analysis?.analysisMetadata?.model || 'gpt-4o') : 'lightweight-fallback';
      const qualityLevel = isEnhanced ? 'premium' : 'basic';
      
      // Create job record with ENHANCED analysis data
      const job = new Job({
        userId,
        title: jobData.title,
        company: jobData.company,
        location: parseLocation(jobData.location),
        description: jobData.fullContent || jobData.description || 'Job description not available',
        sourceUrl: jobData.jobUrl || jobData.sourceUrl,
        sourcePlatform: createValidActiveJobsDBSourcePlatform(jobData.sourcePlatform),
        isAiGenerated: true,
        applicationStatus: 'NOT_APPLIED',
        aiSearchId: searchId,
        salary: jobData.salary || {},
        jobType: jobData.jobType || 'FULL_TIME',
        
        analysisStatus: {
          status: 'completed',
          progress: 100,
          message: isEnhanced 
            ? `ENHANCED analysis complete! Found ${normalizedSkills.length} skills with ${modelUsed} (Fresh job, no duplicate).`
            : `Analysis complete with fallback method. Found ${normalizedSkills.length} skills.`,
          updatedAt: new Date(),
          completedAt: new Date(),
          canViewJob: true,
          skillsFound: normalizedSkills.length,
          experienceLevel: experienceLevel,
          modelUsed: modelUsed,
          analysisType: analysisType,
          searchApproach: '3-phase-intelligent-adzuna-api',
          qualityLevel: qualityLevel,
          enhancedAnalysis: isEnhanced,
          roleSpecificAnalysis: isEnhanced,
          sameQualityAsManual: isEnhanced,
          optimizedSearch: true,
          freshJob: true
        },
        
        // ENHANCED PARSED DATA from role-specific analysis
        parsedData: {
          requirements: jobData.analysis?.requirements || [],
          responsibilities: jobData.analysis?.responsibilities || [],
          qualifications: jobData.analysis?.qualifications || { required: [], preferred: [] },
          benefits: jobData.analysis?.benefits || [],
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
          extractionMethod: isEnhanced ? 'enhanced_role_specific_analysis' : 'lightweight_fallback',
          
          // ENHANCED: Technical requirements and tools from role-specific analysis
          technicalRequirements: jobData.analysis?.technicalRequirements || [],
          toolsAndTechnologies: jobData.analysis?.toolsAndTechnologies || [],
          companyStage: jobData.analysis?.companyStage || 'unknown',
          department: jobData.analysis?.department || 'unknown',
          roleLevel: jobData.analysis?.roleLevel || 'individual-contributor',
          
          // Active Jobs DB specific data
          activeJobsDBData: {
            platform: jobData.sourcePlatform,
            originalUrl: jobData.jobUrl,
            postedDate: jobData.postedDate,
            activeJobsDBId: jobData.activeJobsDBData?.id,
            category: jobData.activeJobsDBData?.category,
            discoveryMethod: 'optimized_fresh_targeting',
            isDirectEmployer: jobData.isDirectEmployer || false,
            company_url: jobData.activeJobsDBData?.company_url,
            apply_url: jobData.activeJobsDBData?.apply_url,
            remote: jobData.activeJobsDBData?.remote,
            enhancedAnalysis: isEnhanced,
            searchQuery: jobData.searchQuery
          },
          
          // ENHANCED: Analysis metadata from role-specific analysis
          analysisMetadata: jobData.analysis?.analysisMetadata || {
            analyzedAt: new Date(),
            algorithmVersion: '6.1-optimized-fresh-jobs',
            analysisType: analysisType,
            qualityLevel: qualityLevel,
            enhancedAnalysis: isEnhanced,
            roleSpecificAnalysis: isEnhanced,
            model: modelUsed,
            fallback: !isEnhanced,
            freshJob: true,
            optimizedDiscovery: true
          }
        },
        
        aiSearchMetadata: {
          searchScore: jobData.relevanceScore || 85,
          discoveryMethod: 'optimized_fresh_targeting',
          extractionSuccess: !jobData.analysisError,
          contentQuality: jobData.contentQuality || 'high',
          premiumAnalysis: isEnhanced,
          intelligentDiscovery: true,
          activeJobsDBDiscovery: true,
          enhancedAnalysis: isEnhanced,
          roleSpecificAnalysis: isEnhanced,
          sameQualityAsManual: isEnhanced,
          phase: 'optimized-fresh-job-targeting',
          originalPlatform: jobData.sourcePlatform,
          relevanceScore: jobData.relevanceScore || 85,
          isDirectEmployer: jobData.isDirectEmployer || false,
          freshJob: true,
          optimizedSearch: true,
          
          // Enhanced analysis metadata
          enhancedMetadata: {
            analysisModel: modelUsed,
            analysisType: analysisType,
            qualityLevel: qualityLevel,
            enhancedAnalysis: isEnhanced,
            technicalRequirementsFound: jobData.analysis?.technicalRequirements?.length || 0,
            toolsAndTechnologiesFound: jobData.analysis?.toolsAndTechnologies?.length || 0,
            roleCategory: jobData.analysis?.roleCategory || 'general',
            industryContext: jobData.analysis?.industryContext || 'general',
            fallbackUsed: jobData.fallbackUsed || false,
            freshJob: true,
            searchQuery: jobData.searchQuery
          },
          
          // Active Jobs DB specific metadata
          activeJobsDBMetadata: {
            discoveryMethod: 'optimized_fresh_targeting',
            apiProvider: 'active_jobs_db',
            premiumDatabaseAccess: true,
            directEmployerLinks: jobData.isDirectEmployer || false,
            enhancedAnalysis: isEnhanced,
            optimizedSearch: true,
            freshJob: true
          }
        }
      });
      
      await job.save();
      savedCount++;
      
      // Update search progress
      await AiJobSearch.findByIdAndUpdate(searchId, {
        $inc: { jobsFoundToday: 1, totalJobsFound: 1 },
        $push: {
          jobsFound: {
            jobId: job._id,
            title: job.title,
            company: job.company,
            foundAt: new Date(),
            extractionMethod: isEnhanced ? 'enhanced_role_specific_analysis' : 'lightweight_fallback',
            contentQuality: jobData.contentQuality || 'high',
            matchScore: jobData.relevanceScore || 85,
            premiumAnalysis: isEnhanced,
            enhancedAnalysis: isEnhanced,
            roleSpecificAnalysis: isEnhanced,
            sourcePlatform: jobData.sourcePlatform,
            relevanceScore: jobData.relevanceScore || 85,
            apiSource: 'active_jobs_db',
            modelUsed: modelUsed,
            sameQualityAsManual: isEnhanced,
            freshJob: true,
            optimizedSearch: true,
            searchQuery: jobData.searchQuery
          }
        }
      });
      
      const qualityIndicator = isEnhanced ? '🔥 ENHANCED' : '🔄 FALLBACK';
      console.log(`✅ ${qualityIndicator} FRESH: ${job.title} at ${job.company} (${modelUsed}, Score: ${jobData.relevanceScore || 85}%) [${savedCount}/${maxJobsToSave}]`);
      
    } catch (error) {
      console.error(`❌ ERROR saving fresh job ${jobData.title}:`, error);
    }
  }
  
  console.log(`💾 Optimized job saving completed: ${savedCount} FRESH jobs saved`);
  
  return savedCount;
}

// UTILITY FUNCTIONS
function parseLocation(locationString) {
  if (!locationString) return { remote: true };
  
  const lower = locationString.toLowerCase();
  if (lower.includes('remote')) {
    return { remote: true, city: null, country: 'USA' };
  }
  
  const parts = locationString.split(',').map(p => p.trim());
  return {
    city: parts[0] || null,
    state: parts[1] || null,
    country: parts[2] || 'USA',
    remote: false
  };
}

function createValidActiveJobsDBSourcePlatform(originalPlatform) {
  if (!originalPlatform) return 'ACTIVE_JOBS_DB_DIRECT';
  
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
  
  return 'ACTIVE_JOBS_DB_OTHER';
}

function extractSearchCriteria(resumeData) {
  return {
    jobTitle: resumeData.experience?.[0]?.title || 'Professional',
    skills: resumeData.skills?.slice(0, 10).map(s => typeof s === 'string' ? s : s.name) || [],
    location: resumeData.contactInfo?.location || 'Remote',
    experienceLevel: 'Mid'
  };
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

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// EXISTING EXPORTS - UPDATED FOR OPTIMIZED SEARCH
exports.getUserAiSearches = async (userId) => {
  return await AiJobSearch.find({ userId }).sort({ createdAt: -1 });
};

exports.pauseAiSearch = async (userId, searchId) => {
  const search = await AiJobSearch.findOne({ _id: searchId, userId });
  if (!search) throw new Error('Search not found');
  
  await search.addReasoningLog(
    'completion',
    'Optimized AI search paused by user request - early duplicate detection preserved',
    { 
      phase: 'user_pause', 
      pausedAt: new Date(), 
      optimizedSearch: true,
      duplicateDetection: 'Early detection enabled'
    }
  );
  
  search.status = 'paused';
  search.lastUpdateMessage = 'Paused by user - optimized search preserved';
  await search.save();
  
  return { message: 'Optimized AI search paused successfully' };
};

exports.resumeAiSearch = async (userId, searchId) => {
  const search = await AiJobSearch.findOne({ _id: searchId, userId });
  if (!search) throw new Error('Search not found');
  
  await search.addReasoningLog(
    'initialization',
    'Optimized AI search resumed by user - continuing with early duplicate detection',
    { 
      phase: 'user_resume', 
      resumedAt: new Date(),
      searchMethod: 'Optimized AI discovery with duplicate prevention',
      analysisQuality: 'Premium GPT-4o analysis (fresh jobs only)'
    }
  );
  
  search.status = 'running';
  search.lastUpdateMessage = 'Resumed by user - optimized approach';
  await search.save();
  
  const resume = await Resume.findById(search.resumeId);
  if (resume) {
    performOptimizedSearch(searchId, userId, resume).catch(error => {
      console.error('Error resuming optimized search:', error);
    });
  }
  
  return { message: 'Optimized AI search resumed successfully' };
};

exports.deleteAiSearch = async (userId, searchId) => {
  const search = await AiJobSearch.findOne({ _id: searchId, userId });
  if (!search) throw new Error('Search not found');
  
  await search.addReasoningLog(
    'completion',
    'Optimized AI search cancelled by user request',
    { 
      phase: 'user_cancellation', 
      cancelledAt: new Date(),
      searchMethod: 'Optimized AI discovery with duplicate prevention',
      analysisQuality: 'Premium GPT-4o analysis'
    }
  );
  
  search.status = 'cancelled';
  search.lastUpdateMessage = 'Cancelled by user - optimized approach';
  await search.save();
  
  return { message: 'Optimized AI search cancelled successfully' };
};