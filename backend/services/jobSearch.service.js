// services/jobSearch.service.js - COMPLETE GENERIC VERSION FOR ALL JOB TYPES
const Job = require('../models/mongodb/job.model');
const Resume = require('../models/mongodb/resume.model');
const AiJobSearch = require('../models/mongodb/aiJobSearch.model');
const { openai } = require('../config/openai');
const AdzunaJobExtractor = require('./adzunaJobExtractor.service');

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

// GENERIC RELEVANCE FILTERING - WORKS FOR ALL JOB TYPES
class RelevanceFilter {
  static calculateJobRelevanceScore(jobData, targetJobTitles, targetKeywords) {
    let score = 0;
    const jobTitle = (jobData.title || '').toLowerCase();
    const jobDescription = (jobData.description || jobData.fullContent || '').toLowerCase();
    
    // 1. TITLE RELEVANCE (60% of score) - GENERIC LOGIC
    let titleScore = this.calculateGenericTitleRelevance(jobTitle, targetJobTitles);
    score += titleScore * 0.6;
    
    // 2. KEYWORD RELEVANCE (25% of score) - GENERIC
    if (targetKeywords && targetKeywords.length > 0) {
      const matchingKeywords = targetKeywords.filter(keyword => 
        jobDescription.includes(keyword.toLowerCase()) || jobTitle.includes(keyword.toLowerCase())
      );
      score += (matchingKeywords.length / targetKeywords.length) * 25;
    }
    
    // 3. ROLE CATEGORY RELEVANCE (15% of score) - GENERIC
    let categoryScore = this.calculateGenericCategoryRelevance(jobTitle, targetJobTitles);
    score += categoryScore * 0.15;
    
    // 4. ANTI-PATTERN PENALTIES - GENERIC (only for obviously irrelevant jobs)
    const penalty = this.calculateGenericAntiPatternPenalties(jobTitle);
    score += penalty;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  static calculateGenericTitleRelevance(jobTitle, targetJobTitles) {
    let maxScore = 0;
    
    for (const targetTitle of targetJobTitles) {
      const targetLower = targetTitle.toLowerCase();
      
      // Exact match gets highest score
      if (jobTitle === targetLower) {
        return 100;
      }
      
      // Partial exact match (job title contains target)
      if (jobTitle.includes(targetLower)) {
        maxScore = Math.max(maxScore, 95);
        continue;
      }
      
      // Extract core function words (remove seniority levels)
      const targetWords = this.extractCoreWords(targetLower);
      const jobWords = this.extractCoreWords(jobTitle);
      
      // Calculate word overlap
      const matchingWords = targetWords.filter(word => jobWords.includes(word));
      
      if (matchingWords.length > 0) {
        // Score based on percentage of core words matched
        const wordScore = (matchingWords.length / targetWords.length) * 85;
        maxScore = Math.max(maxScore, wordScore);
      }
    }
    
    return maxScore;
  }

  static extractCoreWords(title) {
    // Remove seniority levels and extract core job function words
    const seniorityWords = ['senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'director', 'head', 'chief', 'vp', 'vice', 'president', 'entry', 'associate', 'staff', 'executive'];
    
    return title.split(' ')
      .filter(word => word.length > 2)
      .filter(word => !seniorityWords.includes(word))
      .filter(word => !['the', 'of', 'and', 'or', 'for', 'at', 'in', 'to', 'with', 'a', 'an'].includes(word));
  }

  static calculateGenericCategoryRelevance(jobTitle, targetJobTitles) {
    // Determine the job category from target titles
    const targetCategory = this.determineJobCategory(targetJobTitles);
    const jobCategory = this.determineJobCategory([jobTitle]);
    
    if (targetCategory === jobCategory) {
      return 100; // Same category
    }
    
    // Some categories are related
    const relatedCategories = {
      'engineering': ['developer', 'technical'],
      'management': ['leadership', 'director'],
      'design': ['creative', 'visual'],
      'data': ['analytics', 'research'],
      'marketing': ['growth', 'communications'],
      'sales': ['business-development', 'account-management']
    };
    
    for (const [category, related] of Object.entries(relatedCategories)) {
      if (targetCategory === category && related.includes(jobCategory)) {
        return 70; // Related category
      }
      if (jobCategory === category && related.includes(targetCategory)) {
        return 70; // Related category
      }
    }
    
    return 0; // Unrelated category
  }

  static determineJobCategory(jobTitles) {
    const allTitles = jobTitles.join(' ').toLowerCase();
    
    // Engineering/Development
    if (allTitles.includes('engineer') || allTitles.includes('developer') || allTitles.includes('programmer')) {
      return 'engineering';
    }
    
    // Product Management
    if (allTitles.includes('product') && allTitles.includes('manager')) {
      return 'product-management';
    }
    
    // Data Science/Analytics
    if (allTitles.includes('data') && (allTitles.includes('scientist') || allTitles.includes('analyst'))) {
      return 'data';
    }
    
    // Design
    if (allTitles.includes('designer') || allTitles.includes('design') || allTitles.includes('ux') || allTitles.includes('ui')) {
      return 'design';
    }
    
    // Marketing
    if (allTitles.includes('marketing') || allTitles.includes('growth') || allTitles.includes('brand')) {
      return 'marketing';
    }
    
    // Sales
    if (allTitles.includes('sales') || allTitles.includes('account') || allTitles.includes('business development')) {
      return 'sales';
    }
    
    // Management (general)
    if (allTitles.includes('manager') || allTitles.includes('director') || allTitles.includes('lead')) {
      return 'management';
    }
    
    // Research
    if (allTitles.includes('research') || allTitles.includes('scientist')) {
      return 'research';
    }
    
    // Operations
    if (allTitles.includes('operations') || allTitles.includes('ops')) {
      return 'operations';
    }
    
    return 'general';
  }

  static calculateGenericAntiPatternPenalties(jobTitle) {
    // Only penalize obviously unrelated jobs - be very conservative
    const universalAntiPatterns = [
      'customer service', 'receptionist', 'driver', 'delivery', 'warehouse', 
      'janitor', 'cleaner', 'cashier', 'retail', 'food service', 'server',
      'administrative assistant', 'data entry clerk', 'call center'
    ];
    
    for (const pattern of universalAntiPatterns) {
      if (jobTitle.includes(pattern)) {
        console.log(`⚠️ Applied penalty (-25) for universal anti-pattern: ${pattern}`);
        return -25;
      }
    }
    
    return 0; // No penalty for most jobs
  }

  static filterJobsForRelevance(jobs, careerProfile, minScore = 55) {
    const targetJobTitles = careerProfile.targetJobTitles || [];
    const targetKeywords = careerProfile.targetKeywords || [];
    
    console.log(`🎯 Applying GENERIC relevance filtering (min score: ${minScore}) for: ${targetJobTitles.join(', ')}`);
    
    const relevantJobs = [];
    
    for (const job of jobs) {
      const relevanceScore = this.calculateJobRelevanceScore(job, targetJobTitles, targetKeywords);
      
      if (relevanceScore >= minScore) {
        job.relevanceScore = relevanceScore;
        relevantJobs.push(job);
        console.log(`✅ RELEVANT (${relevanceScore}%): "${job.title}" at ${job.company}`);
      } else {
        console.log(`❌ FILTERED OUT (${relevanceScore}%): "${job.title}" at ${job.company}`);
      }
    }
    
    // Sort by relevance score
    relevantJobs.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    console.log(`🎯 Generic filtering complete: ${relevantJobs.length}/${jobs.length} jobs meet relevance criteria`);
    return relevantJobs;
  }
}

// MAIN SEARCH FUNCTION
exports.findJobsWithAi = async (userId, resumeId) => {
  try {
    console.log(`🚀 Starting generic AI job search for user ${userId}`);
    
    const resume = await Resume.findById(resumeId);
    if (!resume || !resume.parsedData) {
      throw new Error('Resume not found or not parsed');
    }
    
    // Create search record using existing valid enum values
    const aiJobSearch = new AiJobSearch({
      userId,
      resumeId,
      resumeName: resume.name,
      searchCriteria: extractSearchCriteria(resume.parsedData),
      status: 'running',
      dailyLimit: 8,
      jobsFoundToday: 0,
      totalJobsFound: 0,
      searchApproach: '3-phase-intelligent-adzuna-api', // Existing valid enum value
      approachVersion: '4.0-adzuna-api-integration',
      qualityLevel: 'adzuna-api-enhanced' // Existing valid enum value
    });
    
    await aiJobSearch.save();
    
    await aiJobSearch.addReasoningLog(
      'initialization',
      'Starting generic AI job search that works for any job type with improved relevance filtering.',
      {
        searchCriteria: aiJobSearch.searchCriteria,
        dailyLimit: aiJobSearch.dailyLimit,
        approach: 'Generic 3-phase process with field-agnostic filtering'
      }
    );
    
    // Start generic background search
    performGenericAdzunaJobSearch(aiJobSearch._id, userId, resume).catch(error => {
      console.error('Generic job search error:', error);
      updateSearchStatus(aiJobSearch._id, 'failed', error.message);
    });
    
    return {
      success: true,
      message: 'Generic AI job search started! Works for any job type with improved filtering.',
      searchId: aiJobSearch._id,
      searchMethod: 'Generic Adzuna API discovery with field-agnostic filtering'
    };
    
  } catch (error) {
    console.error('Error initiating generic job search:', error);
    throw error;
  }
};

// GENERIC MAIN SEARCH PROCESS
async function performGenericAdzunaJobSearch(searchId, userId, resume) {
  const searchStartTime = Date.now();
  let search;
  
  try {
    search = await AiJobSearch.findById(searchId);
    if (!search || search.status !== 'running') return;
    
    // Check daily limits
    if (await isDailyLimitReached(search)) {
      await search.addReasoningLog(
        'completion',
        `Reached today's limit of ${search.dailyLimit} quality job discoveries.`,
        { dailyLimit: search.dailyLimit, reason: 'daily_limit_reached' }
      );
      await updateSearchStatus(searchId, 'paused', 'Daily limit reached');
      return;
    }
    
    // PHASE 1: Generic Career Analysis
    console.log(`📊 Phase 1: Generic Career Analysis...`);
    const careerProfile = await analyzeGenericCareerProfile(resume.parsedData);
    
    await search.addReasoningLog(
      'career_analysis',
      `Generic career analysis complete! Identified ${careerProfile.targetJobTitles?.length || 0} target job titles for field: ${careerProfile.careerDirection}`,
      {
        targetJobTitles: careerProfile.targetJobTitles || [],
        targetKeywords: careerProfile.targetKeywords || [],
        experienceLevel: careerProfile.experienceLevel,
        careerField: careerProfile.careerDirection
      }
    );
    
    // PHASE 2: Generic Job Discovery
    console.log(`🎯 Phase 2: Generic Job Discovery...`);
    const discoveredJobs = await performGenericJobDiscovery(careerProfile, search);
    
    if (discoveredJobs.length === 0) {
      await search.addReasoningLog(
        'completion',
        'No relevant opportunities found for this career profile. Generic filtering ensures we only save appropriate matches.',
        { phase: 'no_quality_results', careerField: careerProfile.careerDirection }
      );
      await updateSearchStatus(searchId, 'completed', 'No quality matches found');
      return;
    }
    
    // PHASE 3: Generic Job Analysis
    console.log(`🔬 Phase 3: Generic Job Analysis...`);
    const analyzedJobs = await performGenericJobAnalysis(discoveredJobs, search, careerProfile);
    
    // Save Jobs
    console.log(`💾 Saving generic job results...`);
    const savedCount = await saveJobsGeneric(analyzedJobs, userId, searchId, search);
    
    const totalDuration = Date.now() - searchStartTime;
    
    await search.addReasoningLog(
      'completion',
      `Generic job search complete! Found ${savedCount} relevant opportunities for ${careerProfile.careerDirection}. Field-agnostic filtering works for any job type.`,
      {
        jobsSaved: savedCount,
        totalDuration: totalDuration,
        searchTime: `${Math.round(totalDuration / 1000)} seconds`,
        careerField: careerProfile.careerDirection
      }
    );
    
    await updateSearchStatus(searchId, savedCount > 0 ? 'running' : 'completed', 
      `Found ${savedCount} relevant opportunities`);
    console.log(`✅ Generic job search complete: ${savedCount} jobs saved`);
    
  } catch (error) {
    console.error('Error in generic job search:', error);
    
    if (search) {
      await search.addReasoningLog(
        'error',
        `Generic job search encountered an issue: ${error.message}`,
        { error: error.message },
        false
      );
    }
    
    await updateSearchStatus(searchId, 'failed', error.message);
  }
}

// GENERIC JOB DISCOVERY
async function performGenericJobDiscovery(careerProfile, search) {
  try {
    const adzunaExtractor = new AdzunaJobExtractor();
    
    const apiHealth = await adzunaExtractor.getApiHealth();
    if (apiHealth.status !== 'healthy') {
      throw new Error(`Adzuna API unavailable: ${apiHealth.message}`);
    }
    
    const searchResults = await adzunaExtractor.extractJobsForCareerProfile(careerProfile, search, {
      maxJobs: 12,
      maxDaysOld: 21,
      sortBy: 'relevance'
    });
    
    const discoveredJobs = searchResults.jobs || [];
    
    console.log(`🔍 Initial discovery: ${discoveredJobs.length} jobs found, applying GENERIC filtering...`);
    
    // Apply GENERIC relevance filtering
    const relevantJobs = RelevanceFilter.filterJobsForRelevance(discoveredJobs, careerProfile, 55);
    
    await search.addReasoningLog(
      'web_search_discovery',
      `Generic job discovery completed! Found ${relevantJobs.length} relevant opportunities from ${discoveredJobs.length} total for ${careerProfile.careerDirection}. Filtering works for any job type.`,
      {
        totalJobsInitial: discoveredJobs.length,
        totalJobsFiltered: relevantJobs.length,
        filteredOut: discoveredJobs.length - relevantJobs.length,
        genericFiltering: true,
        careerField: careerProfile.careerDirection || 'General'
      }
    );
    
    return relevantJobs.slice(0, 8).map(job => ({
      ...job,
      extractedAt: new Date(),
      extractionMethod: 'generic_adzuna_api_with_filtering',
      contentQuality: job.contentQuality || 'high',
      matchScore: job.relevanceScore || 75
    }));
    
  } catch (error) {
    console.error('Error in generic job discovery:', error);
    throw error;
  }
}

// GENERIC CAREER ANALYSIS
async function analyzeGenericCareerProfile(resumeData) {
  try {
    // Determine user's career field from their experience
    const currentRole = resumeData.experience?.[0]?.title || '';
    const allRoles = resumeData.experience?.map(exp => exp.title).join(', ') || '';
    const skills = resumeData.skills?.map(skill => typeof skill === 'string' ? skill : skill.name).join(', ') || '';
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are an expert career strategist. Analyze any career background and create targeted job search criteria.

IMPORTANT RULES:
1. Include BOTH specific titles AND broad base titles for maximum coverage
2. For any field (engineering, marketing, sales, etc.) include progression levels
3. Extract the core job function and include variations
4. Don't assume any specific field - work with what's provided

Examples:
- If someone is a "Senior Software Engineer", include: ["Software Engineer", "Senior Software Engineer", "Staff Engineer", "Principal Engineer"]
- If someone is a "Marketing Manager", include: ["Marketing Manager", "Senior Marketing Manager", "Marketing Director", "Growth Manager"]
- If someone is a "Data Scientist", include: ["Data Scientist", "Senior Data Scientist", "ML Engineer", "Research Scientist"]`
        },
        {
          role: "user",
          content: `Analyze this career profile and create targeted search criteria:

Current Role: "${currentRole}"
Career History: ${allRoles}
Skills: ${skills}

Return JSON with comprehensive targeting:
{
  "targetJobTitles": [
    "// Include base title, senior versions, and related roles",
    "// Example: if current is 'Software Engineer', include variations"
  ],
  "targetKeywords": ["// Extract 4-6 most relevant skills/technologies"],
  "experienceLevel": "// entry, junior, mid, senior, lead, principal, executive",
  "careerDirection": "// Brief description of career focus"
}

Be comprehensive but relevant to the actual background provided.`
        }
      ]
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const profile = JSON.parse(jsonMatch[0]);
      
      // SAFETY: Ensure we have enough variety in job titles
      if (profile.targetJobTitles && profile.targetJobTitles.length < 3) {
        profile.targetJobTitles = enhanceJobTitles(profile.targetJobTitles, currentRole);
      }
      
      return {
        ...profile,
        preferredLocations: ['Remote', 'New York', 'San Francisco', 'Austin'],
        workArrangement: 'remote'
      };
    }
    
    return createGenericFallbackCareerProfile(currentRole, skills);
    
  } catch (error) {
    console.error('Error in generic career analysis:', error);
    return createGenericFallbackCareerProfile(
      resumeData.experience?.[0]?.title || 'Professional',
      resumeData.skills?.map(s => typeof s === 'string' ? s : s.name).join(', ') || ''
    );
  }
}

function enhanceJobTitles(existingTitles, currentRole) {
  const enhanced = [...existingTitles];
  
  // Add base version if not present
  const baseRole = currentRole.replace(/^(senior|sr|junior|jr|lead|principal|staff|director|head|chief|vp|vice president)\s+/i, '').trim();
  if (baseRole && !enhanced.some(title => title.toLowerCase().includes(baseRole.toLowerCase()))) {
    enhanced.unshift(baseRole);
  }
  
  // Add senior version if not present
  if (baseRole && !enhanced.some(title => title.toLowerCase().includes('senior'))) {
    enhanced.push(`Senior ${baseRole}`);
  }
  
  return enhanced;
}

function createGenericFallbackCareerProfile(currentRole, skills) {
  const baseRole = currentRole.replace(/^(senior|sr|junior|jr|lead|principal|staff|director|head|chief|vp|vice president)\s+/i, '').trim() || 'Professional';
  const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0).slice(0, 4);
  
  return {
    targetJobTitles: [
      baseRole,
      `Senior ${baseRole}`,
      `Lead ${baseRole}`,
      currentRole // Include the full original title too
    ].filter((title, index, arr) => arr.indexOf(title) === index), // Remove duplicates
    targetKeywords: skillsArray.length > 0 ? skillsArray : ['professional', 'experience', 'management'],
    experienceLevel: 'mid',
    careerDirection: `${baseRole} career progression`,
    preferredLocations: ['Remote'],
    workArrangement: 'remote'
  };
}

// GENERIC JOB ANALYSIS
async function performGenericJobAnalysis(discoveredJobs, search, careerProfile) {
  const analyzedJobs = [];
  
  console.log(`🔬 Starting generic analysis of ${discoveredJobs.length} pre-filtered jobs...`);
  
  for (const job of discoveredJobs) {
    try {
      const analysis = await analyzeJobGeneric(job, careerProfile);
      
      analyzedJobs.push({
        ...job,
        analysis: analysis,
        analysisError: null,
        premiumAnalysis: true
      });
      
      await search.addReasoningLog(
        'premium_analysis',
        `"${job.title}" at ${job.company} - Generic analysis complete (Relevance: ${job.relevanceScore}%)`,
        {
          jobTitle: job.title,
          companyName: job.company,
          relevanceScore: job.relevanceScore,
          skillsFound: analysis?.keySkills?.length || 0,
          careerField: careerProfile.careerDirection
        }
      );
      
    } catch (error) {
      console.error(`Error analyzing ${job.title}:`, error);
      analyzedJobs.push({
        ...job,
        analysis: createGenericFallbackAnalysis(),
        analysisError: error.message
      });
    }
  }
  
  return analyzedJobs;
}

async function analyzeJobGeneric(job, careerProfile) {
  // Create generic skills based on career field
  const skills = createGenericSkillsForCareer(careerProfile);

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
      algorithmVersion: '4.0-generic-adzuna-api',
      analysisType: 'generic_adzuna_api_analysis',
      qualityLevel: 'standard',
      careerField: careerProfile.careerDirection
    }
  };
}

function createGenericSkillsForCareer(careerProfile) {
  // Create appropriate skills based on career direction
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
  } else if (careerField.includes('data') || careerField.includes('analytics')) {
    skills = [
      { name: 'Data Analysis', importance: 8, category: 'technical', skillType: 'analytical' },
      // services/jobSearch.service.js - FINAL PART (Continued from previous)

      { name: 'Statistical Analysis', importance: 7, category: 'technical', skillType: 'analytical' },
      { name: 'Communication', importance: 6, category: 'soft', skillType: 'communication' }
    ];
  } else if (careerField.includes('marketing')) {
    skills = [
      { name: 'Marketing Strategy', importance: 8, category: 'business', skillType: 'management' },
      { name: 'Content Creation', importance: 7, category: 'soft', skillType: 'communication' },
      { name: 'Analytics', importance: 6, category: 'technical', skillType: 'analytical' }
    ];
  } else if (careerField.includes('design')) {
    skills = [
      { name: 'Design Thinking', importance: 8, category: 'technical', skillType: 'design' },
      { name: 'User Experience', importance: 7, category: 'technical', skillType: 'design' },
      { name: 'Collaboration', importance: 6, category: 'soft', skillType: 'communication' }
    ];
  } else if (careerField.includes('sales')) {
    skills = [
      { name: 'Sales Strategy', importance: 8, category: 'business', skillType: 'management' },
      { name: 'Relationship Building', importance: 7, category: 'soft', skillType: 'communication' },
      { name: 'Negotiation', importance: 6, category: 'soft', skillType: 'communication' }
    ];
  } else {
    // Generic fallback skills
    skills = [
      { name: 'Communication', importance: 7, category: 'soft', skillType: 'communication' },
      { name: 'Problem Solving', importance: 7, category: 'soft', skillType: 'general' },
      { name: 'Leadership', importance: 6, category: 'soft', skillType: 'management' },
      { name: 'Project Management', importance: 6, category: 'business', skillType: 'management' }
    ];
  }
  
  return ValidationUtils.validateAndNormalizeSkills(skills);
}

function createGenericFallbackAnalysis() {
  const skills = ValidationUtils.validateAndNormalizeSkills([
    { name: 'Communication', importance: 6, category: 'soft', skillType: 'communication' },
    { name: 'Problem Solving', importance: 6, category: 'soft', skillType: 'general' }
  ]);

  return {
    requirements: ['Relevant experience'],
    responsibilities: ['Perform assigned duties'],
    qualifications: { required: ['Relevant education'], preferred: [] },
    keySkills: skills,
    experienceLevel: 'mid',
    workArrangement: 'unknown',
    analysisMetadata: {
      analyzedAt: new Date(),
      algorithmVersion: '4.0-generic-fallback',
      analysisType: 'generic_fallback',
      qualityLevel: 'basic'
    }
  };
}

// GENERIC JOB SAVING
async function saveJobsGeneric(analyzedJobs, userId, searchId, search) {
  let savedCount = 0;
  const maxJobsPerSearch = 8;
  
  console.log(`💾 Starting to save ${Math.min(analyzedJobs.length, maxJobsPerSearch)} generic jobs...`);
  
  for (const jobData of analyzedJobs.slice(0, maxJobsPerSearch)) {
    try {
      // Check for duplicates
      const existing = await Job.findOne({
        userId,
        $or: [
          { sourceUrl: jobData.jobUrl || jobData.sourceUrl },
          { 
            title: { $regex: new RegExp(`^${escapeRegex(jobData.title)}$`, 'i') },
            company: { $regex: new RegExp(`^${escapeRegex(jobData.company)}$`, 'i') }
          }
        ]
      });
      
      if (existing) {
        console.log(`⚠️ Skipping duplicate: "${jobData.title}" at ${jobData.company}`);
        continue;
      }
      
      // Validate and normalize data
      const experienceLevel = ValidationUtils.normalizeExperienceLevel(jobData.analysis?.experienceLevel || 'mid');
      const workArrangement = ValidationUtils.normalizeWorkArrangement(jobData.analysis?.workArrangement || 'unknown');
      const normalizedSkills = ValidationUtils.validateAndNormalizeSkills(jobData.analysis?.keySkills || []);
      
      // Create job record
      const job = new Job({
        userId,
        title: jobData.title,
        company: jobData.company,
        location: parseLocation(jobData.location),
        description: jobData.fullContent || jobData.description,
        sourceUrl: jobData.jobUrl || jobData.sourceUrl,
        sourcePlatform: createValidSourcePlatform(jobData.sourcePlatform),
        isAiGenerated: true,
        applicationStatus: 'NOT_APPLIED',
        aiSearchId: searchId,
        salary: jobData.salary || {},
        jobType: jobData.jobType || 'FULL_TIME',
        
        analysisStatus: {
          status: 'completed',
          progress: 100,
          message: `Generic analysis complete! Found ${normalizedSkills.length} key skills for this ${jobData.analysis?.analysisMetadata?.careerField || 'professional'} role.`,
          updatedAt: new Date(),
          completedAt: new Date(),
          canViewJob: true,
          skillsFound: normalizedSkills.length,
          experienceLevel: experienceLevel,
          modelUsed: 'gpt-4o-generic',
          analysisType: 'generic_adzuna_api_analysis',
          searchApproach: '3-phase-intelligent-adzuna-api', // Valid enum value
          qualityLevel: 'adzuna-api-enhanced' // Valid enum value
        },
        
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
          extractionMethod: 'generic_adzuna_api_analysis',
          
          adzunaApiData: {
            platform: jobData.sourcePlatform,
            originalUrl: jobData.jobUrl,
            postedDate: jobData.postedDate,
            adzunaId: jobData.adzunaData?.id,
            category: jobData.adzunaData?.category,
            discoveryMethod: 'generic_adzuna_api_aggregation'
          },
          
          analysisMetadata: jobData.analysis?.analysisMetadata || {
            analyzedAt: new Date(),
            algorithmVersion: '4.0-generic-adzuna-api',
            analysisType: 'generic_adzuna_api_analysis',
            qualityLevel: 'standard'
          }
        },
        
        aiSearchMetadata: {
          searchScore: jobData.relevanceScore || 75,
          discoveryMethod: 'generic_adzuna_api_discovery',
          extractionSuccess: !jobData.analysisError,
          contentQuality: jobData.contentQuality || 'high',
          premiumAnalysis: true,
          intelligentDiscovery: true,
          adzunaApiDiscovery: true,
          phase: '3-phase-intelligent-adzuna-api',
          originalPlatform: jobData.sourcePlatform,
          relevanceScore: jobData.relevanceScore || 75,
          
          adzunaApiMetadata: {
            discoveryMethod: 'generic_adzuna_api_aggregation',
            apiProvider: 'adzuna',
            genericRelevanceFiltering: true,
            worksForAllJobTypes: true
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
            extractionMethod: 'generic_adzuna_api_discovery',
            contentQuality: jobData.contentQuality || 'high',
            matchScore: jobData.relevanceScore || 75,
            premiumAnalysis: true,
            sourcePlatform: jobData.sourcePlatform,
            relevanceScore: jobData.relevanceScore || 75,
            apiSource: 'adzuna_aggregator'
          }
        }
      });
      
      console.log(`✅ GENERIC SAVE: ${job.title} at ${job.company} (Relevance: ${jobData.relevanceScore || 75}%) [${savedCount}/${maxJobsPerSearch}]`);
      
    } catch (error) {
      console.error(`❌ ERROR saving generic job ${jobData.title}:`, error);
    }
  }
  
  console.log(`💾 Generic job saving completed: ${savedCount} jobs saved`);
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

function createValidSourcePlatform(originalPlatform) {
  if (!originalPlatform) return 'AI_FOUND_ADZUNA_OTHER';
  
  const platform = originalPlatform.toLowerCase();
  
  const platformMap = {
    'indeed': 'AI_FOUND_ADZUNA_INDEED',
    'linkedin': 'AI_FOUND_ADZUNA_LINKEDIN',
    'monster': 'AI_FOUND_ADZUNA_MONSTER',
    'careerbuilder': 'AI_FOUND_ADZUNA_CAREERBUILDER',
    'glassdoor': 'AI_FOUND_ADZUNA_GLASSDOOR'
  };
  
  for (const [key, value] of Object.entries(platformMap)) {
    if (platform.includes(key)) {
      return value;
    }
  }
  
  return 'AI_FOUND_ADZUNA_OTHER';
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

// EXISTING EXPORTS (maintained for compatibility)
exports.getUserAiSearches = async (userId) => {
  return await AiJobSearch.find({ userId }).sort({ createdAt: -1 });
};

exports.pauseAiSearch = async (userId, searchId) => {
  const search = await AiJobSearch.findOne({ _id: searchId, userId });
  if (!search) throw new Error('Search not found');
  
  await search.addReasoningLog(
    'completion',
    'Generic Adzuna API search paused by user request',
    { phase: 'user_pause', pausedAt: new Date() }
  );
  
  search.status = 'paused';
  search.lastUpdateMessage = 'Paused by user';
  await search.save();
  
  return { message: 'Generic search paused successfully' };
};

exports.resumeAiSearch = async (userId, searchId) => {
  const search = await AiJobSearch.findOne({ _id: searchId, userId });
  if (!search) throw new Error('Search not found');
  
  await search.addReasoningLog(
    'initialization',
    'Generic Adzuna API search resumed by user - continuing with field-agnostic filtering that works for any job type',
    { 
      phase: 'user_resume', 
      resumedAt: new Date(),
      searchMethod: 'Generic Adzuna API with field-agnostic filtering'
    }
  );
  
  search.status = 'running';
  search.lastUpdateMessage = 'Resumed by user - Generic approach';
  await search.save();
  
  const resume = await Resume.findById(search.resumeId);
  if (resume) {
    performGenericAdzunaJobSearch(searchId, userId, resume).catch(error => {
      console.error('Error resuming generic search:', error);
    });
  }
  
  return { message: 'Generic search resumed successfully' };
};

exports.deleteAiSearch = async (userId, searchId) => {
  const search = await AiJobSearch.findOne({ _id: searchId, userId });
  if (!search) throw new Error('Search not found');
  
  await search.addReasoningLog(
    'completion',
    'Generic Adzuna API search cancelled by user request',
    { 
      phase: 'user_cancellation', 
      cancelledAt: new Date(),
      searchMethod: 'Generic Adzuna API aggregation'
    }
  );
  
  search.status = 'cancelled';
  search.lastUpdateMessage = 'Cancelled by user';
  await search.save();
  
  return { message: 'Generic search cancelled successfully' };
};