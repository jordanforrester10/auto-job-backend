// services/jobMatching.service.js - UPDATED WITH CONTEXTUAL AI RECOMMENDATIONS
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
    const finalMatchAnalysis = {
      ...matchAnalysis,
      resumeId: resume._id,
      lastAnalyzed: new Date(),
      analysisVersion: '3.0-contextual-ai'
    };
    
    // CRITICAL: Save improvement suggestions to improvementAreas (matches database schema)
    if (matchAnalysis.improvementSuggestions && Array.isArray(matchAnalysis.improvementSuggestions)) {
      finalMatchAnalysis.improvementAreas = matchAnalysis.improvementSuggestions;
      console.log('✅ Saving improvement suggestions to improvementAreas field');
      console.log('🔍 DEBUG: improvementSuggestions array:', JSON.stringify(matchAnalysis.improvementSuggestions));
      console.log('🔍 DEBUG: finalMatchAnalysis.improvementAreas set to:', JSON.stringify(finalMatchAnalysis.improvementAreas));
    } else {
      // Force generation if missing
      const fallbackSuggestions = generateContextualImprovements(resume, job, matchAnalysis.overallScore);
      finalMatchAnalysis.improvementAreas = fallbackSuggestions;
      console.log('🔧 Generated fallback improvement suggestions:', fallbackSuggestions);
      console.log('🔍 DEBUG: finalMatchAnalysis.improvementAreas set to fallback:', JSON.stringify(finalMatchAnalysis.improvementAreas));
    }
    
    // Ensure strengths are included
    if (matchAnalysis.strengthsHighlight && Array.isArray(matchAnalysis.strengthsHighlight)) {
      finalMatchAnalysis.strengthsHighlight = matchAnalysis.strengthsHighlight;
      finalMatchAnalysis.strengthAreas = matchAnalysis.strengthsHighlight; // Legacy compatibility
    } else {
      const fallbackStrengths = generateContextualStrengths(resume, job);
      finalMatchAnalysis.strengthsHighlight = fallbackStrengths;
      finalMatchAnalysis.strengthAreas = fallbackStrengths;
    }
    
    job.matchAnalysis = finalMatchAnalysis;
    
    // CRITICAL: Verify data before saving with detailed logging
    console.log(`💾 About to save job with match analysis:`);
    console.log(`   - Overall Score: ${job.matchAnalysis.overallScore}%`);
    console.log(`   - Improvement Areas: ${job.matchAnalysis.improvementAreas?.length || 0}`);
    console.log(`   - Actual suggestions: ${JSON.stringify(job.matchAnalysis.improvementAreas?.slice(0, 2))}`);
    console.log(`   - Job ID: ${jobId}`);
    console.log(`   - Resume ID: ${resume._id}`);
    console.log('🔍 DEBUG: Full job.matchAnalysis object before save:', JSON.stringify(job.matchAnalysis, null, 2));
    
    await job.save();
    
    // 🔍 DEBUG: Check job immediately after save
    console.log('🔍 DEBUG: job.matchAnalysis.improvementAreas immediately after save:', JSON.stringify(job.matchAnalysis.improvementAreas));
    
    // VERIFICATION: Re-fetch the job to confirm data was saved
    const savedJob = await Job.findById(jobId);
    const savedAreas = savedJob.matchAnalysis?.improvementAreas?.length || 0;
    console.log(`✅ Job saved and verified:`);
    console.log(`   - ${savedAreas} improvement areas persisted`);
    console.log(`   - Saved suggestions: ${JSON.stringify(savedJob.matchAnalysis?.improvementAreas?.slice(0, 2))}`);
    
    if (savedAreas === 0 && matchAnalysis.overallScore < 70) {
      console.log('🚨 WARNING: Low score job saved without improvement suggestions!');
      console.log('🚨 Raw matchAnalysis object:', JSON.stringify(job.matchAnalysis, null, 2));
    }
    
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
 * Enhanced job matching with contextual AI recommendations
 * @param {string} resumeId - MongoDB ID of the resume
 * @param {string} jobId - MongoDB ID of the job
 * @returns {Object} Match analysis results with contextual recommendations
 */
exports.matchResumeWithJob = async (resumeId, jobId) => {
  try {
    console.log(`Starting contextual AI matching for resume ${resumeId} with job ${jobId}`);
    
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
    
    console.log('Performing contextual AI job-resume matching with OpenAI...');
    
    // Create detailed prompts for contextual analysis
    const resumeSkills = extractSkillsFromResume(resume.parsedData);
    const jobSkills = extractSkillsFromJob(job.parsedData);
    const resumeExperience = extractExperienceFromResume(resume.parsedData);
    const jobRequirements = extractRequirementsFromJob(job.parsedData);
    
    // Check if this is a tailored resume for bonus consideration
    const isTailoredForThisJob = resume.isTailored && 
      resume.tailoredForJob?.jobId && 
      resume.tailoredForJob.jobId.toString() === jobId.toString();
    
    // ENHANCED: Updated prompt for clean recommendations without "CONTEXTUAL" prefix
    const prompt = `
    You are an expert career coach and ATS specialist. Analyze this specific resume against this specific job posting and provide PERSONALIZED recommendations based on the actual content and gaps you identify.

    IMPORTANT: Your recommendations must be based on:
    1. What's actually IN the candidate's resume
    2. What's specifically REQUIRED in this job posting
    3. The exact GAPS between them
    4. How to bridge those gaps with SPECIFIC, actionable advice

    **JOB POSTING DETAILS:**
    Title: ${job.title}
    Company: ${job.company}
    Description: ${job.description}
    
    **JOB REQUIREMENTS:**
    Required Skills: ${JSON.stringify(jobSkills.required)}
    Preferred Skills: ${JSON.stringify(jobSkills.preferred)}
    Experience Level: ${job.parsedData.experienceLevel || 'Not specified'}
    Education Requirements: ${JSON.stringify(job.parsedData.educationRequirements)}
    Key Requirements: ${JSON.stringify(jobRequirements)}
    Technical Requirements: ${JSON.stringify(job.parsedData.technicalRequirements || [])}
    Tools & Technologies: ${JSON.stringify(job.parsedData.toolsAndTechnologies || [])}

    **CANDIDATE'S RESUME CONTENT:**
    Summary: ${resume.parsedData.summary || 'No summary provided'}
    Skills Listed: ${JSON.stringify(resumeSkills)}
    Experience Details: ${JSON.stringify(resumeExperience)}
    Education: ${JSON.stringify(resume.parsedData.education)}
    ${isTailoredForThisJob ? 'NOTE: This resume has been specifically tailored for this job posting.' : ''}

    **ANALYSIS REQUIREMENTS:**

    1. **Skills Analysis**: Compare EXACTLY what skills the candidate has vs. what the job needs
    2. **Experience Analysis**: Look at their actual work experience vs. job requirements
    3. **Gap Analysis**: Identify SPECIFIC missing elements and how to address them
    4. **Personalized Recommendations**: Provide advice that references their actual resume content

    **SCORING GUIDELINES (Be Realistic and Context-Aware):**
    - 90-100%: Exceptional match, candidate exceeds requirements with relevant experience
    - 80-89%: Strong match, candidate meets most requirements with good experience alignment
    - 70-79%: Good match, candidate meets core requirements with some gaps
    - 60-69%: Moderate match, candidate has potential but notable gaps exist
    - 50-59%: Poor match, significant gaps in required skills/experience
    - Below 50%: Very poor match, major misalignment between candidate and role

    **IMPROVEMENT SUGGESTIONS MUST BE:**
    - **Specific to their resume content**: Reference their actual work and how to enhance it
    - **Targeted to job requirements**: Connect directly to what this role needs
    - **Actionable**: Give exact wording changes, not generic advice
    - **Personalized**: Reference their actual skills/experience and how to better position them

    Provide analysis in this EXACT JSON format:
    {
      "overallScore": <realistic number 0-100 based on actual content match>,
      "categoryScores": {
        "skills": <realistic score based on skill overlap>,
        "experience": <realistic score based on experience relevance>,
        "education": <realistic score based on education match>
      },
      "matchedSkills": [
        {
          "skill": "exact skill name from job requirements",
          "found": true/false,
          "importance": <1-10 scale based on job requirements>,
          "matchQuality": "exact|partial|related|none",
          "resumeEvidence": "specific evidence from their resume where this skill is demonstrated"
        }
      ],
      "missingSkills": [
        {
          "skill": "specific missing skill from job requirements",
          "importance": <1-10 scale>,
          "category": "required|preferred",
          "suggestionToAdd": "Personalized advice on how they can highlight or develop this skill based on their background"
        }
      ],
      "experienceAnalysis": {
        "totalYearsExperience": <calculated from their actual experience>,
        "relevantYearsExperience": <years of directly relevant experience>,
        "seniorityMatch": "entry|junior|mid|senior|executive",
        "industryAlignment": "high|medium|low",
        "roleAlignment": "high|medium|low",
        "experienceGaps": "specific analysis of what experience they're missing vs job requirements"
      },
      "educationAnalysis": {
        "degreeMatch": "exceeds|meets|partial|none",
        "fieldAlignment": "high|medium|low",
        "certificationBonus": true/false,
        "educationRecommendations": "specific advice based on their education vs job requirements"
      },
      "improvementSuggestions": [
        "Your project management experience at [Company] should emphasize specific metrics and outcomes that align with this role's requirements",
        "Highlight your database work by mentioning specific technologies like PostgreSQL that this position uses daily",
        "Expand your leadership examples to include cross-functional team coordination, which is crucial for this role"
      ],
      "strengthsHighlight": [
        "Your experience with cloud platforms at [Company] directly aligns with their infrastructure needs",
        "Strong technical background in [specific skill] gives you an advantage for this position",
        "Leadership experience managing teams of [size] matches well with this role's requirements"
      ],
      "contextualKeywords": [
        "specific keyword from job posting they should add to resume",
        "industry term they should incorporate based on their background",
        "technical skill they should emphasize more prominently"
      ]
    }

    **CRITICAL**: Your analysis must be based on the ACTUAL CONTENT comparison. Provide direct, actionable suggestions without prefixes or labels - just clear, specific recommendations that reference their real experience and the job's actual requirements.

    **EXAMPLES OF GOOD RECOMMENDATIONS:**
    - "Your database experience at TechCorp should specifically mention PostgreSQL since that's the primary database this role uses. Expand your 'database optimization' bullet point to include specific query performance improvements you achieved."
    - "Highlight your AWS experience from the cloud migration project - this role specifically requires AWS expertise for their multi-cloud strategy."
    - "Your leadership role at StartupCo should emphasize the team size (5 engineers) and project outcomes since this position involves managing similar teams."

    Return ONLY valid JSON without markdown formatting.
    `;

    // Call OpenAI API with enhanced model settings for contextual analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: `You are an expert career coach and ATS analyst who provides PERSONALIZED resume recommendations. You analyze the specific content of each resume against specific job requirements and provide targeted advice that references actual resume content and job needs. ${isTailoredForThisJob ? 'You recognize when resumes have been optimized for specific jobs and score them appropriately higher.' : 'You provide realistic scores based on content alignment.'} Return ONLY valid JSON without markdown formatting. Provide clear, direct recommendations without any prefixes or labels.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Lower temperature for more consistent analysis
      max_tokens: 4000,
    });

    // Parse and validate the response
    const content = response.choices[0].message.content.trim();
    console.log('Contextual AI Response received, parsing...');
    
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
      
      // Validate and ensure contextual analysis
      matchAnalysis = validateContextualAnalysis(matchAnalysis, resume, job);
      
      // CRITICAL: Ensure improvement suggestions are properly included
      if (!matchAnalysis.improvementSuggestions || !Array.isArray(matchAnalysis.improvementSuggestions)) {
        console.log('🚨 Missing improvement suggestions in AI response, generating fallback');
        matchAnalysis.improvementSuggestions = generateContextualImprovements(resume, job, matchAnalysis.overallScore);
      }
      
      // Log what we're about to save
      console.log(`📊 Saving match analysis with ${matchAnalysis.improvementSuggestions?.length || 0} improvement suggestions`);
      console.log(`📝 Improvement suggestions: ${JSON.stringify(matchAnalysis.improvementSuggestions?.slice(0, 2))}`);
      console.log(`🔄 These will be saved to improvementAreas field to match database schema`);
      
      console.log(`Contextual AI matching completed - Overall Score: ${matchAnalysis.overallScore}%`);
      console.log(`Generated ${matchAnalysis.improvementSuggestions?.length || 0} contextual improvement suggestions`);
      
    } catch (parseError) {
      console.error('Error parsing contextual AI response:', parseError);
      console.log('Raw response:', content);
      throw new Error('Failed to parse contextual AI response');
    }

    // Add additional metadata
    matchAnalysis.analysisMetadata = {
      resumeId,
      jobId,
      analyzedAt: new Date(),
      algorithmVersion: '3.0-contextual-ai',
      isTailoredResume: isTailoredForThisJob,
      analysisType: 'contextual-personalized'
    };

    return matchAnalysis;
    
  } catch (error) {
    console.error('Error in contextual AI job matching:', error);
    
    // Contextual fallback based on available data
    return generateContextualFallback(resume, job, error);
  }
};

/**
 * Validate and enhance contextual analysis
 */
function validateContextualAnalysis(analysis, resume, job) {
  // Ensure required fields exist with contextual defaults
  if (!analysis.improvementSuggestions || !Array.isArray(analysis.improvementSuggestions)) {
    console.log('🔧 Creating improvement suggestions array');
    analysis.improvementSuggestions = [];
  }
  
  // Filter out any empty/invalid suggestions
  if (analysis.improvementSuggestions && Array.isArray(analysis.improvementSuggestions)) {
    const originalCount = analysis.improvementSuggestions.length;
    analysis.improvementSuggestions = analysis.improvementSuggestions.filter(suggestion => 
      suggestion && typeof suggestion === 'string' && suggestion.trim().length > 0
    );
    const filteredCount = analysis.improvementSuggestions.length;
    
    if (originalCount !== filteredCount) {
      console.log(`🧹 Filtered improvement suggestions: ${originalCount} -> ${filteredCount}`);
    }
  }
  
  if (!analysis.strengthsHighlight || !Array.isArray(analysis.strengthsHighlight)) {
    analysis.strengthsHighlight = generateContextualStrengths(resume, job);
  }
  
  if (!analysis.contextualKeywords || !Array.isArray(analysis.contextualKeywords)) {
    analysis.contextualKeywords = generateContextualKeywords(resume, job);
  }
  
  // Ensure scores are realistic and contextual
  analysis.overallScore = Math.max(0, Math.min(100, analysis.overallScore || 0));
  
  // CRITICAL: Ensure low scores have substantial improvement suggestions
  if (analysis.overallScore < 60 && analysis.improvementSuggestions.length < 3) {
    console.log('🚨 Low score detected, ensuring adequate improvement suggestions');
    const additionalImprovements = generateContextualImprovements(resume, job, analysis.overallScore);
    analysis.improvementSuggestions = [
      ...analysis.improvementSuggestions,
      ...additionalImprovements.slice(0, Math.max(0, 3 - analysis.improvementSuggestions.length))
    ];
    console.log(`✅ Added ${additionalImprovements.length} additional improvement suggestions`);
  }
  
  // Ensure high scores have fewer, more targeted suggestions
  if (analysis.overallScore > 80 && analysis.improvementSuggestions.length > 2) {
    analysis.improvementSuggestions = analysis.improvementSuggestions.slice(0, 2);
    console.log('✂️ Trimmed improvement suggestions for high score');
  }
  
  // Final validation log
  console.log(`📋 Final validation: ${analysis.improvementSuggestions.length} improvement suggestions for ${analysis.overallScore}% score`);
  
  return analysis;
}

/**
 * Generate contextual improvements based on resume and job content
 */
function generateContextualImprovements(resume, job, overallScore) {
  const improvements = [];
  const resumeSkills = extractSkillsFromResume(resume.parsedData);
  const jobSkills = extractSkillsFromJob(job.parsedData);
  const resumeExperience = extractExperienceFromResume(resume.parsedData);
  
  // Based on score, generate appropriate level of suggestions
  if (overallScore < 40) {
    improvements.push(
      `Your background in ${resumeExperience[0]?.title || 'your current role'} needs better alignment with ${job.title} requirements. Focus on highlighting transferable skills that match their core needs.`,
      `This ${job.title} role requires skills you may have but aren't emphasizing. Review the job requirements and identify which of your experiences demonstrate these capabilities.`,
      `Consider adding specific metrics and achievements from your work at ${resumeExperience[0]?.company || 'your current company'} that would resonate with ${job.company}'s goals.`
    );
  } else if (overallScore < 70) {
    improvements.push(
      `Your experience shows promise for this ${job.title} role. Strengthen your application by quantifying achievements from your work at ${resumeExperience[0]?.company || 'previous companies'}.`,
      `Bridge the gap between your background and ${job.company}'s needs by emphasizing relevant projects and outcomes that demonstrate the skills they're seeking.`
    );
  } else {
    improvements.push(
      `Your qualifications are strong for this ${job.title} position. Consider minor optimizations to better align your experience descriptions with ${job.company}'s specific language and priorities.`
    );
  }
  
  return improvements;
}

/**
 * Generate contextual strengths based on resume and job alignment
 */
function generateContextualStrengths(resume, job) {
  const strengths = [];
  const resumeExperience = extractExperienceFromResume(resume.parsedData);
  const resumeSkills = extractSkillsFromResume(resume.parsedData);
  
  if (resumeExperience.length > 0) {
    strengths.push(`Your ${resumeExperience[0]?.title || 'professional'} experience provides relevant background for this ${job.title} role`);
  }
  
  if (resumeSkills.length > 5) {
    strengths.push(`Strong technical skill set with ${resumeSkills.length} identified competencies`);
  }
  
  if (resume.parsedData.education && resume.parsedData.education.length > 0) {
    strengths.push(`Educational background supports the requirements for this position at ${job.company}`);
  }
  
  return strengths.slice(0, 3); // Keep top 3
}

/**
 * Generate contextual keywords based on job requirements
 */
function generateContextualKeywords(resume, job) {
  const keywords = [];
  const jobSkills = extractSkillsFromJob(job.parsedData);
  const resumeSkills = extractSkillsFromResume(resume.parsedData);
  
  // Find job requirements that aren't in resume
  const missingKeywords = [
    ...jobSkills.required,
    ...jobSkills.preferred,
    ...(job.parsedData.technicalRequirements || []),
    ...(job.parsedData.toolsAndTechnologies || [])
  ].filter(skill => 
    !resumeSkills.some(resumeSkill => 
      resumeSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(resumeSkill.toLowerCase())
    )
  );
  
  return missingKeywords.slice(0, 8); // Top 8 missing keywords
}

/**
 * Generate contextual fallback when AI analysis fails
 */
function generateContextualFallback(resume, job, error) {
  console.log('Generating contextual fallback analysis...');
  
  try {
    // Basic contextual matching
    const resumeSkills = extractSkillsFromResume(resume.parsedData);
    const jobSkills = extractSkillsFromJob(job.parsedData);
    const resumeExperience = extractExperienceFromResume(resume.parsedData);
    
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
    const experienceYears = resumeExperience.reduce((total, exp) => total + (exp.duration || 12), 0) / 12;
    
    let experienceScore = 40;
    if (experienceYears >= 3) experienceScore = 60;
    if (experienceYears >= 5) experienceScore = 75;
    if (experienceYears >= 8) experienceScore = 85;
    
    // Basic education scoring
    const hasEducation = resume.parsedData.education && resume.parsedData.education.length > 0;
    const educationScore = hasEducation ? 70 : 50;
    
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
        resumeEvidence: 'Found in skills or experience section'
      })),
      missingSkills: allJobSkills
        .filter(skill => !matchedSkills.some(matched => 
          matched.toLowerCase().includes(skill.toLowerCase())
        ))
        .slice(0, 8)
        .map(skill => ({
          skill,
          importance: 6,
          category: 'required',
          suggestionToAdd: `Consider highlighting any experience you have with ${skill}, or include it in your skills section if relevant to your background`
        })),
      improvementSuggestions: generateContextualImprovements(resume, job, overallScore),
      strengthsHighlight: generateContextualStrengths(resume, job),
      contextualKeywords: generateContextualKeywords(resume, job),
      fallbackReason: `Contextual analysis temporarily unavailable: ${error.message}`,
      analysisMetadata: {
        resumeId: resume._id,
        jobId: job._id,
        analyzedAt: new Date(),
        algorithmVersion: '3.0-contextual-fallback'
      }
    };
    
  } catch (fallbackError) {
    console.error('Error in contextual fallback analysis:', fallbackError);
    
    // Final fallback with contextual messaging
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
        `Unable to complete detailed analysis for this ${job.title} position at ${job.company}`,
        'Please ensure your resume content is properly formatted and try the analysis again',
        'Contact support if this issue persists - we want to help you optimize for this role'
      ],
      strengthsHighlight: [
        'Resume successfully uploaded and basic structure detected',
        `Profile shows potential alignment with ${job.title} requirements`
      ],
      contextualKeywords: [],
      errorDetails: error.message,
      analysisMetadata: {
        resumeId: resume._id,
        jobId: job._id,
        analyzedAt: new Date(),
        algorithmVersion: '3.0-contextual-error-fallback'
      }
    };
  }
}

// Keep all existing helper functions from original file
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

function calculateDuration(startDate, endDate) {
  if (!startDate) return 0;
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  const diffTime = Math.abs(end - start);
  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  
  return diffMonths;
}
