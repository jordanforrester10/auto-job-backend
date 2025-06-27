// services/jobAnalysis.service.js - FIXED FOR EXPERIENCE LEVEL VALIDATION AND RELEVANCE
const { openai } = require('../config/openai');

/**
 * Enhanced job analysis with FIXED experience level validation and better relevance filtering
 * - GPT-4o for manual jobs (quality-critical, low volume)
 * - GPT-4o for AI discovery (now same quality as manual!)
 * - Batch processing for efficiency
 * 
 * @param {string} jobDescription - Raw job description text
 * @param {Object} jobMetadata - Additional job metadata (title, company, etc.)
 * @param {Object} options - Analysis options
 * @param {boolean} options.isAiDiscovery - Whether this is from AI discovery (now uses GPT-4o!)
 * @param {boolean} options.prioritizeCost - Force use of Mini model (deprecated)
 * @returns {Object} Parsed job data with detailed analysis
 */
exports.analyzeJob = async (jobDescription, jobMetadata = {}, options = {}) => {
  try {
    // NEW: Use GPT-4o for both manual and AI discovery for consistent quality
    const model = "gpt-4o";
    const maxTokens = 3500;
    
    console.log(`Starting premium job analysis with ${model} (same quality for all jobs)...`);
    
    if (!jobDescription || jobDescription.trim().length < 50) {
      throw new Error('Job description is too short for meaningful analysis');
    }

    const prompt = createPromptForModel(jobDescription, jobMetadata, false); // Always use premium prompt

    // Call OpenAI API with GPT-4o
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: createSystemPromptForModel(false) // Always use premium system prompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low for consistent extraction
      max_tokens: maxTokens,
    });

    const content = response.choices[0].message.content.trim();
    console.log(`Job analysis response received from ${model}, parsing...`);

    let parsedData;
    try {
      // Clean up the response to extract JSON
      let jsonStr = content;
      
      // Remove any markdown code blocks
      if (content.includes('```')) {
        const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonStr = jsonMatch[1];
        }
      }
      
      // Clean up and ensure valid JSON structure
      jsonStr = jsonStr.trim();
      if (!jsonStr.startsWith('{')) {
        const startIndex = jsonStr.indexOf('{');
        if (startIndex !== -1) {
          jsonStr = jsonStr.substring(startIndex);
        }
      }
      if (!jsonStr.endsWith('}')) {
        const endIndex = jsonStr.lastIndexOf('}');
        if (endIndex !== -1) {
          jsonStr = jsonStr.substring(0, endIndex + 1);
        }
      }

      parsedData = JSON.parse(jsonStr);
      
      // FIXED: Validate and enhance the parsed data with proper experience level normalization
      parsedData = validateAndEnhanceJobData(parsedData, jobDescription, false); // Always use premium validation
      
      console.log(`Job analysis completed successfully with ${model}. Found ${parsedData.keySkills?.length || 0} skills.`);
      
    } catch (parseError) {
      console.error(`Error parsing job analysis response from ${model}:`, parseError);
      console.log('Raw response:', content);
      throw new Error(`Failed to parse job analysis response from ${model}`);
    }

    // Add analysis metadata
    parsedData.analysisMetadata = {
      analyzedAt: new Date(),
      algorithmVersion: options.isAiDiscovery ? '3.0-ai-discovery-premium' : '3.0-manual-premium',
      model: model,
      originalLength: jobDescription.length,
      extractedSkillsCount: parsedData.keySkills?.length || 0,
      costOptimized: false, // Now using premium for all
      analysisType: options.isAiDiscovery ? 'ai_discovery_premium' : 'manual_upload_premium',
      estimatedCost: '$0.01-0.02',
      qualityLevel: 'premium'
    };

    return parsedData;

  } catch (error) {
    console.error('Error in premium job analysis:', error);
    
    // Intelligent fallback analysis
    return generateJobAnalysisFallback(jobDescription, jobMetadata, error, options);
  }
};

/**
 * FIXED: Batch job analysis for AI discovery efficiency
 * Analyzes multiple jobs in a single API call for cost efficiency
 * 
 * @param {Array} jobBatch - Array of job objects with title, company, fullContent
 * @returns {Array} Array of analysis results matching input order
 */
exports.analyzeBatchJobs = async (jobBatch) => {
  try {
    console.log(`🔬 Starting batch analysis of ${jobBatch.length} jobs with GPT-4o...`);
    
    if (!jobBatch || jobBatch.length === 0) {
      return [];
    }
    
    // Limit batch size to prevent token overflow
    const maxBatchSize = 3;
    if (jobBatch.length > maxBatchSize) {
      console.log(`Batch size ${jobBatch.length} exceeds maximum ${maxBatchSize}, processing in chunks...`);
      
      const results = [];
      for (let i = 0; i < jobBatch.length; i += maxBatchSize) {
        const chunk = jobBatch.slice(i, i + maxBatchSize);
        const chunkResults = await this.analyzeBatchJobs(chunk);
        results.push(...chunkResults);
      }
      return results;
    }
    
    // Prepare batch content for analysis
    const batchContent = jobBatch.map((job, index) => 
      `JOB ${index + 1}:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Content: ${(job.fullContent || job.description || '').substring(0, 2500)}
---`
    ).join('\n\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are an expert job analyst providing premium batch analysis. Analyze multiple job postings and return detailed structured data for each. Focus on extracting comprehensive requirements, responsibilities, and skills with high accuracy. Return valid JSON array with exactly ${jobBatch.length} objects.

CRITICAL: For experienceLevel field, use ONLY these exact single values:
- "entry" (0-2 years)
- "junior" (1-3 years) 
- "mid" (3-6 years)
- "senior" (5-10 years)
- "lead" (7-12 years)
- "principal" (10+ years)
- "executive" (12+ years)

NEVER use compound values like "mid/senior" or "senior/lead". Pick the SINGLE most appropriate level.`
        },
        {
          role: "user",
          content: `Analyze these ${jobBatch.length} job postings and return detailed analysis for each:

${batchContent}

Return JSON array with exactly ${jobBatch.length} objects in this EXACT format:
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
    "experienceLevel": "mid",
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
    "workArrangement": "remote",
    "industryContext": "technology",
    "roleCategory": "software-engineering",
    "technicalComplexity": "high",
    "leadershipRequired": true,
    "companyStage": "startup"
  }
]

CRITICAL REQUIREMENTS:
- Skills importance: 9-10=critical, 7-8=very important, 5-6=important, 3-4=nice to have
- experienceLevel: Use ONLY single values: "entry", "junior", "mid", "senior", "lead", "principal", "executive"
- workArrangement: Use ONLY "remote", "hybrid", "onsite", or "unknown"
- Extract comprehensive information from each job posting
- Maintain high accuracy and detail level
- Return exactly ${jobBatch.length} analysis objects in the same order`
        }
      ]
    });

    const content = response.choices[0].message.content.trim();
    let jsonStr = content;
    
    // Clean JSON extraction
    if (content.includes('```')) {
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
      }
    }
    
    const analyses = JSON.parse(jsonStr);
    
    // Ensure we have the right number of analyses
    if (!Array.isArray(analyses)) {
      throw new Error('Response is not an array');
    }
    
    if (analyses.length !== jobBatch.length) {
      console.warn(`Expected ${jobBatch.length} analyses, got ${analyses.length}. Padding or trimming...`);
      
      // Pad with fallback analyses if too few
      while (analyses.length < jobBatch.length) {
        analyses.push(createFallbackSingleAnalysis());
      }
      
      // Trim if too many
      if (analyses.length > jobBatch.length) {
        analyses.splice(jobBatch.length);
      }
    }
    
    // FIXED: Enhance analyses with metadata and proper validation
    const enhancedAnalyses = analyses.map((analysis, index) => {
      // Normalize experience level to ensure it's valid
      analysis.experienceLevel = normalizeExperienceLevel(analysis.experienceLevel);
      
      return {
        ...analysis,
        analysisMetadata: {
          analyzedAt: new Date(),
          algorithmVersion: '3.0-batch-premium',
          model: 'gpt-4o',
          analysisType: 'ai_discovery_batch_premium',
          qualityLevel: 'premium',
          batchIndex: index,
          batchSize: jobBatch.length
        }
      };
    });
    
    console.log(`✅ Batch analysis completed: ${enhancedAnalyses.length} jobs analyzed with GPT-4o`);
    return enhancedAnalyses;
    
  } catch (error) {
    console.error('Error in batch job analysis:', error);
    
    // Return fallback analyses for all jobs in batch
    return jobBatch.map((job, index) => ({
      ...createFallbackSingleAnalysis(),
      analysisMetadata: {
        analyzedAt: new Date(),
        algorithmVersion: '3.0-batch-fallback',
        model: 'gpt-4o-fallback',
        analysisType: 'ai_discovery_batch_fallback',
        error: error.message,
        batchIndex: index,
        batchSize: jobBatch.length
      }
    }));
  }
};

/**
 * FIXED: Experience level normalization function
 */
function normalizeExperienceLevel(experienceLevel) {
  if (!experienceLevel || typeof experienceLevel !== 'string') {
    return 'mid'; // Default fallback
  }
  
  const level = experienceLevel.toLowerCase().trim();
  
  // Handle compound experience levels by picking the higher one
  if (level.includes('/') || level.includes('-')) {
    const parts = level.split(/[\/\-]/).map(p => p.trim());
    
    // Mapping for priority (higher number = more senior)
    const levelPriority = {
      'entry': 1,
      'junior': 2,
      'mid': 3,
      'senior': 4,
      'lead': 5,
      'principal': 6,
      'executive': 7
    };
    
    let highestLevel = 'mid';
    let highestPriority = 0;
    
    for (const part of parts) {
      const normalizedPart = normalizeSingleLevel(part);
      const priority = levelPriority[normalizedPart] || 0;
      
      if (priority > highestPriority) {
        highestLevel = normalizedPart;
        highestPriority = priority;
      }
    }
    
    return highestLevel;
  }
  
  return normalizeSingleLevel(level);
}

function normalizeSingleLevel(level) {
  const levelMappings = {
    'entry': 'entry',
    'entry-level': 'entry',
    'entry level': 'entry',
    'graduate': 'entry',
    'new grad': 'entry',
    'intern': 'entry',
    'associate': 'entry',
    
    'junior': 'junior',
    'jr': 'junior',
    'junior-level': 'junior',
    
    'mid': 'mid',
    'middle': 'mid',
    'mid-level': 'mid',
    'intermediate': 'mid',
    
    'senior': 'senior',
    'sr': 'senior',
    'senior-level': 'senior',
    
    'lead': 'lead',
    'team lead': 'lead',
    'tech lead': 'lead',
    'technical lead': 'lead',
    
    'principal': 'principal',
    'staff': 'principal',
    'architect': 'principal',
    
    'executive': 'executive',
    'director': 'executive',
    'vp': 'executive',
    'vice president': 'executive',
    'c-level': 'executive',
    'chief': 'executive'
  };
  
  // Direct mapping
  if (levelMappings[level]) {
    return levelMappings[level];
  }
  
  // Partial matching
  for (const [key, value] of Object.entries(levelMappings)) {
    if (level.includes(key)) {
      return value;
    }
  }
  
  return 'mid'; // Default fallback
}

/**
 * NEW: Check if a job is relevant to the target career profile
 */
function isJobRelevantToCareerProfile(job, targetJobTitles = []) {
  if (!job || !job.title) return true; // Allow if we can't determine
  
  const jobTitle = job.title.toLowerCase();
  const jobDescription = (job.description || job.fullContent || '').toLowerCase();
  
  // If no target titles specified, allow all jobs
  if (!targetJobTitles || targetJobTitles.length === 0) {
    return true;
  }
  
  // Extract key role words from target titles
  const targetWords = targetJobTitles
    .flatMap(title => title.toLowerCase().split(' '))
    .filter(word => word.length > 3 && !['senior', 'junior', 'lead', 'principal'].includes(word));
  
  // Check if job title contains any target words
  const titleMatch = targetWords.some(word => jobTitle.includes(word));
  
  // Check if job description contains multiple target words (for broader relevance)
  const descriptionMatches = targetWords.filter(word => jobDescription.includes(word)).length;
  
  // Consider relevant if:
  // 1. Title contains target words, OR
  // 2. Description contains 2+ target words (for related roles)
  return titleMatch || descriptionMatches >= 2;
}

/**
 * Content analysis with premium quality
 * @param {string} jobContent - Raw job content from URL
 * @param {Object} jobInfo - Job metadata
 * @param {boolean} isAiDiscovery - Whether this is from AI discovery (now uses GPT-4o regardless)
 * @returns {Object} Analyzed job content
 */
exports.analyzeJobContent = async (jobContent, jobInfo, isAiDiscovery = false) => {
  if (!jobContent) return null;
  
  try {
    // NEW: Always use GPT-4o for consistent premium quality
    const model = "gpt-4o";
    const maxTokens = 2000;
    
    console.log(`🤖 Analyzing job content with premium ${model}: "${jobInfo.title}"`);
    
    // Create optimized prompt
    const prompt = createContentAnalysisPrompt(jobContent, jobInfo, false); // Always use premium prompt

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are an expert job analyst. Extract comprehensive job data and return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0,
      max_tokens: maxTokens
    });

    const analysisText = response.choices[0].message.content.trim();
    let jsonStr = analysisText;
    
    // Clean JSON extraction
    if (analysisText.includes('```')) {
      const jsonMatch = analysisText.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
      }
    }
    
    const analysis = JSON.parse(jsonStr);
    
    // Validate work arrangement
    if (analysis.workArrangement) {
      analysis.workArrangement = normalizeWorkArrangement(analysis.workArrangement);
    }
    
    // FIXED: Normalize experience level
    if (analysis.experienceLevel) {
      analysis.experienceLevel = normalizeExperienceLevel(analysis.experienceLevel);
    }
    
    // Add metadata
    analysis.analysisMetadata = {
      model: model,
      analysisType: isAiDiscovery ? 'ai_discovery_content_premium' : 'manual_content_premium',
      qualityLevel: 'premium',
      analyzedAt: new Date()
    };
    
    console.log(`✅ Premium content analysis completed with ${model} for "${jobInfo.title}"`);
    return analysis;
    
  } catch (error) {
    console.error(`Error analyzing job content with premium approach:`, error);
    return generateBasicContentAnalysis(jobContent, jobInfo, isAiDiscovery);
  }
};

/**
 * Create model-specific prompts (now always premium)
 */
function createPromptForModel(jobDescription, jobMetadata, useMinimModel) {
  // Always use comprehensive prompt for premium quality
  const contentLength = 4000;
  const truncatedDescription = jobDescription.length > contentLength ? 
    jobDescription.substring(0, contentLength) + '...' : jobDescription;

  return `
    Analyze this job posting and extract detailed information. Be thorough and accurate in your analysis.

    **JOB POSTING:**
    ${truncatedDescription}

    **ADDITIONAL CONTEXT:**
    ${jobMetadata.title ? `Title: ${jobMetadata.title}` : ''}
    ${jobMetadata.company ? `Company: ${jobMetadata.company}` : ''}
    ${jobMetadata.location ? `Location: ${JSON.stringify(jobMetadata.location)}` : ''}

    Extract and categorize information into this EXACT JSON structure:

    {
      "requirements": [
        "specific requirement 1",
        "specific requirement 2"
      ],
      "responsibilities": [
        "key responsibility 1",
        "key responsibility 2"
      ],
      "qualifications": {
        "required": [
          "must-have qualification 1",
          "must-have qualification 2"
        ],
        "preferred": [
          "nice-to-have qualification 1",
          "nice-to-have qualification 2"
        ]
      },
      "keySkills": [
        {
          "name": "Python",
          "importance": 9,
          "category": "technical",
          "skillType": "programming"
        },
        {
          "name": "Project Management",
          "importance": 7,
          "category": "soft",
          "skillType": "management"
        }
      ],
      "experienceLevel": "mid",
      "yearsOfExperience": {
        "minimum": 3,
        "preferred": 5
      },
      "educationRequirements": [
        "Bachelor's degree in Computer Science or related field",
        "Master's degree preferred"
      ],
      "benefits": [
        "Health insurance",
        "401k matching",
        "Remote work options"
      ],
      "industryContext": "technology",
      "roleCategory": "product-management",
      "seniorityLevel": "mid",
      "technicalComplexity": "high",
      "leadershipRequired": true,
      "certifications": [
        "PMP certification preferred",
        "Agile certification a plus"
      ],
      "softSkills": [
        "Communication",
        "Leadership",
        "Problem-solving"
      ],
      "technicalSkills": [
        "SQL",
        "Python",
        "Data Analysis"
      ],
      "toolsAndTechnologies": [
        "Jira",
        "Confluence",
        "Tableau"
      ],
      "companySize": "medium",
      "workArrangement": "hybrid"
    }

    **EXTRACTION GUIDELINES:**

    1. **Skills Importance Scale (1-10):**
       - 9-10: Critical/Must-have (mentioned multiple times, essential)
       - 7-8: Very Important (clearly stated as required)
       - 5-6: Important (mentioned in requirements)
       - 3-4: Nice to have (preferred qualifications)
       - 1-2: Bonus (mentioned casually)

    2. **Experience Level Mapping (use ONLY single values):**
       - "entry": 0-2 years
       - "junior": 1-3 years
       - "mid": 3-6 years
       - "senior": 5-10 years
       - "lead": 7-12 years
       - "principal": 10+ years
       - "executive": 12+ years

    CRITICAL: Never use compound values like "mid-senior" or "senior/lead". Always pick the single most appropriate level.

    3. **Work Arrangement (use exact values):**
       - "remote": Fully remote work
       - "hybrid": Mix of remote and office work
       - "onsite": Must work from office/physical location
       - "unknown": Work arrangement not specified

    **IMPORTANT:** Extract only information explicitly mentioned in the job posting. Don't infer or add generic requirements.

    Return ONLY the JSON object without any markdown formatting or explanations.
    `;
}

/**
 * Create model-specific system prompts (now always premium)
 */
function createSystemPromptForModel(useMinimModel) {
  return "You are an expert HR technology analyst specializing in job posting analysis. You extract precise, detailed information from job descriptions without adding assumptions. You return only valid JSON without markdown formatting. For experienceLevel field, use ONLY these exact single values: 'entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive'. For workArrangement field, use ONLY these exact values: 'remote', 'hybrid', 'onsite', or 'unknown'.";
}

/**
 * Create content analysis prompt (now always premium)
 */
function createContentAnalysisPrompt(jobContent, jobInfo, isAiDiscovery) {
  const contentLength = 3000;
  const truncatedContent = jobContent.length > contentLength ? 
    jobContent.substring(0, contentLength) + '...' : jobContent;

  return `
    Analyze this job content and extract structured data:

    Job: ${jobInfo.title} at ${jobInfo.company}
    Content: ${truncatedContent}

    Return JSON:
    {
      "requirements": ["Required skill 1", "Required skill 2"],
      "responsibilities": ["Responsibility 1", "Responsibility 2"],
      "qualifications": {
        "required": ["Must have 1", "Must have 2"],
        "preferred": ["Nice to have 1", "Nice to have 2"]
      },
      "salary": {
        "min": 120000,
        "max": 150000,
        "currency": "USD"
      },
      "benefits": ["Benefit 1", "Benefit 2"],
      "jobType": "FULL_TIME",
      "experienceLevel": "mid",
      "workArrangement": "remote"
    }

    CRITICAL: For experienceLevel, use ONLY single values: "entry", "junior", "mid", "senior", "lead", "principal", "executive".
    For workArrangement, use ONLY: "remote", "hybrid", "onsite", "unknown".

    Extract comprehensive information. Be thorough with requirements and qualifications.
    `;
}

/**
 * FIXED: Enhanced validation for premium quality
 */
function validateAndEnhanceJobData(parsedData, originalDescription, useMinimModel) {
  // FIXED: Normalize experience level first
  if (parsedData.experienceLevel) {
    parsedData.experienceLevel = normalizeExperienceLevel(parsedData.experienceLevel);
  }
  
  // Ensure required fields exist
  if (!parsedData.requirements) parsedData.requirements = [];
  if (!parsedData.responsibilities) parsedData.responsibilities = [];
  if (!parsedData.qualifications) {
    parsedData.qualifications = { required: [], preferred: [] };
  }
  if (!parsedData.keySkills) parsedData.keySkills = [];
  if (!parsedData.benefits) parsedData.benefits = [];
  if (!parsedData.educationRequirements) parsedData.educationRequirements = [];

  // Validate and normalize skill importance scores
  if (parsedData.keySkills && Array.isArray(parsedData.keySkills)) {
    parsedData.keySkills = parsedData.keySkills.map(skill => {
      if (typeof skill === 'string') {
        return {
          name: skill,
          importance: 5,
          category: 'technical',
          skillType: 'general'
        };
      }
      
      // Validate importance score
      if (!skill.importance || skill.importance < 1 || skill.importance > 10) {
        skill.importance = 5;
      }
      
      // Ensure required fields
      if (!skill.category) skill.category = 'technical';
      if (!skill.skillType) skill.skillType = 'general';
      
      return skill;
    });
  }

  // Enhanced skill extraction (now always comprehensive)
  const skillLimit = 15; // Increased for premium quality
  const additionalSkills = extractSkillsFromText(originalDescription);
  const existingSkillNames = parsedData.keySkills.map(s => s.name.toLowerCase());
  
  additionalSkills.slice(0, skillLimit).forEach(skill => {
    if (!existingSkillNames.includes(skill.toLowerCase())) {
      parsedData.keySkills.push({
        name: skill,
        importance: 4,
        category: 'technical',
        skillType: 'extracted'
      });
    }
  });

  // Apply standard validations
  const validExperienceLevels = ['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive'];
  if (!parsedData.experienceLevel || !validExperienceLevels.includes(parsedData.experienceLevel)) {
    parsedData.experienceLevel = inferExperienceLevel(originalDescription);
  }

  if (!parsedData.yearsOfExperience) {
    parsedData.yearsOfExperience = inferYearsOfExperience(originalDescription, parsedData.experienceLevel);
  }

  if (!parsedData.industryContext) {
    parsedData.industryContext = inferIndustryContext(originalDescription);
  }

  if (!parsedData.roleCategory) {
    parsedData.roleCategory = inferRoleCategory(originalDescription, parsedData.keySkills);
  }

  // Normalize workArrangement
  if (parsedData.workArrangement) {
    parsedData.workArrangement = normalizeWorkArrangement(parsedData.workArrangement);
  } else {
    parsedData.workArrangement = inferWorkArrangement(originalDescription);
  }

  return parsedData;
}

/**
 * Create fallback single analysis for batch processing
 */
function createFallbackSingleAnalysis() {
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
    companyStage: 'unknown'
  };
}

/**
 * Generate fallback analysis with premium approach awareness
 */
function generateJobAnalysisFallback(jobDescription, jobMetadata, error, options = {}) {
  console.log('Generating premium fallback job analysis...');
  
  try {
    const extractedSkills = extractSkillsFromText(jobDescription);
    const experienceLevel = inferExperienceLevel(jobDescription);
    const workArrangement = inferWorkArrangement(jobDescription);
    
    return {
      requirements: [],
      responsibilities: [],
      qualifications: { required: [], preferred: [] },
      keySkills: extractedSkills.map(skill => ({
        name: skill,
        importance: 5,
        category: 'technical',
        skillType: 'extracted'
      })),
      experienceLevel,
      yearsOfExperience: inferYearsOfExperience(jobDescription, experienceLevel),
      educationRequirements: [],
      benefits: [],
      industryContext: inferIndustryContext(jobDescription),
roleCategory: inferRoleCategory(jobDescription, extractedSkills),
      seniorityLevel: experienceLevel,
      technicalComplexity: 'medium',
      leadershipRequired: jobDescription.toLowerCase().includes('lead'),
      certifications: [],
      softSkills: ['Communication', 'Problem-solving'],
      technicalSkills: extractedSkills,
      toolsAndTechnologies: [],
      companySize: 'unknown',
      workArrangement: workArrangement,
      fallbackReason: error.message,
      analysisMetadata: {
        analyzedAt: new Date(),
        algorithmVersion: '3.0-premium-fallback',
        model: 'gpt-4o-fallback',
        originalLength: jobDescription.length,
        extractedSkillsCount: extractedSkills.length,
        fallback: true,
        analysisType: options.isAiDiscovery ? 'ai_discovery_premium' : 'manual_upload_premium'
      }
    };
    
  } catch (fallbackError) {
    console.error('Error in premium fallback analysis:', fallbackError);
    
    return {
      requirements: [],
      responsibilities: [],
      qualifications: { required: [], preferred: [] },
      keySkills: [],
      experienceLevel: 'mid',
      yearsOfExperience: { minimum: 3, preferred: 5 },
      educationRequirements: [],
      benefits: [],
      industryContext: 'general',
      roleCategory: 'general',
      workArrangement: 'unknown',
      errorDetails: error.message,
      analysisMetadata: {
        analyzedAt: new Date(),
        algorithmVersion: '3.0-premium-error',
        model: 'error-fallback-premium',
        originalLength: jobDescription.length,
        error: true,
        analysisType: options.isAiDiscovery ? 'ai_discovery_premium' : 'manual_upload_premium'
      }
    };
  }
}

/**
 * Generate basic content analysis with premium awareness
 */
function generateBasicContentAnalysis(jobContent, jobInfo, isAiDiscovery = false) {
  console.log('Generating premium content analysis fallback...');
  
  try {
    const lowerContent = jobContent.toLowerCase();
    
    // Basic salary extraction
    const salaryMatch = jobContent.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-?\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)?/);
    let salary = {};
    if (salaryMatch) {
      salary.min = parseInt(salaryMatch[1].replace(/,/g, ''));
      if (salaryMatch[2]) {
        salary.max = parseInt(salaryMatch[2].replace(/,/g, ''));
      }
      salary.currency = 'USD';
    }
    
    // Basic work arrangement detection
    let workArrangement = 'unknown';
    if (lowerContent.includes('remote')) {
      workArrangement = lowerContent.includes('hybrid') ? 'hybrid' : 'remote';
    } else if (lowerContent.includes('onsite') || lowerContent.includes('on-site')) {
      workArrangement = 'onsite';
    }
    
    return {
      requirements: ['Experience in relevant field'],
      responsibilities: ['Perform job duties as assigned'],
      qualifications: {
        required: ['Relevant experience'],
        preferred: []
      },
      salary: Object.keys(salary).length > 0 ? salary : null,
      benefits: [],
      jobType: 'FULL_TIME',
      experienceLevel: 'mid',
      workArrangement: workArrangement,
      fallbackReason: 'Premium model analysis failed',
      analysisMetadata: {
        model: 'gpt-4o-basic-fallback',
        analysisType: isAiDiscovery ? 'ai_discovery_premium' : 'manual_content_premium',
        qualityLevel: 'basic_fallback'
      }
    };
    
  } catch (error) {
    console.error('Error in basic premium content analysis:', error);
    return {
      requirements: [],
      responsibilities: [],
      qualifications: { required: [], preferred: [] },
      salary: null,
      benefits: [],
      jobType: 'FULL_TIME',
      experienceLevel: 'mid',
      workArrangement: 'unknown',
      error: true,
      analysisMetadata: {
        model: 'error-premium',
        analysisType: isAiDiscovery ? 'ai_discovery_premium' : 'manual_content_premium',
        qualityLevel: 'error_fallback'
      }
    };
  }
}

// Keep all existing helper functions unchanged
function normalizeWorkArrangement(workArrangement) {
  if (!workArrangement || typeof workArrangement !== 'string') {
    return 'unknown';
  }
  
  const normalized = workArrangement.toLowerCase().trim();
  
  const mappings = {
    'remote': 'remote',
    'fully remote': 'remote',
    'work from home': 'remote',
    'wfh': 'remote',
    '100% remote': 'remote',
    
    'hybrid': 'hybrid',
    'flex': 'hybrid',
    'flexible': 'hybrid',
    'mix': 'hybrid',
    'part remote': 'hybrid',
    'partial remote': 'hybrid',
    
    'onsite': 'onsite',
    'on-site': 'onsite',
    'on site': 'onsite',
    'office': 'onsite',
    'in-office': 'onsite',
    'in office': 'onsite',
    'on-premise': 'onsite',
    'on premise': 'onsite',
    'physical location': 'onsite',
    'in-person': 'onsite',
    'in person': 'onsite'
  };
  
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  return 'unknown';
}

function extractSkillsFromText(description) {
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift',
    'TypeScript', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Shell', 'PowerShell',
    'React', 'Vue.js', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
    'Laravel', 'Rails', 'ASP.NET', 'HTML', 'CSS', 'SASS', 'LESS', 'Bootstrap',
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Oracle',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'CircleCI',
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Slack',
    'Machine Learning', 'Data Analysis', 'Tableau', 'Power BI', 'Excel', 'Pandas',
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
    'Agile', 'Scrum', 'Kanban', 'Waterfall', 'PMP', 'PRINCE2',
    'Project Management', 'Leadership', 'Communication', 'Problem Solving'
  ];
  
  const foundSkills = [];
  const lowerDescription = description.toLowerCase();
  
  commonSkills.forEach(skill => {
    const skillVariations = [
      skill.toLowerCase(),
      skill.toLowerCase().replace(/\./g, ''),
      skill.toLowerCase().replace(/\s+/g, ''),
      skill.toLowerCase().replace(/-/g, ''),
      skill.toLowerCase().replace(/\//g, ' ')
    ];
    
    if (skillVariations.some(variation => lowerDescription.includes(variation))) {
      foundSkills.push(skill);
    }
  });
  
  return foundSkills;
}

function inferExperienceLevel(description) {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('entry level') || lowerDesc.includes('0-2 years') || 
      lowerDesc.includes('new grad') || lowerDesc.includes('graduate') ||
      lowerDesc.includes('junior developer') || lowerDesc.includes('associate')) {
    return 'entry';
  }
  
  if (lowerDesc.includes('junior') && !lowerDesc.includes('senior')) {
    return 'junior';
  }
  
  if (lowerDesc.includes('3-5 years') || lowerDesc.includes('mid level') ||
      lowerDesc.includes('3+ years') || lowerDesc.includes('4+ years')) {
    return 'mid';
  }
  
  if (lowerDesc.includes('senior') || lowerDesc.includes('5+ years') ||
      lowerDesc.includes('6+ years') || lowerDesc.includes('7+ years')) {
    return 'senior';
  }
  
  if (lowerDesc.includes('lead') || lowerDesc.includes('tech lead') ||
      lowerDesc.includes('team lead') || lowerDesc.includes('8+ years')) {
    return 'lead';
  }
  
  if (lowerDesc.includes('principal') || lowerDesc.includes('10+ years') ||
      lowerDesc.includes('architect') || lowerDesc.includes('staff')) {
    return 'principal';
  }
  
  if (lowerDesc.includes('director') || lowerDesc.includes('vp') ||
      lowerDesc.includes('executive') || lowerDesc.includes('15+ years') ||
      lowerDesc.includes('chief')) {
    return 'executive';
  }
  
  if (lowerDesc.includes('manage') || lowerDesc.includes('supervise') ||
      lowerDesc.includes('oversee')) {
    return 'senior';
  }
  
  return 'mid'; // Default fallback
}

function inferYearsOfExperience(description, experienceLevel) {
  // Try to extract explicit years mentioned
  const yearMatches = description.match(/(\d+)[\s\-\+]*years?/gi);
  if (yearMatches && yearMatches.length > 0) {
    const years = yearMatches.map(match => parseInt(match.match(/\d+/)[0]));
    const maxYears = Math.max(...years);
    const minYears = Math.min(...years);
    
    return {
      minimum: minYears,
      preferred: maxYears > minYears ? maxYears : minYears + 2
    };
  }
  
  // Fall back to level-based inference
  const levelMappings = {
    'entry': { minimum: 0, preferred: 2 },
    'junior': { minimum: 1, preferred: 3 },
    'mid': { minimum: 3, preferred: 5 },
    'senior': { minimum: 5, preferred: 8 },
    'lead': { minimum: 7, preferred: 10 },
    'principal': { minimum: 10, preferred: 15 },
    'executive': { minimum: 12, preferred: 20 }
  };
  
  return levelMappings[experienceLevel] || { minimum: 3, preferred: 5 };
}

function inferWorkArrangement(description) {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('remote') || lowerDesc.includes('work from home') || 
      lowerDesc.includes('wfh') || lowerDesc.includes('telecommute') ||
      lowerDesc.includes('distributed team')) {
    
    if (lowerDesc.includes('office') || lowerDesc.includes('hybrid') || 
        lowerDesc.includes('flexible') || lowerDesc.includes('mix')) {
      return 'hybrid';
    }
    
    return 'remote';
  }
  
  if (lowerDesc.includes('hybrid') || lowerDesc.includes('flexible') || 
      lowerDesc.includes('mix of remote') || lowerDesc.includes('part remote')) {
    return 'hybrid';
  }
  
  if (lowerDesc.includes('on-site') || lowerDesc.includes('onsite') || 
      lowerDesc.includes('on site') || lowerDesc.includes('in office') ||
      lowerDesc.includes('office location') || lowerDesc.includes('headquarters') ||
      lowerDesc.includes('in-person') || lowerDesc.includes('physical presence')) {
    return 'onsite';
  }
  
  return 'unknown';
}

function inferIndustryContext(description) {
  const lowerDesc = description.toLowerCase();
  
  const industryKeywords = {
    'technology': ['software', 'tech', 'startup', 'saas', 'platform', 'api', 'cloud', 'digital'],
    'finance': ['financial', 'bank', 'investment', 'trading', 'fintech', 'insurance', 'credit'],
    'healthcare': ['health', 'medical', 'hospital', 'pharmaceutical', 'biotech', 'clinical'],
    'retail': ['retail', 'ecommerce', 'e-commerce', 'shopping', 'consumer', 'marketplace'],
    'education': ['education', 'university', 'school', 'learning', 'training', 'academic'],
    'manufacturing': ['manufacturing', 'production', 'factory', 'industrial', 'automotive'],
    'consulting': ['consulting', 'advisory', 'professional services', 'strategy'],
    'media': ['media', 'entertainment', 'publishing', 'content', 'journalism', 'broadcasting'],
    'government': ['government', 'public sector', 'federal', 'state', 'municipal'],
    'nonprofit': ['nonprofit', 'ngo', 'foundation', 'charity', 'social impact']
  };
  
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return industry;
    }
  }
  
  return 'general';
}

function inferRoleCategory(description, skills) {
  const lowerDesc = description.toLowerCase();
  const skillNames = skills.map(s => s.name ? s.name.toLowerCase() : s.toLowerCase());
  
  // Direct role mentions
  if (lowerDesc.includes('software engineer') || lowerDesc.includes('developer') ||
      lowerDesc.includes('programmer')) {
    return 'software-engineering';
  }
  
  if (lowerDesc.includes('product manager') || lowerDesc.includes('product owner')) {
    return 'product-management';
  }
  
  if (lowerDesc.includes('data scientist') || lowerDesc.includes('data analyst') ||
      lowerDesc.includes('machine learning')) {
    return 'data-science';
  }
  
  if (lowerDesc.includes('designer') || lowerDesc.includes('ux') || lowerDesc.includes('ui')) {
    return 'design';
  }
  
  if (lowerDesc.includes('marketing') || lowerDesc.includes('growth')) {
    return 'marketing';
  }
  
  if (lowerDesc.includes('sales') || lowerDesc.includes('account executive')) {
    return 'sales';
  }
  
  // Infer from skills
  const techSkills = ['javascript', 'python', 'java', 'react', 'node.js'];
  const dataSkills = ['sql', 'tableau', 'python', 'r', 'machine learning'];
  const designSkills = ['figma', 'sketch', 'photoshop', 'prototyping'];
  
  if (techSkills.some(skill => skillNames.includes(skill))) {
    return 'software-engineering';
  }
  
  if (dataSkills.some(skill => skillNames.includes(skill))) {
    return 'data-science';
  }
  
  if (designSkills.some(skill => skillNames.includes(skill))) {
    return 'design';
  }
  
  return 'general';
}

/**
 * Re-analyze a job with updated algorithm (always premium now)
 * @param {string} jobId - Job ID to re-analyze
 * @returns {Object} Updated job analysis
 */
exports.reAnalyzeJob = async (jobId) => {
  try {
    const Job = require('../models/mongodb/job.model');
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    console.log(`Re-analyzing job with premium quality: ${job.title} at ${job.company}`);
    
    // Re-analyze with premium GPT-4o for all re-analysis
    const updatedAnalysis = await this.analyzeJob(job.description, {
      title: job.title,
      company: job.company,
      location: job.location
    }, { 
      isAiDiscovery: false,  // Use premium approach for all re-analysis
      prioritizeCost: false 
    });
    
    // Update the job with new analysis
    job.parsedData = updatedAnalysis;
    job.updatedAt = new Date();
    await job.save();
    
    console.log('Premium job re-analysis completed successfully');
    return updatedAnalysis;
    
  } catch (error) {
    console.error('Error re-analyzing job:', error);
    throw error;
  }
};

/**
 * Batch analyze multiple jobs with premium quality
 * @param {Array} jobIds - Array of job IDs to analyze
 * @param {boolean} isAiDiscovery - Whether this is AI discovery (now uses premium regardless)
 * @returns {Object} Batch analysis results
 */
exports.batchAnalyzeJobs = async (jobIds, isAiDiscovery = false) => {
  const results = {
    successful: [],
    failed: [],
    total: jobIds.length,
    modelUsed: 'gpt-4o', // Always premium now
    qualityLevel: 'premium',
    estimatedCost: '$0.01-0.02 per job'
  };
  
  console.log(`Starting premium batch analysis of ${jobIds.length} jobs with ${results.modelUsed}...`);
  
  for (const jobId of jobIds) {
    try {
      const Job = require('../models/mongodb/job.model');
      const job = await Job.findById(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      const analysis = await this.analyzeJob(job.description, {
        title: job.title,
        company: job.company,
        location: job.location
      }, { 
        isAiDiscovery: isAiDiscovery,
        prioritizeCost: false  // Always premium quality
      });
      
      job.parsedData = analysis;
      job.updatedAt = new Date();
      await job.save();
      
      results.successful.push({ jobId, analysis });
      
    } catch (error) {
      console.error(`Failed to analyze job ${jobId}:`, error);
      results.failed.push({ jobId, error: error.message });
    }
  }
  
  console.log(`Premium batch analysis completed: ${results.successful.length} successful, ${results.failed.length} failed`);
  return results;
};