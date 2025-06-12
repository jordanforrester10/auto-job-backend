// services/jobMatching.service.js - UPDATED TO AUTO-SELECT BEST RESUME
const Job = require('../models/mongodb/job.model');
const Resume = require('../models/mongodb/resume.model');
const { openai } = require('../config/openai');

/**
 * Find the best resume for a user to match against a job
 * @param {string} userId - User ID
 * @param {string} jobId - Job ID (optional, for tailored resume detection)
 * @returns {Object} Best resume for matching
 */
async function findBestResumeForMatching(userId, jobId = null) {
  try {
    // Get all user's resumes
    const allResumes = await Resume.find({ userId }).sort({ createdAt: -1 });
    
    if (!allResumes || allResumes.length === 0) {
      throw new Error('No resumes found for user');
    }
    
    // First, check if there's a tailored resume specifically for this job
    if (jobId) {
      const tailoredResume = allResumes.find(resume => 
        resume.isTailored && 
        resume.tailoredForJob?.jobId && 
        resume.tailoredForJob.jobId.toString() === jobId.toString()
      );
      
      if (tailoredResume) {
        console.log(`Found tailored resume for job ${jobId}:`, {
          resumeId: tailoredResume._id,
          name: tailoredResume.name,
          overallScore: tailoredResume.analysis?.overallScore
        });
        return tailoredResume;
      }
    }
    
    // If no job-specific tailored resume, find the highest scoring resume
    const resumesWithScores = allResumes
      .filter(resume => resume.analysis && resume.analysis.overallScore)
      .sort((a, b) => b.analysis.overallScore - a.analysis.overallScore);
    
    if (resumesWithScores.length > 0) {
      const bestResume = resumesWithScores[0];
      console.log(`Selected best resume by score:`, {
        resumeId: bestResume._id,
        name: bestResume.name,
        overallScore: bestResume.analysis.overallScore,
        isTailored: bestResume.isTailored
      });
      return bestResume;
    }
    
    // Fallback to most recent resume
    const fallbackResume = allResumes[0];
    console.log(`Fallback to most recent resume:`, {
      resumeId: fallbackResume._id,
      name: fallbackResume.name
    });
    return fallbackResume;
    
  } catch (error) {
    console.error('Error finding best resume for matching:', error);
    throw error;
  }
}

/**
 * Enhanced job matching with automatic best resume selection
 * @param {string} jobId - MongoDB ID of the job
 * @param {string} resumeId - MongoDB ID of the resume (optional - will auto-select if not provided)
 * @param {string} userId - User ID (for auto-selection)
 * @returns {Object} Match analysis results with accurate scoring
 */
exports.matchJobWithBestResume = async (jobId, userId, specificResumeId = null) => {
  try {
    console.log(`Starting intelligent job matching for job ${jobId}, user ${userId}`);
    
    // Get the job
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Find the best resume to use for matching
    let resume;
    if (specificResumeId) {
      // Use specific resume if provided
      resume = await Resume.findOne({ _id: specificResumeId, userId });
      if (!resume) {
        throw new Error('Specified resume not found');
      }
      console.log(`Using specified resume: ${resume.name}`);
    } else {
      // Auto-select best resume
      resume = await findBestResumeForMatching(userId, jobId);
    }
    
    console.log(`Starting enhanced matching for job "${job.title}" with resume "${resume.name}"`);
    
    // Perform the actual matching
    const matchAnalysis = await this.matchResumeWithJob(resume._id, jobId);
    
    // Update the job with the new match analysis
    job.matchAnalysis = {
      ...matchAnalysis,
      resumeId: resume._id,
      lastAnalyzed: new Date(),
      analysisVersion: '2.0-auto-best'
    };
    
    await job.save();
    
    console.log(`Job match updated with best resume. Score: ${matchAnalysis.overallScore}%`);
    
    return {
      matchAnalysis,
      usedResume: {
        id: resume._id,
        name: resume.name,
        isTailored: resume.isTailored,
        overallScore: resume.analysis?.overallScore
      }
    };
    
  } catch (error) {
    console.error('Error in enhanced job matching:', error);
    throw error;
  }
};

/**
 * Enhanced job matching with more intelligent scoring
 * @param {string} resumeId - MongoDB ID of the resume
 * @param {string} jobId - MongoDB ID of the job
 * @returns {Object} Match analysis results with accurate scoring
 */
exports.matchResumeWithJob = async (resumeId, jobId) => {
  try {
    console.log(`Starting enhanced matching for resume ${resumeId} with job ${jobId}`);
    
    // Get the resume and job from the database
    const resume = await Resume.findById(resumeId);
    const job = await Job.findById(jobId);
    
    if (!resume) {
      throw new Error('Resume not found');
    }
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Check if parsed data is available for both
    if (!resume.parsedData || Object.keys(resume.parsedData).length === 0) {
      throw new Error('Resume parsing data not available for matching');
    }
    
    if (!job.parsedData || Object.keys(job.parsedData).length === 0) {
      throw new Error('Job analysis data not available for matching');
    }
    
    console.log('Performing intelligent job-resume matching with OpenAI...');
    
    // Create detailed prompts for more accurate analysis
    const resumeSkills = extractSkillsFromResume(resume.parsedData);
    const jobSkills = extractSkillsFromJob(job.parsedData);
    const resumeExperience = extractExperienceFromResume(resume.parsedData);
    const jobRequirements = extractRequirementsFromJob(job.parsedData);
    
    // Check if this is a tailored resume for bonus consideration
    const isTailoredForThisJob = resume.isTailored && 
      resume.tailoredForJob?.jobId && 
      resume.tailoredForJob.jobId.toString() === jobId.toString();
    
    // Enhanced prompt for more precise matching
    const prompt = `
    You are an expert ATS (Applicant Tracking System) and recruitment analyst. Perform a detailed match analysis between this resume and job posting.

    IMPORTANT: Provide realistic and accurate scores based on actual content matching. ${isTailoredForThisJob ? 'This resume has been AI-tailored specifically for this job, so it should score higher than a generic resume.' : 'Avoid giving inflated scores.'}

    **JOB POSTING:**
    Title: ${job.title}
    Company: ${job.company}
    Description: ${job.description}
    
    **JOB REQUIREMENTS ANALYSIS:**
    Required Skills: ${JSON.stringify(jobSkills.required)}
    Preferred Skills: ${JSON.stringify(jobSkills.preferred)}
    Experience Level: ${job.parsedData.experienceLevel || 'Not specified'}
    Education Requirements: ${JSON.stringify(job.parsedData.educationRequirements)}
    Key Requirements: ${JSON.stringify(jobRequirements)}

    **CANDIDATE RESUME:**
    Summary: ${resume.parsedData.summary || 'No summary provided'}
    Skills: ${JSON.stringify(resumeSkills)}
    Experience: ${JSON.stringify(resumeExperience)}
    Education: ${JSON.stringify(resume.parsedData.education)}
    ${isTailoredForThisJob ? 'NOTE: This resume has been specifically tailored for this job posting.' : ''}

    **MATCHING CRITERIA:**
    1. **Skills Match (40% weight)**: Compare required vs candidate skills
    2. **Experience Match (35% weight)**: Evaluate relevant experience depth and breadth
    3. **Education Match (25% weight)**: Check education requirements vs candidate background

    **SCORING GUIDELINES:**
    - 95-100%: Perfect match, candidate exceeds all requirements ${isTailoredForThisJob ? '(expected for tailored resumes)' : ''}
    - 85-94%: Excellent match, candidate meets all core requirements with strong alignment
    - 75-84%: Very good match, candidate meets most requirements
    - 65-74%: Good match, candidate meets core requirements with some gaps
    - 55-64%: Moderate match, candidate has potential but significant gaps
    - Below 55%: Poor match, major misalignment

    ${isTailoredForThisJob ? 'TAILORED RESUME BONUS: This resume should score 10-15 points higher than the original due to optimization.' : ''}

    Provide analysis in this EXACT JSON format:
    {
      "overallScore": <realistic number 0-100>,
      "categoryScores": {
        "skills": <realistic number 0-100>,
        "experience": <realistic number 0-100>,
        "education": <realistic number 0-100>
      },
      "matchedSkills": [
        {
          "skill": "exact skill name from job",
          "found": true/false,
          "importance": <1-10 scale>,
          "matchQuality": "exact|partial|related|none",
          "resumeEvidence": "where found in resume or null"
        }
      ],
      "missingSkills": [
        {
          "skill": "missing skill name",
          "importance": <1-10 scale>,
          "category": "required|preferred",
          "suggestionToAdd": "specific advice"
        }
      ],
      "experienceAnalysis": {
        "totalYearsExperience": <number>,
        "relevantYearsExperience": <number>,
        "seniorityMatch": "junior|mid|senior|executive",
        "industryAlignment": "high|medium|low",
        "roleAlignment": "high|medium|low"
      },
      "educationAnalysis": {
        "degreeMatch": "exceeds|meets|partial|none",
        "fieldAlignment": "high|medium|low",
        "certificationBonus": true/false
      },
      "improvementSuggestions": [
        "specific actionable suggestion 1",
        "specific actionable suggestion 2",
        "specific actionable suggestion 3"
      ],
      "strengthsHighlight": [
        "key strength 1",
        "key strength 2",
        "key strength 3"
      ]
    }

    **IMPORTANT**: ${isTailoredForThisJob ? 'This is a tailored resume - expect scores in the 85-95% range due to optimization.' : 'Base scores on actual content analysis, not generic assumptions. Be critical and realistic in scoring.'}
    `;

    // Call OpenAI API with enhanced model settings
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: `You are an expert ATS system and senior recruitment analyst with 15+ years of experience. You provide realistic, accurate match scores based on detailed analysis. ${isTailoredForThisJob ? 'You recognize when resumes have been optimized for specific jobs and score them appropriately higher.' : 'You never inflate scores and always provide evidence-based assessments.'} Return ONLY valid JSON without markdown formatting.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Lower temperature for more consistent scoring
      max_tokens: 4000,
    });

    // Parse and validate the response
    const content = response.choices[0].message.content.trim();
    console.log('OpenAI Response received, parsing...');
    
    let matchAnalysis;
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
      
      matchAnalysis = JSON.parse(jsonStr);
      
      // Validate and ensure realistic scoring
      matchAnalysis = validateAndNormalizeScores(matchAnalysis);
      
      console.log(`Enhanced matching completed - Overall Score: ${matchAnalysis.overallScore}%`);
      
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Raw response:', content);
      throw new Error('Failed to parse AI response');
    }

    // Add additional metadata
    matchAnalysis.analysisMetadata = {
      resumeId,
      jobId,
      analyzedAt: new Date(),
      algorithmVersion: '2.0',
      isTailoredResume: isTailoredForThisJob
    };

    return matchAnalysis;
    
  } catch (error) {
    console.error('Error in enhanced job matching:', error);
    
    // More intelligent fallback based on available data
    return generateIntelligentFallback(resume, job, error);
  }
};

/**
 * Extract skills from resume data
 */
function extractSkillsFromResume(parsedData) {
  const skills = [];
  
  // From skills section
  if (parsedData.skills && Array.isArray(parsedData.skills)) {
    parsedData.skills.forEach(skill => {
      if (typeof skill === 'string') {
        skills.push(skill);
      } else if (skill && skill.name) {
        skills.push(skill.name);
      }
    });
  }
  
  // From experience highlights
  if (parsedData.experience && Array.isArray(parsedData.experience)) {
    parsedData.experience.forEach(exp => {
      if (exp.skills && Array.isArray(exp.skills)) {
        skills.push(...exp.skills);
      }
    });
  }
  
  return [...new Set(skills)]; // Remove duplicates
}

/**
 * Extract skills from job data
 */
function extractSkillsFromJob(parsedData) {
  const required = [];
  const preferred = [];
  
  // From key skills
  if (parsedData.keySkills && Array.isArray(parsedData.keySkills)) {
    parsedData.keySkills.forEach(skill => {
      if (typeof skill === 'string') {
        required.push(skill);
      } else if (skill && skill.name) {
        const importance = skill.importance || 5;
        if (importance >= 7) {
          required.push(skill.name);
        } else {
          preferred.push(skill.name);
        }
      }
    });
  }
  
  // From qualifications
  if (parsedData.qualifications) {
    if (parsedData.qualifications.required) {
      required.push(...parsedData.qualifications.required);
    }
    if (parsedData.qualifications.preferred) {
      preferred.push(...parsedData.qualifications.preferred);
    }
  }
  
  return {
    required: [...new Set(required)],
    preferred: [...new Set(preferred)]
  };
}

/**
 * Extract experience from resume
 */
function extractExperienceFromResume(parsedData) {
  if (!parsedData.experience || !Array.isArray(parsedData.experience)) {
    return [];
  }
  
  return parsedData.experience.map(exp => ({
    company: exp.company,
    title: exp.title,
    duration: calculateDuration(exp.startDate, exp.endDate),
    description: exp.description,
    highlights: exp.highlights || []
  }));
}

/**
 * Extract requirements from job
 */
function extractRequirementsFromJob(parsedData) {
  const requirements = [];
  
  if (parsedData.requirements && Array.isArray(parsedData.requirements)) {
    requirements.push(...parsedData.requirements);
  }
  
  if (parsedData.responsibilities && Array.isArray(parsedData.responsibilities)) {
    requirements.push(...parsedData.responsibilities);
  }
  
  return requirements;
}

/**
 * Calculate duration between two dates
 */
function calculateDuration(startDate, endDate) {
  if (!startDate) return 0;
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  const diffTime = Math.abs(end - start);
  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  
  return diffMonths;
}

/**
 * Validate and normalize scores to ensure realistic ranges
 */
function validateAndNormalizeScores(analysis) {
  // Ensure overall score is reasonable based on category scores
  if (analysis.categoryScores) {
    const { skills, experience, education } = analysis.categoryScores;
    
    // Weighted average: Skills 40%, Experience 35%, Education 25%
    const calculatedOverall = Math.round((skills * 0.4) + (experience * 0.35) + (education * 0.25));
    
    // If provided overall score is significantly different, use calculated
    if (Math.abs(analysis.overallScore - calculatedOverall) > 10) {
      analysis.overallScore = calculatedOverall;
    }
  }
  
  // Ensure scores are within valid range
  analysis.overallScore = Math.max(0, Math.min(100, analysis.overallScore));
  if (analysis.categoryScores) {
    analysis.categoryScores.skills = Math.max(0, Math.min(100, analysis.categoryScores.skills));
    analysis.categoryScores.experience = Math.max(0, Math.min(100, analysis.categoryScores.experience));
    analysis.categoryScores.education = Math.max(0, Math.min(100, analysis.categoryScores.education));
  }
  
  return analysis;
}

/**
 * Generate intelligent fallback when AI analysis fails
 */
function generateIntelligentFallback(resume, job, error) {
  console.log('Generating intelligent fallback analysis...');
  
  try {
    // Basic skills matching
    const resumeSkills = extractSkillsFromResume(resume.parsedData);
    const jobSkills = extractSkillsFromJob(job.parsedData);
    
    // Calculate basic skill match percentage
    const allJobSkills = [...jobSkills.required, ...jobSkills.preferred];
    const matchedSkills = resumeSkills.filter(skill => 
      allJobSkills.some(jobSkill => 
        skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
    
    const skillsScore = allJobSkills.length > 0 ? 
      Math.round((matchedSkills.length / allJobSkills.length) * 100) : 50;
    
    // Basic experience scoring
    const experienceYears = resume.parsedData.experience ? 
      resume.parsedData.experience.length * 2 : 0; // Rough estimate
    
    let experienceScore = 40;
    if (experienceYears >= 5) experienceScore = 75;
    if (experienceYears >= 8) experienceScore = 85;
    if (experienceYears >= 12) experienceScore = 95;
    
    // Basic education scoring
    const hasEducation = resume.parsedData.education && 
      resume.parsedData.education.length > 0;
    const educationScore = hasEducation ? 70 : 40;
    
    // Calculate weighted overall score
    const overallScore = Math.round(
      (skillsScore * 0.4) + (experienceScore * 0.35) + (educationScore * 0.25)
    );
    
    return {
      overallScore,
      categoryScores: {
        skills: skillsScore,
        experience: experienceScore,
        education: educationScore
      },
      matchedSkills: matchedSkills.map(skill => ({
        skill,
        found: true,
        importance: 5,
        matchQuality: 'partial',
        resumeEvidence: 'Skills section'
      })),
      missingSkills: allJobSkills
        .filter(skill => !matchedSkills.includes(skill))
        .slice(0, 5)
        .map(skill => ({
          skill,
          importance: 6,
          category: 'required',
          suggestionToAdd: `Consider highlighting experience with ${skill} if you have it`
        })),
      improvementSuggestions: [
        'Analysis temporarily unavailable - basic matching performed',
        'Consider highlighting relevant skills mentioned in the job posting',
        'Quantify your achievements with specific metrics and results'
      ],
      strengthsHighlight: [
        'Resume structure is well-organized',
        'Relevant work experience present',
        'Skills section is comprehensive'
      ],
      fallbackReason: error.message,
      analysisMetadata: {
        resumeId: resume._id,
        jobId: job._id,
        analyzedAt: new Date(),
        algorithmVersion: '2.0-fallback'
      }
    };
    
  } catch (fallbackError) {
    console.error('Error in fallback analysis:', fallbackError);
    
    // Final fallback with very basic scores
    return {
      overallScore: 45,
      categoryScores: {
        skills: 40,
        experience: 50,
        education: 45
      },
      matchedSkills: [],
      missingSkills: [],
      improvementSuggestions: [
        'Unable to complete detailed analysis at this time',
        'Please ensure your resume includes relevant skills for this position',
        'Try the analysis again later for more detailed insights'
      ],
      strengthsHighlight: [
        'Resume uploaded successfully',
        'Basic profile information captured'
      ],
      errorDetails: error.message,
      analysisMetadata: {
        resumeId: resume._id,
        jobId: job._id,
        analyzedAt: new Date(),
        algorithmVersion: '2.0-error-fallback'
      }
    };
  }
}