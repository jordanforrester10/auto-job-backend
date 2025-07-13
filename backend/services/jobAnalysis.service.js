// services/jobAnalysis.service.js - FIXED FOR ROLE-SPECIFIC ANALYSIS FROM ACTIVEJOBS DB
const { openai } = require('../config/openai');

/**
 * Enhanced job analysis with ROLE-SPECIFIC analysis from ActiveJobs DB data
 * - GPT-4o for both manual and AI discovery for consistent quality
 * - Improved prompt engineering for technical requirements extraction
 * - Better field mapping from ActiveJobs DB response
 * 
 * @param {string} jobDescription - Raw job description text from ActiveJobs DB
 * @param {Object} jobMetadata - Additional job metadata (title, company, etc.)
 * @param {Object} options - Analysis options
 * @param {boolean} options.isAiDiscovery - Whether this is from AI discovery
 * @returns {Object} Parsed job data with detailed role-specific analysis
 */
exports.analyzeJob = async (jobDescription, jobMetadata = {}, options = {}) => {
  try {
    const model = "gpt-4o";
    const maxTokens = 4000; // Increased for better analysis
    
    console.log(`🔍 Starting ROLE-SPECIFIC job analysis with ${model} for: ${jobMetadata.title || 'Unknown'} at ${jobMetadata.company || 'Unknown'}...`);
    
    if (!jobDescription || jobDescription.trim().length < 50) {
      throw new Error('Job description is too short for meaningful analysis');
    }

    const prompt = createEnhancedAnalysisPrompt(jobDescription, jobMetadata);

    // Call OpenAI API with enhanced prompts for role-specific analysis
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: createRoleSpecificSystemPrompt()
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
    console.log(`📊 Job analysis response received from ${model}, parsing role-specific data...`);

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
      
      // Enhanced validation and role-specific enhancement
      parsedData = validateAndEnhanceRoleSpecificData(parsedData, jobDescription, jobMetadata);
      
      console.log(`✅ ROLE-SPECIFIC analysis completed with ${model}. Found:`);
      console.log(`   📋 Requirements: ${parsedData.requirements?.length || 0}`);
      console.log(`   🎯 Responsibilities: ${parsedData.responsibilities?.length || 0}`);
      console.log(`   💻 Technical Skills: ${parsedData.keySkills?.filter(s => s.category === 'technical')?.length || 0}`);
      console.log(`   🔧 Tools/Technologies: ${parsedData.toolsAndTechnologies?.length || 0}`);
      console.log(`   📚 Technical Requirements: ${parsedData.technicalRequirements?.length || 0}`);
      
    } catch (parseError) {
      console.error(`❌ Error parsing role-specific analysis response from ${model}:`, parseError);
      console.log('Raw response:', content);
      throw new Error(`Failed to parse role-specific job analysis response from ${model}`);
    }

    // Add enhanced analysis metadata
    parsedData.analysisMetadata = {
      analyzedAt: new Date(),
      algorithmVersion: options.isAiDiscovery ? '4.0-ai-discovery-role-specific' : '4.0-manual-role-specific',
      model: model,
      originalLength: jobDescription.length,
      extractedSkillsCount: parsedData.keySkills?.length || 0,
      technicalRequirementsCount: parsedData.technicalRequirements?.length || 0,
      responsibilitiesCount: parsedData.responsibilities?.length || 0,
      requirementsCount: parsedData.requirements?.length || 0,
      costOptimized: false,
      analysisType: options.isAiDiscovery ? 'ai_discovery_role_specific' : 'manual_upload_role_specific',
      estimatedCost: '$0.02-0.03',
      qualityLevel: 'role_specific_premium',
      roleSpecificAnalysis: true,
      activeJobsDbOptimized: true
    };

    return parsedData;

  } catch (error) {
    console.error('❌ Error in role-specific job analysis:', error);
    
    // Enhanced fallback for role-specific analysis
    return generateRoleSpecificFallback(jobDescription, jobMetadata, error, options);
  }
};

/**
 * Create enhanced analysis prompt for role-specific extraction
 */
function createEnhancedAnalysisPrompt(jobDescription, jobMetadata) {
  const contentLength = 4500; // Increased for ActiveJobs DB rich content
  const truncatedDescription = jobDescription.length > contentLength ? 
    jobDescription.substring(0, contentLength) + '...' : jobDescription;

  return `
    You are an expert job requirements analyst. Analyze this job posting and extract ROLE-SPECIFIC and DETAILED information. 
    
    Focus on extracting the ACTUAL requirements, responsibilities, and technical details mentioned in the job description, not generic templates.

    **JOB POSTING:**
    Title: ${jobMetadata.title || 'Not specified'}
    Company: ${jobMetadata.company || 'Not specified'}
    Location: ${JSON.stringify(jobMetadata.location) || 'Not specified'}
    
    Description:
    ${truncatedDescription}

    Extract ROLE-SPECIFIC information into this EXACT JSON structure. Be precise and extract only what's explicitly mentioned:

    {
      "requirements": [
        "Specific requirement from job description",
        "Another specific requirement mentioned"
      ],
      "responsibilities": [
        "Specific responsibility mentioned in job",
        "Another actual responsibility from posting"
      ],
      "qualifications": {
        "required": [
          "Must-have qualification explicitly stated",
          "Another required qualification"
        ],
        "preferred": [
          "Nice-to-have qualification mentioned",
          "Preferred skill or experience"
        ]
      },
      "keySkills": [
        {
          "name": "Python",
          "importance": 9,
          "category": "technical",
          "skillType": "programming",
          "context": "mentioned as primary language"
        },
        {
          "name": "Data Modeling",
          "importance": 8,
          "category": "technical", 
          "skillType": "analytical",
          "context": "required for database design"
        }
      ],
      "technicalRequirements": [
        "Specific technical requirement from job",
        "Technical skill or knowledge mentioned",
        "System, framework, or tool requirement"
      ],
      "toolsAndTechnologies": [
        "Specific tool mentioned in job",
        "Technology stack requirement",
        "Software or platform mentioned"
      ],
      "experienceLevel": "mid",
      "yearsOfExperience": {
        "minimum": 3,
        "preferred": 5
      },
      "educationRequirements": [
        "Actual education requirement from job",
        "Degree or certification mentioned"
      ],
      "benefits": [
        "Benefit explicitly mentioned",
        "Perk or compensation detail"
      ],
      "salary": {
        "min": 70000,
        "max": 110000,
        "currency": "USD"
      },
      "workArrangement": "remote",
      "industryContext": "technology",
      "roleCategory": "data-engineering",
      "technicalComplexity": "high",
      "leadershipRequired": false,
      "companyStage": "established",
      "department": "engineering",
      "roleLevel": "individual-contributor",
      "companySize": "medium",
      "roleType": "full-time"
    }

    **CRITICAL EXTRACTION GUIDELINES:**

    1. **Role-Specific Requirements**: Extract ONLY requirements explicitly mentioned in the job description. Look for phrases like:
       - "Required", "Must have", "Essential"
       - "Experience with...", "Knowledge of..."
       - "Proficiency in...", "Familiarity with..."

    2. **Technical Requirements**: Look for specific:
       - Programming languages (Python, SQL, Java, etc.)
       - Frameworks and libraries (dbt, Django, React, etc.)
       - Tools and platforms (Snowflake, AWS, Git, etc.)
       - Methodologies (Agile, DevOps, etc.)
       - Databases and storage systems

    3. **Responsibilities**: Extract actual job duties mentioned:
       - "You will...", "Responsible for..."
       - "Design and implement...", "Develop and maintain..."
       - "Collaborate with...", "Lead..."

    4. **Skills Importance Scale (1-10):**
       - 9-10: Critical/Must-have (mentioned multiple times, essential)
       - 7-8: Very Important (clearly stated as required)
       - 5-6: Important (mentioned in requirements)
       - 3-4: Nice to have (preferred qualifications)

    5. **Experience Level Mapping (use ONLY single values):**
       - "entry": 0-2 years, junior roles, new grad positions
       - "junior": 1-3 years, junior developer/analyst roles
       - "mid": 3-6 years, standard professional roles
       - "senior": 5-10 years, senior professional roles
       - "lead": 7-12 years, team lead or tech lead roles
       - "principal": 10+ years, principal engineer/architect roles
       - "executive": 12+ years, director/VP level roles

    6. **Work Arrangement (exact values only):**
       - "remote": Fully remote work
       - "hybrid": Mix of remote and office work
       - "onsite": Must work from office/physical location
       - "unknown": Work arrangement not specified

    **IMPORTANT EXTRACTION RULES:**
    - Extract information ONLY from the job description provided
    - Do not add generic requirements not mentioned in the posting
    - Be specific about technical requirements and tools
    - Look for salary information in the description
    - Pay attention to company stage indicators (startup, established, enterprise)
    - Note if leadership/management responsibilities are mentioned
    - Identify the specific role type and department

    Return ONLY the JSON object without any markdown formatting or explanations.
    Focus on ROLE-SPECIFIC extraction, not generic job analysis.
    `;
}

/**
 * Create role-specific system prompt
 */
function createRoleSpecificSystemPrompt() {
  return `You are an expert job requirements analyst specializing in extracting ROLE-SPECIFIC and DETAILED information from job postings. 

Your expertise includes:
- Identifying specific technical requirements for different roles (engineering, data, product, etc.)
- Extracting actual tools, technologies, and frameworks mentioned
- Understanding industry-specific terminology and requirements
- Differentiating between must-have and nice-to-have qualifications
- Recognizing role levels and experience requirements

You extract precise, detailed information without adding assumptions. You return only valid JSON without markdown formatting.

For experienceLevel field, use ONLY these exact single values: 'entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive'.
For workArrangement field, use ONLY these exact values: 'remote', 'hybrid', 'onsite', 'unknown'.

Focus on ROLE-SPECIFIC analysis that captures the unique requirements and responsibilities of each position.`;
}

/**
 * Enhanced validation for role-specific data
 */
function validateAndEnhanceRoleSpecificData(parsedData, originalDescription, jobMetadata) {
  // Ensure required fields exist
  if (!parsedData.requirements) parsedData.requirements = [];
  if (!parsedData.responsibilities) parsedData.responsibilities = [];
  if (!parsedData.qualifications) {
    parsedData.qualifications = { required: [], preferred: [] };
  }
  if (!parsedData.keySkills) parsedData.keySkills = [];
  if (!parsedData.technicalRequirements) parsedData.technicalRequirements = [];
  if (!parsedData.toolsAndTechnologies) parsedData.toolsAndTechnologies = [];
  if (!parsedData.benefits) parsedData.benefits = [];
  if (!parsedData.educationRequirements) parsedData.educationRequirements = [];

  // Enhanced skill extraction for role-specific analysis
  if (parsedData.keySkills && Array.isArray(parsedData.keySkills)) {
    parsedData.keySkills = parsedData.keySkills.map(skill => {
      if (typeof skill === 'string') {
        return {
          name: skill,
          importance: 5,
          category: 'technical',
          skillType: 'general',
          context: 'extracted from description'
        };
      }
      
      // Validate importance score
      if (!skill.importance || skill.importance < 1 || skill.importance > 10) {
        skill.importance = 5;
      }
      
      // Ensure required fields
      if (!skill.category) skill.category = 'technical';
      if (!skill.skillType) skill.skillType = 'general';
      if (!skill.context) skill.context = 'mentioned in job description';
      
      return skill;
    });
  }

  // Enhanced role-specific skill extraction from description
  const roleSpecificSkills = extractRoleSpecificSkills(originalDescription, jobMetadata);
  const existingSkillNames = parsedData.keySkills.map(s => s.name.toLowerCase());
  
  roleSpecificSkills.forEach(skill => {
    if (!existingSkillNames.includes(skill.name.toLowerCase())) {
      parsedData.keySkills.push(skill);
    }
  });

  // Enhanced technical requirements extraction
  if (parsedData.technicalRequirements.length === 0) {
    parsedData.technicalRequirements = extractTechnicalRequirements(originalDescription, jobMetadata);
  }

  // Enhanced tools and technologies extraction
  if (parsedData.toolsAndTechnologies.length === 0) {
    parsedData.toolsAndTechnologies = extractToolsAndTechnologies(originalDescription);
  }

  // Normalize experience level
  if (parsedData.experienceLevel) {
    parsedData.experienceLevel = normalizeExperienceLevel(parsedData.experienceLevel);
  } else {
    parsedData.experienceLevel = inferExperienceLevel(originalDescription);
  }

  // Enhanced years of experience inference
  if (!parsedData.yearsOfExperience) {
    parsedData.yearsOfExperience = inferYearsOfExperience(originalDescription, parsedData.experienceLevel);
  }

  // Enhanced industry and role classification
  if (!parsedData.industryContext) {
    parsedData.industryContext = inferIndustryContext(originalDescription, jobMetadata);
  }

  if (!parsedData.roleCategory) {
    parsedData.roleCategory = inferRoleCategory(originalDescription, parsedData.keySkills, jobMetadata);
  }

  // Enhanced work arrangement detection
  if (parsedData.workArrangement) {
    parsedData.workArrangement = normalizeWorkArrangement(parsedData.workArrangement);
  } else {
    parsedData.workArrangement = inferWorkArrangement(originalDescription);
  }

  // Enhanced salary extraction from ActiveJobs DB metadata
  if (!parsedData.salary && jobMetadata.salary) {
    parsedData.salary = jobMetadata.salary;
  }

  return parsedData;
}

/**
 * Extract role-specific skills based on job title and description
 */
function extractRoleSpecificSkills(description, jobMetadata) {
  const lowerDesc = description.toLowerCase();
  const jobTitle = (jobMetadata.title || '').toLowerCase();
  const skills = [];

  // Role-specific skill sets
  const skillSets = {
    'data engineer': [
      { name: 'SQL', importance: 9, category: 'technical', skillType: 'programming' },
      { name: 'Python', importance: 8, category: 'technical', skillType: 'programming' },
      { name: 'ETL', importance: 8, category: 'technical', skillType: 'methodology' },
      { name: 'Data Warehousing', importance: 8, category: 'technical', skillType: 'architecture' },
      { name: 'Apache Spark', importance: 7, category: 'technical', skillType: 'framework' },
      { name: 'Snowflake', importance: 7, category: 'technical', skillType: 'platform' },
      { name: 'dbt', importance: 7, category: 'technical', skillType: 'tool' },
      { name: 'AWS', importance: 6, category: 'technical', skillType: 'platform' }
    ],
    'software engineer': [
      { name: 'JavaScript', importance: 8, category: 'technical', skillType: 'programming' },
      { name: 'React', importance: 7, category: 'technical', skillType: 'framework' },
      { name: 'Node.js', importance: 7, category: 'technical', skillType: 'framework' },
      { name: 'Git', importance: 8, category: 'technical', skillType: 'tool' },
      { name: 'REST APIs', importance: 7, category: 'technical', skillType: 'architecture' }
    ],
    'product manager': [
      { name: 'Product Strategy', importance: 9, category: 'business', skillType: 'management' },
      { name: 'Roadmap Planning', importance: 8, category: 'business', skillType: 'planning' },
      { name: 'User Research', importance: 7, category: 'business', skillType: 'research' },
      { name: 'Data Analysis', importance: 7, category: 'analytical', skillType: 'analysis' },
      { name: 'Agile', importance: 6, category: 'business', skillType: 'methodology' }
    ]
  };

  // Find matching skill set based on job title
  let matchedSkillSet = [];
  for (const [role, roleSkills] of Object.entries(skillSets)) {
    if (jobTitle.includes(role) || lowerDesc.includes(role)) {
      matchedSkillSet = roleSkills;
      break;
    }
  }

  // Extract skills that are actually mentioned in the description
  matchedSkillSet.forEach(skill => {
    const skillVariations = [
      skill.name.toLowerCase(),
      skill.name.toLowerCase().replace(/\./g, ''),
      skill.name.toLowerCase().replace(/\s+/g, ''),
      skill.name.toLowerCase().replace(/-/g, ''),
      skill.name.toLowerCase().replace(/\//g, ' ')
    ];
    
    if (skillVariations.some(variation => lowerDesc.includes(variation))) {
      skills.push({
        ...skill,
        context: `mentioned for ${jobTitle || 'this role'}`
      });
    }
  });

  return skills;
}

/**
 * Extract technical requirements from job description
 */
function extractTechnicalRequirements(description, jobMetadata) {
  const requirements = [];
  const lowerDesc = description.toLowerCase();
  
  // Common technical requirement patterns
  const patterns = [
    /(\d+\+?\s*years?\s*(?:of\s*)?experience\s*(?:with|in)\s*[^.]+)/gi,
    /(?:proficiency|experience|knowledge|expertise)\s*(?:with|in)\s*([^.;,]+)/gi,
    /(?:must\s*have|required|essential)[\s\w]*(?:experience|knowledge|skills)\s*(?:with|in)\s*([^.;,]+)/gi,
    /(?:strong|solid|deep)\s*(?:understanding|knowledge|experience)\s*(?:of|with|in)\s*([^.;,]+)/gi
  ];

  patterns.forEach(pattern => {
    const matches = description.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim().replace(/[;,]$/, '');
        if (cleaned.length > 10 && cleaned.length < 200) {
          requirements.push(cleaned);
        }
      });
    }
  });

  return [...new Set(requirements)]; // Remove duplicates
}

/**
 * Extract tools and technologies from job description
 */
function extractToolsAndTechnologies(description) {
  const tools = [];
  const lowerDesc = description.toLowerCase();
  
  // Comprehensive tools and technologies list
  const techList = [
    // Programming Languages
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift',
    'TypeScript', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Shell', 'PowerShell',
    
    // Frontend Frameworks
    'React', 'Vue.js', 'Angular', 'Svelte', 'jQuery', 'Bootstrap', 'Tailwind CSS',
    
    // Backend Frameworks
    'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel', 'Rails', 'ASP.NET',
    
    // Databases
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Oracle',
    'Snowflake', 'BigQuery', 'Redshift', 'Cassandra', 'DynamoDB',
    
    // Cloud Platforms
    'AWS', 'Azure', 'GCP', 'Google Cloud', 'Heroku', 'DigitalOcean',
    
    // DevOps Tools
    'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'CircleCI', 'Terraform', 'Ansible',
    
    // Data Tools
    'Apache Spark', 'Hadoop', 'Kafka', 'Airflow', 'dbt', 'Tableau', 'Power BI',
    'Looker', 'Databricks', 'Pandas', 'NumPy', 'Jupyter',
    
    // Version Control
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN',
    
    // Project Management
    'Jira', 'Confluence', 'Slack', 'Trello', 'Asana', 'Monday.com',
    
    // Design Tools
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
    
    // Testing Tools
    'Jest', 'Cypress', 'Selenium', 'JUnit', 'PyTest'
  ];
  
  techList.forEach(tech => {
    const techVariations = [
      tech.toLowerCase(),
      tech.toLowerCase().replace(/\./g, ''),
      tech.toLowerCase().replace(/\s+/g, ''),
      tech.toLowerCase().replace(/-/g, ''),
      tech.toLowerCase().replace(/\//g, ' ')
    ];
    
    if (techVariations.some(variation => lowerDesc.includes(variation))) {
      tools.push(tech);
    }
  });
  
  return [...new Set(tools)]; // Remove duplicates
}

/**
 * Enhanced role category inference
 */
function inferRoleCategory(description, skills, jobMetadata) {
  const lowerDesc = description.toLowerCase();
  const jobTitle = (jobMetadata.title || '').toLowerCase();
  const skillNames = skills.map(s => s.name ? s.name.toLowerCase() : s.toLowerCase());
  
  // Role category mapping
  const roleCategories = {
    'data-engineering': ['data engineer', 'etl', 'data pipeline', 'data warehouse', 'snowflake', 'dbt'],
    'software-engineering': ['software engineer', 'developer', 'programmer', 'full stack', 'frontend', 'backend'],
    'product-management': ['product manager', 'product owner', 'product strategy', 'roadmap'],
    'data-science': ['data scientist', 'machine learning', 'ml engineer', 'analytics', 'statistician'],
    'devops': ['devops', 'site reliability', 'infrastructure', 'cloud engineer', 'platform engineer'],
    'design': ['designer', 'ux', 'ui', 'user experience', 'figma', 'sketch'],
    'marketing': ['marketing', 'growth', 'digital marketing', 'content marketing'],
    'sales': ['sales', 'account executive', 'business development', 'account manager']
  };
  
  for (const [category, keywords] of Object.entries(roleCategories)) {
    if (keywords.some(keyword => 
      jobTitle.includes(keyword) || 
      lowerDesc.includes(keyword) || 
      skillNames.includes(keyword)
    )) {
      return category;
    }
  }
  
  return 'general';
}

/**
 * Enhanced industry context inference
 */
function inferIndustryContext(description, jobMetadata) {
  const lowerDesc = description.toLowerCase();
  const company = (jobMetadata.company || '').toLowerCase();
  
  const industryKeywords = {
    'technology': ['software', 'tech', 'startup', 'saas', 'platform', 'api', 'cloud', 'digital', 'ai', 'ml'],
    'finance': ['financial', 'bank', 'investment', 'trading', 'fintech', 'insurance', 'credit', 'payments'],
    'healthcare': ['health', 'medical', 'hospital', 'pharmaceutical', 'biotech', 'clinical', 'patient'],
    'retail': ['retail', 'ecommerce', 'e-commerce', 'shopping', 'consumer', 'marketplace', 'commerce'],
    'education': ['education', 'university', 'school', 'learning', 'training', 'academic', 'edtech'],
    'manufacturing': ['manufacturing', 'production', 'factory', 'industrial', 'automotive', 'supply chain'],
    'consulting': ['consulting', 'advisory', 'professional services', 'strategy', 'consulting'],
    'media': ['media', 'entertainment', 'publishing', 'content', 'journalism', 'broadcasting'],
    'government': ['government', 'public sector', 'federal', 'state', 'municipal', 'civic'],
    'nonprofit': ['nonprofit', 'ngo', 'foundation', 'charity', 'social impact', 'mission-driven']
  };
  
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword) || company.includes(keyword))) {
      return industry;
    }
  }
  
  return 'general';
}

/**
 * Generate role-specific fallback analysis
 */
function generateRoleSpecificFallback(jobDescription, jobMetadata, error, options = {}) {
  console.log('🔄 Generating role-specific fallback analysis...');
  
  try {
    const extractedSkills = extractRoleSpecificSkills(jobDescription, jobMetadata);
    const technicalRequirements = extractTechnicalRequirements(jobDescription, jobMetadata);
    const toolsAndTechnologies = extractToolsAndTechnologies(jobDescription);
    const experienceLevel = inferExperienceLevel(jobDescription);
    const workArrangement = inferWorkArrangement(jobDescription);
    
    return {
      requirements: technicalRequirements.slice(0, 5), // Top 5 requirements
      responsibilities: [
        'Perform job duties as outlined in the job description',
        'Collaborate with team members on projects',
        'Meet project deadlines and deliverables'
      ],
      qualifications: { 
        required: technicalRequirements.slice(0, 3),
        preferred: technicalRequirements.slice(3, 5)
      },
      keySkills: extractedSkills,
      technicalRequirements: technicalRequirements,
      toolsAndTechnologies: toolsAndTechnologies,
      experienceLevel,
      yearsOfExperience: inferYearsOfExperience(jobDescription, experienceLevel),
      educationRequirements: ['Relevant degree or equivalent experience'],
      benefits: [],
      industryContext: inferIndustryContext(jobDescription, jobMetadata),
      roleCategory: inferRoleCategory(jobDescription, extractedSkills, jobMetadata),
      seniorityLevel: experienceLevel,
      technicalComplexity: technicalRequirements.length > 5 ? 'high' : 'medium',
      leadershipRequired: jobDescription.toLowerCase().includes('lead'),
      certifications: [],
      softSkills: ['Communication', 'Problem-solving', 'Team collaboration'],
      technicalSkills: toolsAndTechnologies,
      companySize: 'unknown',
      workArrangement: workArrangement,
      fallbackReason: error.message,
      analysisMetadata: {
        analyzedAt: new Date(),
        algorithmVersion: '4.0-role-specific-fallback',
        model: 'gpt-4o-fallback',
        originalLength: jobDescription.length,
        extractedSkillsCount: extractedSkills.length,
        technicalRequirementsCount: technicalRequirements.length,
        fallback: true,
        analysisType: options.isAiDiscovery ? 'ai_discovery_role_specific' : 'manual_upload_role_specific',
        roleSpecificAnalysis: true,
        activeJobsDbOptimized: true
      }
    };
    
  } catch (fallbackError) {
    console.error('❌ Error in role-specific fallback analysis:', fallbackError);
    
    return {
      requirements: ['Experience in relevant field'],
      responsibilities: ['Perform job duties as assigned'],
      qualifications: { required: ['Relevant experience'], preferred: [] },
      keySkills: [],
      technicalRequirements: [],
      toolsAndTechnologies: [],
      experienceLevel: 'mid',
      yearsOfExperience: { minimum: 3, preferred: 5 },
      educationRequirements: ['Bachelor\'s degree preferred'],
      benefits: [],
      industryContext: 'general',
      roleCategory: 'general',
      workArrangement: 'unknown',
      errorDetails: error.message,
      analysisMetadata: {
        analyzedAt: new Date(),
        algorithmVersion: '4.0-role-specific-error',
        model: 'error-fallback-role-specific',
        originalLength: jobDescription.length,
        error: true,
        analysisType: options.isAiDiscovery ? 'ai_discovery_role_specific' : 'manual_upload_role_specific',
        roleSpecificAnalysis: true,
        activeJobsDbOptimized: true
      }
    };
  }
}

/**
 * Batch job analysis for AI discovery with role-specific analysis
 */
exports.analyzeBatchJobs = async (jobBatch) => {
  try {
    console.log(`🔬 Starting ROLE-SPECIFIC batch analysis of ${jobBatch.length} jobs with GPT-4o...`);
    
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
    
    // Prepare batch content for role-specific analysis
    const batchContent = jobBatch.map((job, index) => 
      `JOB ${index + 1}:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Content: ${(job.fullContent || job.description || '').substring(0, 3000)}
---`
    ).join('\n\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are an expert job analyst providing ROLE-SPECIFIC batch analysis. Analyze multiple job postings and return detailed structured data for each, focusing on extracting the ACTUAL requirements and technical details mentioned in each job description, not generic templates. Return valid JSON array with exactly ${jobBatch.length} objects.

CRITICAL: For experienceLevel field, use ONLY these exact single values:
- "entry" (0-2 years)
- "junior" (1-3 years) 
- "mid" (3-6 years)
- "senior" (5-10 years)
- "lead" (7-12 years)
- "principal" (10+ years)
- "executive" (12+ years)

Extract ROLE-SPECIFIC information, not generic job analysis. Focus on what's actually mentioned in each job description.`
        },
        {
          role: "user",
          content: `Analyze these ${jobBatch.length} job postings and return ROLE-SPECIFIC analysis for each:

${batchContent}

Return JSON array with exactly ${jobBatch.length} objects in this EXACT format:
[
  {
    "requirements": ["Specific requirement from job 1", "Another requirement"],
    "responsibilities": ["Actual responsibility from job 1", "Another responsibility"],
    "qualifications": {
      "required": ["Must-have from job 1", "Required qualification"],
      "preferred": ["Nice-to-have from job 1", "Preferred skill"]
    },
    "keySkills": [
      {
        "name": "Python",
        "importance": 9,
        "category": "technical",
        "skillType": "programming",
        "context": "mentioned as primary language"
      }
    ],
    "technicalRequirements": [
      "Specific technical requirement from job 1",
      "Technical skill mentioned in posting"
    ],
    "toolsAndTechnologies": [
      "Specific tool mentioned",
      "Technology from job description"
    ],
    "experienceLevel": "mid",
    "yearsOfExperience": {
      "minimum": 3,
      "preferred": 5
    },
    "educationRequirements": ["Actual education requirement"],
    "benefits": ["Benefit mentioned in job"],
    "salary": {
      "min": 70000,
      "max": 110000,
      "currency": "USD"
    },
    "workArrangement": "remote",
    "industryContext": "technology",
    "roleCategory": "data-engineering",
    "technicalComplexity": "high",
    "leadershipRequired": false,
    "companyStage": "established"
  }
]

CRITICAL REQUIREMENTS:
- Extract ONLY information explicitly mentioned in each job description
- Skills importance: 9-10=critical, 7-8=very important, 5-6=important, 3-4=nice to have
- experienceLevel: Use ONLY single values from the list above
- workArrangement: Use ONLY "remote", "hybrid", "onsite", or "unknown"
- Focus on ROLE-SPECIFIC technical requirements and responsibilities
- Extract actual tools, technologies, and frameworks mentioned
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
        analyses.push(createRoleSpecificFallbackSingle());
      }
      
      // Trim if too many
      if (analyses.length > jobBatch.length) {
        analyses.splice(jobBatch.length);
      }
    }
    
    // Enhanced analyses with metadata and proper validation
    const enhancedAnalyses = analyses.map((analysis, index) => {
      // Normalize experience level to ensure it's valid
      analysis.experienceLevel = normalizeExperienceLevel(analysis.experienceLevel);
      
      // Ensure required fields for role-specific analysis
      if (!analysis.technicalRequirements) analysis.technicalRequirements = [];
      if (!analysis.toolsAndTechnologies) analysis.toolsAndTechnologies = [];
      
      return {
        ...analysis,
        analysisMetadata: {
          analyzedAt: new Date(),
          algorithmVersion: '4.0-batch-role-specific',
          model: 'gpt-4o',
          analysisType: 'ai_discovery_batch_role_specific',
          qualityLevel: 'role_specific_premium',
          batchIndex: index,
          batchSize: jobBatch.length,
          roleSpecificAnalysis: true,
          activeJobsDbOptimized: true
        }
      };
    });
    
    console.log(`✅ ROLE-SPECIFIC batch analysis completed: ${enhancedAnalyses.length} jobs analyzed with GPT-4o`);
    return enhancedAnalyses;
    
  } catch (error) {
    console.error('❌ Error in role-specific batch job analysis:', error);
    
    // Return role-specific fallback analyses for all jobs in batch
    return jobBatch.map((job, index) => ({
      ...createRoleSpecificFallbackSingle(),
      analysisMetadata: {
        analyzedAt: new Date(),
        algorithmVersion: '4.0-batch-role-specific-fallback',
        model: 'gpt-4o-fallback',
        analysisType: 'ai_discovery_batch_role_specific_fallback',
        error: error.message,
        batchIndex: index,
        batchSize: jobBatch.length,
        roleSpecificAnalysis: true,
        activeJobsDbOptimized: true
      }
    }));
  }
};

/**
 * Create role-specific fallback single analysis
 */
function createRoleSpecificFallbackSingle() {
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
        skillType: 'general',
        context: 'essential for role'
      },
      {
        name: 'Problem Solving',
        importance: 6,
        category: 'soft',
        skillType: 'general',
        context: 'required for success'
      }
    ],
    technicalRequirements: ['Technical skills relevant to role'],
    toolsAndTechnologies: ['Industry-standard tools'],
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
 * Enhanced content analysis with role-specific focus
 */
exports.analyzeJobContent = async (jobContent, jobInfo, isAiDiscovery = false) => {
  if (!jobContent) return null;
  
  try {
    const model = "gpt-4o";
    const maxTokens = 2500;
    
    console.log(`🤖 Analyzing job content with ROLE-SPECIFIC ${model}: "${jobInfo.title}"`);
    
    // Create role-specific content analysis prompt
    const prompt = createRoleSpecificContentPrompt(jobContent, jobInfo);

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are an expert job analyst. Extract comprehensive ROLE-SPECIFIC job data and return valid JSON only. Focus on actual requirements and technical details mentioned in the job content."
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
    
    // Normalize experience level
    if (analysis.experienceLevel) {
      analysis.experienceLevel = normalizeExperienceLevel(analysis.experienceLevel);
    }
    
    // Ensure role-specific fields
    if (!analysis.technicalRequirements) analysis.technicalRequirements = [];
    if (!analysis.toolsAndTechnologies) analysis.toolsAndTechnologies = [];
    
    // Add metadata
    analysis.analysisMetadata = {
      model: model,
      analysisType: isAiDiscovery ? 'ai_discovery_content_role_specific' : 'manual_content_role_specific',
      qualityLevel: 'role_specific_premium',
      analyzedAt: new Date(),
      roleSpecificAnalysis: true,
      activeJobsDbOptimized: true
    };
    
    console.log(`✅ ROLE-SPECIFIC content analysis completed with ${model} for "${jobInfo.title}"`);
    return analysis;
    
  } catch (error) {
    console.error(`❌ Error analyzing job content with role-specific approach:`, error);
    return generateBasicRoleSpecificContentAnalysis(jobContent, jobInfo, isAiDiscovery);
  }
};

/**
 * Create role-specific content analysis prompt
 */
function createRoleSpecificContentPrompt(jobContent, jobInfo) {
  const contentLength = 3500;
  const truncatedContent = jobContent.length > contentLength ? 
    jobContent.substring(0, contentLength) + '...' : jobContent;

  return `
    Analyze this job content and extract ROLE-SPECIFIC structured data:

    Job: ${jobInfo.title} at ${jobInfo.company}
    Content: ${truncatedContent}

    Return JSON with ACTUAL requirements and technical details mentioned:
    {
      "requirements": ["Specific requirement from content", "Another requirement"],
      "responsibilities": ["Actual responsibility mentioned", "Another responsibility"],
      "qualifications": {
        "required": ["Must have from content", "Required skill"],
        "preferred": ["Nice to have mentioned", "Preferred qualification"]
      },
      "technicalRequirements": [
        "Technical requirement from content",
        "Technical skill mentioned"
      ],
      "toolsAndTechnologies": [
        "Tool mentioned in job",
        "Technology from content"
      ],
      "salary": {
        "min": 70000,
        "max": 110000,
        "currency": "USD"
      },
      "benefits": ["Benefit mentioned", "Another benefit"],
      "jobType": "FULL_TIME",
      "experienceLevel": "mid",
      "workArrangement": "remote"
    }

    CRITICAL: 
    - Extract ONLY information explicitly mentioned in the job content
    - For experienceLevel, use ONLY: "entry", "junior", "mid", "senior", "lead", "principal", "executive"
    - For workArrangement, use ONLY: "remote", "hybrid", "onsite", "unknown"
    - Focus on ROLE-SPECIFIC technical requirements and tools
    - Be comprehensive with actual requirements and qualifications mentioned
    `;
}

/**
 * Generate basic role-specific content analysis
 */
function generateBasicRoleSpecificContentAnalysis(jobContent, jobInfo, isAiDiscovery = false) {
  console.log('🔄 Generating ROLE-SPECIFIC content analysis fallback...');
  
  try {
    const lowerContent = jobContent.toLowerCase();
    
    // Extract role-specific information
    const technicalRequirements = extractTechnicalRequirements(jobContent, jobInfo);
    const toolsAndTechnologies = extractToolsAndTechnologies(jobContent);
    
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
      requirements: technicalRequirements.slice(0, 3),
      responsibilities: ['Perform job duties as outlined', 'Work with team on projects'],
      qualifications: {
        required: technicalRequirements.slice(0, 2),
        preferred: []
      },
      technicalRequirements: technicalRequirements,
      toolsAndTechnologies: toolsAndTechnologies,
      salary: Object.keys(salary).length > 0 ? salary : null,
      benefits: [],
      jobType: 'FULL_TIME',
      experienceLevel: 'mid',
      workArrangement: workArrangement,
      fallbackReason: 'Role-specific model analysis failed',
      analysisMetadata: {
        model: 'gpt-4o-basic-fallback',
        analysisType: isAiDiscovery ? 'ai_discovery_role_specific' : 'manual_content_role_specific',
        qualityLevel: 'basic_fallback_role_specific',
        roleSpecificAnalysis: true,
        activeJobsDbOptimized: true
      }
    };
    
  } catch (error) {
    console.error('❌ Error in basic role-specific content analysis:', error);
    return {
      requirements: [],
      responsibilities: [],
      qualifications: { required: [], preferred: [] },
      technicalRequirements: [],
      toolsAndTechnologies: [],
      salary: null,
      benefits: [],
      jobType: 'FULL_TIME',
      experienceLevel: 'mid',
      workArrangement: 'unknown',
      error: true,
      analysisMetadata: {
        model: 'error-role-specific',
        analysisType: isAiDiscovery ? 'ai_discovery_role_specific' : 'manual_content_role_specific',
        qualityLevel: 'error_fallback_role_specific',
        roleSpecificAnalysis: true,
        activeJobsDbOptimized: true
      }
    };
  }
}

// Keep all existing helper functions from original file
function normalizeExperienceLevel(experienceLevel) {
  if (!experienceLevel || typeof experienceLevel !== 'string') {
    return 'mid';
  }
  
  const level = experienceLevel.toLowerCase().trim();
  
  if (level.includes('/') || level.includes('-')) {
    const parts = level.split(/[\/\-]/).map(p => p.trim());
    const levelPriority = {
      'entry': 1, 'junior': 2, 'mid': 3, 'senior': 4, 'lead': 5, 'principal': 6, 'executive': 7
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
    'entry': 'entry', 'entry-level': 'entry', 'entry level': 'entry', 'graduate': 'entry',
    'new grad': 'entry', 'intern': 'entry', 'associate': 'entry',
    'junior': 'junior', 'jr': 'junior', 'junior-level': 'junior',
    'mid': 'mid', 'middle': 'mid', 'mid-level': 'mid', 'intermediate': 'mid',
    'senior': 'senior', 'sr': 'senior', 'senior-level': 'senior',
    'lead': 'lead', 'team lead': 'lead', 'tech lead': 'lead', 'technical lead': 'lead',
    'principal': 'principal', 'staff': 'principal', 'architect': 'principal',
    'executive': 'executive', 'director': 'executive', 'vp': 'executive', 'vice president': 'executive',
    'c-level': 'executive', 'chief': 'executive'
  };
  
  if (levelMappings[level]) return levelMappings[level];
  
  for (const [key, value] of Object.entries(levelMappings)) {
    if (level.includes(key)) return value;
  }
  
  return 'mid';
}

function normalizeWorkArrangement(workArrangement) {
  if (!workArrangement || typeof workArrangement !== 'string') {
    return 'unknown';
  }
  
  const normalized = workArrangement.toLowerCase().trim();
  const mappings = {
    'remote': 'remote', 'fully remote': 'remote', 'work from home': 'remote', 'wfh': 'remote',
    'hybrid': 'hybrid', 'flex': 'hybrid', 'flexible': 'hybrid', 'mix': 'hybrid',
    'onsite': 'onsite', 'on-site': 'onsite', 'office': 'onsite', 'in-office': 'onsite'
  };
  
  if (mappings[normalized]) return mappings[normalized];
  
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key)) return value;
  }
  
  return 'unknown';
}

function inferExperienceLevel(description) {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('entry level') || lowerDesc.includes('0-2 years') || 
      lowerDesc.includes('new grad') || lowerDesc.includes('graduate')) {
    return 'entry';
  }
  
  if (lowerDesc.includes('junior') && !lowerDesc.includes('senior')) {
    return 'junior';
  }
  
  if (lowerDesc.includes('3-5 years') || lowerDesc.includes('mid level')) {
    return 'mid';
  }
  
  if (lowerDesc.includes('senior') || lowerDesc.includes('5+ years')) {
    return 'senior';
  }
  
  if (lowerDesc.includes('lead') || lowerDesc.includes('8+ years')) {
    return 'lead';
  }
  
  if (lowerDesc.includes('principal') || lowerDesc.includes('10+ years')) {
    return 'principal';
  }
  
  if (lowerDesc.includes('director') || lowerDesc.includes('executive')) {
    return 'executive';
  }
  
  return 'mid';
}

function inferYearsOfExperience(description, experienceLevel) {
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
  
  if (lowerDesc.includes('remote') || lowerDesc.includes('work from home')) {
    if (lowerDesc.includes('office') || lowerDesc.includes('hybrid')) {
      return 'hybrid';
    }
    return 'remote';
  }
  
  if (lowerDesc.includes('hybrid') || lowerDesc.includes('flexible')) {
    return 'hybrid';
  }
  
  if (lowerDesc.includes('on-site') || lowerDesc.includes('onsite')) {
    return 'onsite';
  }
  
  return 'unknown';
}

/**
 * Re-analyze a job with updated role-specific algorithm
 */
exports.reAnalyzeJob = async (jobId) => {
  try {
    const Job = require('../models/mongodb/job.model');
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    console.log(`🔄 Re-analyzing job with ROLE-SPECIFIC quality: ${job.title} at ${job.company}`);
    
    // Re-analyze with role-specific GPT-4o approach
    const updatedAnalysis = await this.analyzeJob(job.description, {
      title: job.title,
      company: job.company,
      location: job.location
    }, { 
      isAiDiscovery: false,
      prioritizeCost: false 
    });
    
    // Update the job with new analysis
    job.parsedData = updatedAnalysis;
    job.updatedAt = new Date();
    await job.save();
    
    console.log('✅ ROLE-SPECIFIC job re-analysis completed successfully');
    return updatedAnalysis;
    
  } catch (error) {
    console.error('❌ Error re-analyzing job:', error);
    throw error;
  }
};

/**
 * Batch analyze multiple jobs with role-specific quality
 */
exports.batchAnalyzeJobs = async (jobIds, isAiDiscovery = false) => {
  const results = {
    successful: [],
    failed: [],
    total: jobIds.length,
    modelUsed: 'gpt-4o',
    qualityLevel: 'role_specific_premium',
    estimatedCost: '$0.02-0.03 per job'
  };
  
  console.log(`🔬 Starting ROLE-SPECIFIC batch analysis of ${jobIds.length} jobs with ${results.modelUsed}...`);
  
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
        prioritizeCost: false
      });
      
      job.parsedData = analysis;
      job.updatedAt = new Date();
      await job.save();
      
      results.successful.push({ jobId, analysis });
      
    } catch (error) {
      console.error(`❌ Failed to analyze job ${jobId}:`, error);
      results.failed.push({ jobId, error: error.message });
    }
  }
  
  console.log(`✅ ROLE-SPECIFIC batch analysis completed: ${results.successful.length} successful, ${results.failed.length} failed`);
  return results;
};