// services/resumeAnalysis.service.js - FIXED REALISTIC SCORING SYSTEM
const Resume = require('../models/mongodb/resume.model');
const { openai } = require('../config/openai');

/**
 * REALISTIC: Enhanced content quality assessment
 */
function assessContentQuality(resumeText, experienceText) {
  let qualityScore = 0;
  
  // Check for specific metrics and achievements
  const hasNumbers = /\d+/.test(experienceText);
  const hasPercentages = /%/.test(experienceText);
  const hasMetrics = /\$|revenue|million|thousand|increase|decrease|improve|grow|achieve/i.test(experienceText);
  const hasActionVerbs = /\b(led|managed|developed|created|implemented|increased|generated|delivered|achieved|spearheaded|optimized|enhanced|drove)\b/gi.test(experienceText);
  
  // Count action verbs
  const actionVerbMatches = experienceText.match(/\b(led|managed|developed|created|implemented|increased|generated|delivered|achieved|spearheaded|optimized|enhanced|drove)\b/gi) || [];
  
  // Quality indicators
  if (hasNumbers) qualityScore += 20;
  if (hasPercentages) qualityScore += 15;
  if (hasMetrics) qualityScore += 25;
  if (actionVerbMatches.length >= 5) qualityScore += 20;
  if (actionVerbMatches.length >= 10) qualityScore += 10; // Bonus for many action verbs
  
  // Check for industry-specific terms
  const techTerms = /\b(AI|ML|SaaS|API|platform|automation|analytics|data|cloud|agile|scrum)\b/gi.test(experienceText);
  if (techTerms) qualityScore += 10;
  
  // Determine quality level
  if (qualityScore >= 70) return 'excellent';
  if (qualityScore >= 50) return 'good';
  if (qualityScore >= 30) return 'fair';
  return 'poor';
}

/**
 * REALISTIC: Validate and normalize scores with proper benchmarks
 */
function validateAndNormalizeScores(analysis, isTailoredResume, hasPlaceholders, hasQuantification, contentQuality) {
  // START WITH BASE SCORE from OpenAI
  let overallScore = Math.max(0, Math.min(100, analysis.overallScore || 0));
  let atsScore = Math.max(0, Math.min(100, analysis.atsCompatibility || 0));
  
  // MAJOR PENALTIES FIRST
  
  // 1. PLACEHOLDER CONTENT - Major penalty
  if (hasPlaceholders) {
    console.log('🚨 MAJOR PENALTY: Placeholder content detected');
    overallScore = Math.max(15, overallScore - 30); // Cap at 15% max
    atsScore = Math.max(20, atsScore - 25);
    return { 
      overallScore: Math.round(overallScore), 
      atsScore: Math.round(atsScore),
      categoryScores: {
        skills: Math.max(20, analysis.categoryScores?.skills - 25) || 20,
        experience: Math.max(15, analysis.categoryScores?.experience - 30) || 15,
        education: Math.max(30, analysis.categoryScores?.education - 15) || 30
      }
    }; // Return early - placeholders are dealbreakers
  }
  
  // 2. NO QUANTIFICATION - Significant penalty
  if (!hasQuantification) {
    console.log('⚠️ PENALTY: Limited quantification detected');
    overallScore = Math.max(35, overallScore - 15);
    atsScore = Math.max(40, atsScore - 10);
  }
  
  // 3. POOR CONTENT QUALITY - Penalty
  if (contentQuality === 'poor') {
    console.log('⚠️ PENALTY: Poor content quality');
    overallScore = Math.max(25, overallScore - 20);
    atsScore = Math.max(30, atsScore - 15);
  }
  
  // REALISTIC CAPS BASED ON CONTENT QUALITY
  
  // Even excellent resumes rarely exceed these realistic thresholds
  if (!isTailoredResume) {
    // Generic resumes: Cap at 85% to be realistic
    overallScore = Math.min(85, overallScore);
    atsScore = Math.min(80, atsScore);
  } else {
    // Tailored resumes: Cap at 95% (perfect 100% should be extremely rare)
    overallScore = Math.min(95, overallScore);
    atsScore = Math.min(90, atsScore);
  }
  
  // CONSERVATIVE TAILORING BONUS (if applicable)
  if (isTailoredResume && !hasPlaceholders) {
    let tailoringBonus = 0;
    
    // More conservative bonuses
    if (hasQuantification) tailoringBonus += 3; // Reduced from 5
    if (contentQuality === 'excellent') tailoringBonus += 4; // Reduced from 8
    if (contentQuality === 'good') tailoringBonus += 2;
    
    // Apply conservative bonus
    overallScore = Math.min(95, overallScore + tailoringBonus); // Still cap at 95%
    atsScore = Math.min(90, atsScore + Math.round(tailoringBonus * 0.8));
    
    console.log(`✅ Applied conservative tailoring bonus: +${tailoringBonus} points`);
  }
  
  // REALISTIC SCORING BANDS
  
  // Ensure scores follow realistic distribution
  if (overallScore >= 90) {
    console.log('🌟 EXCEPTIONAL score detected - rare achievement');
  } else if (overallScore >= 80) {
    console.log('🎯 EXCELLENT score - strong resume');
  } else if (overallScore >= 70) {
    console.log('✅ GOOD score - solid resume');
  } else if (overallScore >= 60) {
    console.log('⚠️ FAIR score - needs improvement');
  } else {
    console.log('🚨 POOR score - significant issues');
  }
  
  // Apply same caps to category scores
  const categoryScores = {
    skills: Math.min(isTailoredResume ? 95 : 85, analysis.categoryScores?.skills || overallScore),
    experience: Math.min(isTailoredResume ? 95 : 85, analysis.categoryScores?.experience || overallScore),
    education: Math.min(isTailoredResume ? 95 : 85, analysis.categoryScores?.education || overallScore)
  };
  
  return {
    overallScore: Math.round(overallScore),
    atsScore: Math.round(atsScore),
    categoryScores
  };
}

/**
 * REALISTIC: More conservative fallback analysis
 */
function generateRealisticFallback(resume, job, error) {
  console.log('Generating realistic fallback analysis...');
  
  try {
    // Basic skills matching
    const resumeSkills = extractSkillsFromResume(resume.parsedData);
    const jobSkills = extractSkillsFromJob(job.parsedData);
    
    // Much more conservative scoring
    const allJobSkills = [...jobSkills.required, ...jobSkills.preferred];
    const matchedSkills = resumeSkills.filter(skill => 
      allJobSkills.some(jobSkill => 
        skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
    
    // Conservative skill matching
    const skillsScore = allJobSkills.length > 0 ? 
      Math.min(75, Math.round((matchedSkills.length / allJobSkills.length) * 100)) : 45;
    
    // Conservative experience scoring
    const experienceYears = resume.parsedData.experience ? 
      resume.parsedData.experience.length * 1.5 : 0; // More conservative estimate
    
    let experienceScore = 35; // Lower baseline
    if (experienceYears >= 3) experienceScore = 55;
    if (experienceYears >= 6) experienceScore = 70;
    if (experienceYears >= 10) experienceScore = 80;
    
    // Conservative education scoring
    const hasEducation = resume.parsedData.education && 
      resume.parsedData.education.length > 0;
    const educationScore = hasEducation ? 60 : 35;
    
    // Conservative overall calculation
    const overallScore = Math.min(65, Math.round( // Cap fallback at 65%
      (skillsScore * 0.4) + (experienceScore * 0.35) + (educationScore * 0.25)
    ));
    
    return {
      overallScore,
      atsCompatibility: Math.min(60, overallScore - 5), // ATS slightly lower
      categoryScores: {
        skills: skillsScore,
        experience: experienceScore,
        education: educationScore
      },
      profileSummary: {
        currentRole: "Analysis temporarily unavailable",
        careerLevel: "Mid-level",
        industries: ["Technology", "Sales"],
        suggestedJobTitles: ["Product Manager", "Business Development Manager"],
        suggestedIndustries: ["Technology", "Software", "Financial Services"]
      },
      strengths: [
        "Resume structure is organized",
        "Professional experience is present",
        "Contact information included"
      ],
      weaknesses: [
        "Analysis temporarily unavailable - please retry",
        "Consider adding more quantifiable achievements",
        "Ensure all sections are complete"
      ],
      keywordsSuggestions: [
        "leadership",
        "strategy",
        "results",
        "collaboration",
        "innovation"
      ],
      improvementAreas: [
        {
          section: "System Error",
          suggestions: [
            "Please retry the analysis",
            "Ensure resume content is properly formatted",
            "Contact support if problem persists"
          ],
          improvedSnippets: [
            {
              original: "Analysis failed",
              improved: "Please try the analysis again for detailed insights"
            }
          ]
        }
      ],
      fallbackReason: `Conservative analysis due to: ${error.message}`,
      analysisMetadata: {
        resumeId: resume._id,
        jobId: job._id,
        analyzedAt: new Date(),
        algorithmVersion: '2.0-realistic-fallback'
      }
    };
    
  } catch (fallbackError) {
    console.error('Error in fallback analysis:', fallbackError);
    
    // Final emergency fallback
    return {
      overallScore: 35,
      atsCompatibility: 30,
      categoryScores: {
        skills: 30,
        experience: 40,
        education: 35
      },
      profileSummary: {
        currentRole: "Analysis unavailable",
        careerLevel: "Unknown",
        industries: ["Technology"],
        suggestedJobTitles: ["Professional"],
        suggestedIndustries: ["Technology", "Business"]
      },
      strengths: [
        "Resume uploaded successfully"
      ],
      weaknesses: [
        "Unable to complete analysis at this time",
        "Please try again later"
      ],
      keywordsSuggestions: [
        "leadership",
        "communication",
        "results"
      ],
      improvementAreas: [
        {
          section: "System Error",
          suggestions: [
            "Please retry the analysis",
            "Contact support if problem persists"
          ],
          improvedSnippets: []
        }
      ],
      errorDetails: error.message,
      analysisMetadata: {
        resumeId: resume._id,
        jobId: job._id,
        analyzedAt: new Date(),
        algorithmVersion: '2.0-emergency-fallback'
      }
    };
  }
}

/**
 * Extract skills from resume data (helper function)
 */
function extractSkillsFromResume(parsedData) {
  const skills = [];
  
  if (parsedData.skills && Array.isArray(parsedData.skills)) {
    parsedData.skills.forEach(skill => {
      if (typeof skill === 'string') {
        skills.push(skill);
      } else if (skill && skill.name) {
        skills.push(skill.name);
      }
    });
  }
  
  return [...new Set(skills)];
}

/**
 * Extract skills from job data (helper function)
 */
function extractSkillsFromJob(parsedData) {
  const required = [];
  const preferred = [];
  
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
  
  return {
    required: [...new Set(required)],
    preferred: [...new Set(preferred)]
  };
}

/**
 * ENHANCED: Analyze a resume with realistic scoring expectations
 * @param {string} resumeId - MongoDB ID of the resume to analyze
 * @returns {Object} Analysis results with realistic scores
 */
exports.analyzeResume = async (resumeId) => {
  try {
    console.log(`Starting realistic analysis for resume: ${resumeId}`);
    
    // Get the resume from the database
    const resume = await Resume.findById(resumeId);
    
    if (!resume) {
      throw new Error('Resume not found');
    }
    
    // Check if parsed data is available
    if (!resume.parsedData || Object.keys(resume.parsedData).length === 0) {
      throw new Error('Resume parsing data not available for analysis');
    }
    
    console.log('📊 Parsed data found, proceeding with realistic OpenAI analysis');
    
    // ENHANCED: Check if this is a tailored resume with metadata
    const isTailoredResume = resume.isTailored || false;
    const tailoringMetadata = resume.parsedData.tailoringMetadata || null;
    
    let tailoredContext = '';
    let originalResumeScore = 0;
    
    if (isTailoredResume) {
      console.log('🎯 Detected tailored resume - applying realistic analysis');
      
      if (tailoringMetadata) {
        tailoredContext = `
        IMPORTANT: This is an AI-tailored resume with the following enhancements:
        - Tailored for: ${tailoringMetadata.jobTitle} at ${tailoringMetadata.company}
        - Summary updated: ${tailoringMetadata.improvementsApplied?.summaryUpdated ? 'YES' : 'NO'}
        - Experience enhanced: ${tailoringMetadata.improvementsApplied?.experienceEnhanced ? 'YES' : 'NO'}
        - Skills optimized: ${tailoringMetadata.improvementsApplied?.skillsOptimized ? 'YES' : 'NO'}
        - Keywords targeted: ${tailoringMetadata.keywordsTargeted?.join(', ') || 'Various job-specific terms'}
        
        `;
        
        // Try to get original resume score for comparison
        if (tailoringMetadata.originalResumeId) {
          try {
            const originalResume = await Resume.findById(tailoringMetadata.originalResumeId);
            if (originalResume?.analysis?.overallScore) {
              originalResumeScore = originalResume.analysis.overallScore;
              tailoredContext += `Original resume score was: ${originalResumeScore}%. This tailored version should score 8-15 points higher.\n`;
            }
          } catch (err) {
            console.log('Could not fetch original resume score:', err.message);
          }
        }
      } else {
        tailoredContext = `This is an AI-tailored resume optimized for ${resume.tailoredForJob?.jobTitle || 'a specific role'} at ${resume.tailoredForJob?.company || 'a target company'}. `;
      }
    }
    
    // Convert parsed data to string for OpenAI
    const resumeData = JSON.stringify(resume.parsedData, null, 2);
    const experienceText = JSON.stringify(resume.parsedData.experience || []);
    
    // Assess content quality
    const contentQuality = assessContentQuality(resumeData, experienceText);
    console.log(`📋 Content quality assessment: ${contentQuality}`);
    
    // REALISTIC: More strict scoring prompt
    const prompt = `
    You are a STRICT but FAIR resume analyst with 15+ years of experience. You provide REALISTIC scores that reflect actual hiring standards, not inflated scores.

    ${tailoredContext}

    **CRITICAL REALISTIC SCORING GUIDELINES:**

    **SCORE DISTRIBUTION (be realistic!):**
    - 90-95%: EXCEPTIONAL (< 5% of resumes) - Perfect optimization, outstanding quantified achievements
    - 80-89%: EXCELLENT (15% of resumes) - Strong content, good quantification, well-structured
    - 70-79%: GOOD (30% of resumes) - Solid resume, decent achievements, room for improvement  
    - 60-69%: FAIR (30% of resumes) - Basic resume, needs enhancement
    - 50-59%: POOR (15% of resumes) - Significant issues, major improvements needed
    - Below 50%: VERY POOR (5% of resumes) - Major problems, complete overhaul needed

    **WHAT MAKES A HIGH SCORE (80%+) - BE STRICT:**
    - Multiple specific metrics and percentages throughout experience
    - 8+ strong action verbs and quantified achievements
    - Clear business impact with numbers
    - Industry-specific keywords naturally integrated
    - Clean, professional formatting
    - NO generic or placeholder content

    **AUTOMATIC SCORE CAPS - ENFORCE THESE:**
    - Generic resumes: MAXIMUM 85% (even if perfect content)
    - Tailored resumes: MAXIMUM 95% (100% reserved for absolutely perfect)
    - Any placeholder content: MAXIMUM 50%
    - No quantification: MAXIMUM 70%
    - Poor grammar/formatting: MAXIMUM 65%

    ${isTailoredResume ? `
    **TAILORED RESUME EXPECTATIONS:**
    - Should score 8-15 points higher than original
    - Original score was: ${originalResumeScore}%
    - Expected realistic range: ${Math.min(95, originalResumeScore + 8)}-${Math.min(95, originalResumeScore + 15)}%
    - Look for genuine job-specific optimization
    ` : `
    **GENERIC RESUME STANDARDS:**
    - Apply standard professional criteria  
    - Focus on content quality and structure
    - MAXIMUM possible score: 85%
    `}

    **BE EXTRA STRICT ON:**
    - Placeholder content ("Bullet 1", "Bullet 2") = MAJOR PENALTY (max 50%)
    - Generic statements without metrics = SIGNIFICANT PENALTY
    - Poor grammar/spelling = PENALTY
    - Weak action verbs = LOWER SCORE
    - Missing quantification = CAP AT 70%

    **ATS COMPATIBILITY SCORING:**
    - 85-90%: Perfect ATS optimization with job-specific keywords
    - 75-84%: Good ATS compatibility with solid keywords
    - 65-74%: Acceptable ATS compatibility
    - 55-64%: Poor ATS compatibility
    - Below 55%: Very poor ATS compatibility

    Provide analysis in this EXACT JSON format:
    {
      "overallScore": 0-100,
      "atsCompatibility": 0-100,
      "categoryScores": {
        "skills": 0-100,
        "experience": 0-100,
        "education": 0-100
      },
      "profileSummary": {
        "currentRole": "",
        "careerLevel": "",
        "industries": [],
        "suggestedJobTitles": [],
        "suggestedIndustries": []
      },
      "strengths": ["strength1", "strength2", "strength3"],
      "weaknesses": ["weakness1", "weakness2", "weakness3"],
      "keywordsSuggestions": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "improvementAreas": [
        {
          "section": "section name",
          "suggestions": ["suggestion1", "suggestion2"],
          "improvedSnippets": [
            {
              "original": "original text from resume",
              "improved": "AI-enhanced version"
            }
          ]
        }
      ]
    }

    **REMEMBER: Most resumes score 60-80%. Only exceptional resumes with perfect quantification and optimization score above 85%. Be realistic and strict!**

    Resume Data:
    ${resumeData}
    `;
    
    // Call OpenAI API with enhanced parameters
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: `You are a strict resume analyst who provides REALISTIC scores. You know that most resumes score 60-80%, and only exceptional resumes score above 85%. ${isTailoredResume ? 'You understand that tailored resumes should score 8-15 points higher than generic versions when properly optimized.' : 'You apply standard scoring criteria for general resumes with a maximum of 85%.'} Return ONLY valid JSON without markdown.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });
    
    // Get and parse the response
    const responseContent = response.choices[0].message.content.trim();
    
    let cleanedResponse = responseContent;
    if (responseContent.startsWith('```json') || responseContent.startsWith('```')) {
      const startIndex = responseContent.indexOf('{');
      const endIndex = responseContent.lastIndexOf('}');
      
      if (startIndex !== -1 && endIndex !== -1) {
        cleanedResponse = responseContent.substring(startIndex, endIndex + 1);
      }
    }
    
    console.log('🧠 Realistic analysis response received, parsing...');
    
    // Parse the response
    const analysisData = JSON.parse(cleanedResponse);
    console.log('✅ Resume analysis completed successfully');
    
    // ENHANCED: Detect and handle placeholder content with stricter penalties
    const resumeText = JSON.stringify(resume.parsedData).toLowerCase();
    const placeholderPatterns = [
      'bullet 1', 'bullet 2', 'bullet 3', 'bullet 4', 'bullet 5',
      'bullet point', 'add content', 'placeholder', 'lorem ipsum',
      'example text', 'sample text', 'generic content', 'description here'
    ];
    
    let hasPlaceholders = false;
    placeholderPatterns.forEach(pattern => {
      if (resumeText.includes(pattern)) {
        hasPlaceholders = true;
      }
    });
    
    // Enhanced quantification detection
    const hasNumbers = /\d+/.test(experienceText);
    const hasPercentages = /%/.test(experienceText);
    const hasMetrics = /\$|revenue|million|thousand|increase|decrease|improve|grow|achieve/i.test(experienceText);
    const hasQuantification = hasNumbers || hasPercentages || hasMetrics;
    
    // Apply realistic scoring validation
    const { overallScore, atsScore, categoryScores } = validateAndNormalizeScores(
      analysisData, 
      isTailoredResume, 
      hasPlaceholders, 
      hasQuantification, 
      contentQuality
    );
    
    // Build sanitized analysis with realistic scores
    let sanitizedAnalysis = {
      overallScore,
      atsCompatibility: atsScore,
      categoryScores,
      profileSummary: {
        currentRole: analysisData.profileSummary?.currentRole || "Not specified",
        careerLevel: analysisData.profileSummary?.careerLevel || "Mid-level",
        industries: Array.isArray(analysisData.profileSummary?.industries) ? analysisData.profileSummary.industries : ["Technology"],
        suggestedJobTitles: Array.isArray(analysisData.profileSummary?.suggestedJobTitles) ? analysisData.profileSummary.suggestedJobTitles : ["Product Manager", "Business Development"],
        suggestedIndustries: Array.isArray(analysisData.profileSummary?.suggestedIndustries) ? analysisData.profileSummary.suggestedIndustries : ["Technology", "Software", "Business"]
      },
      strengths: Array.isArray(analysisData.strengths) ? analysisData.strengths : [
        "Resume has a clear structure",
        "Contact information is included",
        "Work experience is detailed"
      ],
      weaknesses: Array.isArray(analysisData.weaknesses) ? analysisData.weaknesses : [
        "Could benefit from more quantifiable achievements",
        "Skills section could be more comprehensive"
      ],
      keywordsSuggestions: Array.isArray(analysisData.keywordsSuggestions) ? analysisData.keywordsSuggestions : [
        "leadership",
        "strategy",
        "results",
        "collaboration",
        "innovation"
      ],
      improvementAreas: Array.isArray(analysisData.improvementAreas) ? analysisData.improvementAreas : [
        {
          section: "Experience",
          suggestions: [
            "Add more quantifiable achievements",
            "Use more action verbs"
          ],
          improvedSnippets: [
            {
              original: "Responsible for sales activities",
              improved: "Generated $2M in new revenue through strategic client acquisition and relationship management"
            }
          ]
        }
      ]
    };
    
    // Add warnings for placeholder content
    if (hasPlaceholders) {
      console.log(`🚨 PLACEHOLDER CONTENT DETECTED: Applied major penalty`);
      sanitizedAnalysis.weaknesses.unshift("Contains placeholder content that must be replaced with specific achievements");
    }
    
    // Add warning for lack of quantification
    if (!hasQuantification) {
      console.log('🚨 LIMITED QUANTIFICATION: Applied penalty');
      sanitizedAnalysis.weaknesses.unshift("Lacks quantified achievements and specific business impact metrics");
    }
    
    console.log('📊 Final realistic analysis scores:', {
      overallScore: sanitizedAnalysis.overallScore,
      atsCompatibility: sanitizedAnalysis.atsCompatibility,
      isTailored: isTailoredResume,
      contentQuality,
      hadPlaceholders: hasPlaceholders,
      hasQuantification,
      strengthsCount: sanitizedAnalysis.strengths.length,
      weaknessesCount: sanitizedAnalysis.weaknesses.length
    });
    
    return sanitizedAnalysis;
  } catch (error) {
    console.error('❌ Error in realistic resume analysis:', error);
    
    // Enhanced fallback analysis with realistic scoring
    return generateRealisticFallback(resume, { parsedData: {} }, error);
  }
};