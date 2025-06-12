// services/resumeAnalysis.service.js - FIXED REALISTIC SCORING
const Resume = require('../models/mongodb/resume.model');
const { openai } = require('../config/openai');

/**
 * Analyze a resume using OpenAI with strict, realistic scoring criteria
 * @param {string} resumeId - MongoDB ID of the resume to analyze
 * @returns {Object} Analysis results
 */
exports.analyzeResume = async (resumeId) => {
  try {
    console.log(`Analyzing resume: ${resumeId}`);
    
    // Get the resume from the database
    const resume = await Resume.findById(resumeId);
    
    if (!resume) {
      throw new Error('Resume not found');
    }
    
    // Check if parsed data is available
    if (!resume.parsedData || Object.keys(resume.parsedData).length === 0) {
      throw new Error('Resume parsing data not available for analysis');
    }
    
    console.log('Parsed data found, proceeding with OpenAI analysis');
    
    // Check if this is a tailored resume for enhanced analysis
    const isTailoredResume = resume.isTailored || false;
    const tailoredContext = isTailoredResume ? 
      `This is an AI-tailored resume optimized for ${resume.tailoredForJob?.jobTitle || 'a specific role'} at ${resume.tailoredForJob?.company || 'a target company'}. ` : '';
    
    // Convert parsed data to string for OpenAI
    const resumeData = JSON.stringify(resume.parsedData, null, 2);
    
    // FIXED: Much stricter and more realistic scoring prompt
    const prompt = `
    You are a STRICT resume analyst and ATS expert with 15+ years of experience. You are known for being tough but fair in your evaluations. Most resumes are mediocre and should score between 50-75.

    ${tailoredContext}Analyze this resume with STRICT professional standards. Be realistic and tough in your scoring.

    CRITICAL INSTRUCTIONS FOR REALISTIC SCORING:

    **PLACEHOLDER CONTENT DETECTION:**
    - If you find placeholder text like "Bullet 1", "Bullet 2", "Generic content", etc., this is a MAJOR red flag
    - Automatically deduct 20-30 points for placeholder content
    - These resumes should score 40-60 maximum regardless of format

    **CONTENT QUALITY REQUIREMENTS:**
    - Achievements MUST have specific numbers, percentages, or metrics
    - Generic statements like "Managed projects" or "Worked with teams" are weak
    - Strong content requires: specific metrics, technologies, business impact, team sizes, revenue figures

    Provide the analysis in JSON format:
    {
      "overallScore": 0-100,
      "atsCompatibility": 0-100,
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
    
    **STRICT SCORING GUIDELINES - BE REALISTIC:**
    
    Overall Score (0-100):
    - 90-100: EXCEPTIONAL resume with quantified achievements, perfect keyword optimization, industry leadership examples, specific metrics throughout
    - 80-89: STRONG resume with good quantification, solid keyword presence, clear career progression, some metrics
    - 70-79: DECENT resume with basic quantification, acceptable structure, some achievements shown
    - 60-69: BELOW AVERAGE resume with weak content, generic statements, poor quantification
    - 50-59: POOR resume with placeholder content, no metrics, generic bullet points
    - Below 50: TERRIBLE resume with major content/format issues
    
    ATS Compatibility (0-100):
    - 90-100: Perfect ATS format with extensive industry keywords, optimized headers, strong keyword density (8-12%)
    - 80-89: Good ATS compatibility with solid keyword presence (6-8%), proper formatting
    - 70-79: Acceptable ATS compatibility with basic keywords (4-6%), standard formatting
    - 60-69: Poor ATS compatibility with few keywords (2-4%), weak optimization
    - Below 60: Very poor ATS compatibility with minimal keywords (<2%), bad formatting

    **CONTENT QUALITY CHECKLIST - DEDUCT POINTS FOR:**
    1. PLACEHOLDER CONTENT: "Bullet 1", "Bullet 2", generic placeholders (-25 points)
    2. NO QUANTIFICATION: Lack of numbers, percentages, metrics (-15 points)
    3. GENERIC STATEMENTS: "Responsible for...", "Worked on..." without specifics (-10 points)
    4. WEAK ACHIEVEMENTS: No business impact or measurable outcomes (-10 points)
    5. POOR KEYWORD DENSITY: Less than 3% relevant keywords for the field (-10 points)
    6. FORMATTING ISSUES: Poor structure, inconsistent formatting (-5 points)

    **KEYWORD DENSITY CALCULATION:**
    - Count industry-specific terms, technologies, methodologies
    - Calculate as percentage of total words
    - Product Management: "roadmap", "stakeholder", "KPI", "user research", "product strategy"
    - Technical: "API", "cloud", "agile", "scrum", "data analysis"

    **ACHIEVEMENT QUALITY EXAMPLES:**
    - WEAK: "Managed projects" 
    - STRONG: "Led 3 cross-functional teams to deliver $2M revenue-generating product ahead of schedule"
    
    - WEAK: "Worked with customers"
    - STRONG: "Increased customer satisfaction by 40% through data-driven UX improvements affecting 50k+ users"

    IMPORTANT: 
    - Be STRICT and REALISTIC in scoring
    - Most resumes should score 50-75, not 85-95
    - Only truly exceptional resumes with perfect content and optimization should score above 85
    - Placeholder content automatically caps scores at 60 maximum

    Return ONLY the JSON object without any markdown formatting or code blocks.
    
    Resume Data:
    ${resumeData}
    `;
    
    // Call OpenAI API with enhanced parameters for stricter analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: `You are a STRICT professional resume analyst with 15+ years of experience. You are known for tough, realistic evaluations. Most resumes are mediocre (50-75 range). Only exceptional resumes with perfect quantified achievements and optimization score above 85. You automatically detect and heavily penalize placeholder content like "Bullet 1, Bullet 2". You require specific metrics, technologies, and business impact for high scores. Return ONLY valid JSON without markdown.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Lower temperature for more consistent, strict scoring
      max_tokens: 3000,
    });
    
    // Get the response content
    const responseContent = response.choices[0].message.content.trim();
    
    // Clean up the response - remove any markdown code block syntax
    let cleanedResponse = responseContent;
    
    if (responseContent.startsWith('```json') || responseContent.startsWith('```')) {
      const startIndex = responseContent.indexOf('{');
      const endIndex = responseContent.lastIndexOf('}');
      
      if (startIndex !== -1 && endIndex !== -1) {
        cleanedResponse = responseContent.substring(startIndex, endIndex + 1);
      }
    }
    
    console.log('Cleaned response for parsing:', cleanedResponse.substring(0, 200) + '...');
    
    // Parse the response
    const analysisData = JSON.parse(cleanedResponse);
    console.log('Resume analysis with OpenAI completed successfully');
    
    // ENHANCED: Additional validation and scoring adjustments
    let sanitizedAnalysis = {
      overallScore: Math.max(0, Math.min(100, analysisData.overallScore || 0)),
      atsCompatibility: Math.max(0, Math.min(100, analysisData.atsCompatibility || 0)),
      profileSummary: {
        currentRole: analysisData.profileSummary?.currentRole || "Not specified",
        careerLevel: analysisData.profileSummary?.careerLevel || "Mid-level",
        industries: Array.isArray(analysisData.profileSummary?.industries) ? analysisData.profileSummary.industries : ["Technology"],
        suggestedJobTitles: Array.isArray(analysisData.profileSummary?.suggestedJobTitles) ? analysisData.profileSummary.suggestedJobTitles : ["Product Manager", "Project Manager"],
        suggestedIndustries: Array.isArray(analysisData.profileSummary?.suggestedIndustries) ? analysisData.profileSummary.suggestedIndustries : ["Technology", "Software"]
      },
      strengths: Array.isArray(analysisData.strengths) ? analysisData.strengths : [
        "Resume has a clear structure",
        "Contact information is included",
        "Work experience is detailed"
      ],
      weaknesses: Array.isArray(analysisData.weaknesses) ? analysisData.weaknesses : [
        "Could benefit from more quantifiable achievements",
        "Skills section could be more comprehensive",
        "Summary could be more impactful"
      ],
      keywordsSuggestions: Array.isArray(analysisData.keywordsSuggestions) ? analysisData.keywordsSuggestions : [
        "leadership",
        "communication",
        "problem-solving",
        "teamwork",
        "analytical"
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
              original: "Generic bullet points need improvement",
              improved: "Specific, quantified achievements with business impact"
            }
          ]
        }
      ]
    };
    
    // CRITICAL: Detect and penalize placeholder content
    const resumeText = JSON.stringify(resume.parsedData).toLowerCase();
    const placeholderPatterns = [
      'bullet 1', 'bullet 2', 'bullet 3', 'bullet 4', 'bullet 5',
      'bullet point', 'add content', 'placeholder', 'lorem ipsum',
      'example text', 'sample text', 'generic content'
    ];
    
    let hasPlaceholders = false;
    let placeholderCount = 0;
    
    placeholderPatterns.forEach(pattern => {
      if (resumeText.includes(pattern)) {
        hasPlaceholders = true;
        placeholderCount++;
      }
    });
    
    if (hasPlaceholders) {
      console.log(`🚨 PLACEHOLDER CONTENT DETECTED: Found ${placeholderCount} placeholder patterns`);
      
      // Apply severe penalty for placeholder content
      const penalty = Math.min(30, placeholderCount * 8); // Up to 30 point penalty
      sanitizedAnalysis.overallScore = Math.max(20, sanitizedAnalysis.overallScore - penalty);
      sanitizedAnalysis.atsCompatibility = Math.max(25, sanitizedAnalysis.atsCompatibility - (penalty * 0.8));
      
      // Add to weaknesses
      sanitizedAnalysis.weaknesses.unshift("Contains placeholder content that needs to be replaced with specific achievements");
      
      // Cap maximum scores for placeholder content
      sanitizedAnalysis.overallScore = Math.min(60, sanitizedAnalysis.overallScore);
      sanitizedAnalysis.atsCompatibility = Math.min(65, sanitizedAnalysis.atsCompatibility);
      
      console.log(`Applied ${penalty} point penalty for placeholder content. New scores: ${sanitizedAnalysis.overallScore}/${sanitizedAnalysis.atsCompatibility}`);
    }
    
    // Additional content quality checks
    const experienceText = JSON.stringify(resume.parsedData.experience || []);
    
    // Check for quantification
    const hasNumbers = /\d+/.test(experienceText);
    const hasPercentages = /%/.test(experienceText);
    const hasMetrics = /\$|revenue|million|thousand|increase|decrease|improve/i.test(experienceText);
    
    if (!hasNumbers && !hasPercentages && !hasMetrics) {
      console.log('🚨 NO QUANTIFICATION DETECTED: Applying penalty');
      sanitizedAnalysis.overallScore = Math.max(30, sanitizedAnalysis.overallScore - 15);
      sanitizedAnalysis.atsCompatibility = Math.max(40, sanitizedAnalysis.atsCompatibility - 10);
      sanitizedAnalysis.weaknesses.unshift("Lacks quantified achievements and specific metrics");
    }
    
    // ENHANCED: Apply tailored resume bonus more carefully
    if (isTailoredResume && !hasPlaceholders) {
      console.log('Applying tailored resume analysis bonus...');
      
      // Check for keyword optimization indicators in the content
      const summaryText = (resume.parsedData.summary || '').toLowerCase();
      const experienceText = JSON.stringify(resume.parsedData.experience || []).toLowerCase();
      
      // Keywords that indicate technical optimization
      const techKeywords = ['api', 'cloud', 'infrastructure', 'developer', 'velocity', 'platform', 'security', 'architecture'];
      const foundKeywords = techKeywords.filter(keyword => 
        summaryText.includes(keyword) || experienceText.includes(keyword)
      );
      
      // Apply bonus based on keyword optimization (only if no placeholders)
      if (foundKeywords.length >= 3) {
        console.log(`Found ${foundKeywords.length} optimization keywords:`, foundKeywords);
        
        // Apply 3-5 point bonus for good optimization (reduced from previous)
        const bonus = Math.min(5, foundKeywords.length);
        sanitizedAnalysis.overallScore = Math.min(100, sanitizedAnalysis.overallScore + bonus);
        sanitizedAnalysis.atsCompatibility = Math.min(100, sanitizedAnalysis.atsCompatibility + bonus);
        
        console.log(`Applied ${bonus} point tailoring bonus. New scores: ${sanitizedAnalysis.overallScore}/${sanitizedAnalysis.atsCompatibility}`);
        
        // Update strengths to reflect optimization
        sanitizedAnalysis.strengths.unshift("Resume is well-optimized with relevant technical keywords");
      }
    }
    
    console.log('Final analysis scores after all adjustments:', {
      overallScore: sanitizedAnalysis.overallScore,
      atsCompatibility: sanitizedAnalysis.atsCompatibility,
      hadPlaceholders: hasPlaceholders,
      placeholderCount: placeholderCount,
      strengthsCount: sanitizedAnalysis.strengths.length,
      weaknessesCount: sanitizedAnalysis.weaknesses.length,
      isTailored: isTailoredResume
    });
    
    return sanitizedAnalysis;
  } catch (error) {
    console.error('Error analyzing resume with OpenAI:', error);
    
    // Fallback to a more realistic default analysis
    return {
      overallScore: 45, // Much lower default score
      atsCompatibility: 55,
      profileSummary: {
        currentRole: "Not identified",
        careerLevel: "Mid-level",
        industries: ["Technology"],
        suggestedJobTitles: ["Product Manager", "Project Manager"],
        suggestedIndustries: ["Technology", "Software"]
      },
      strengths: [
        "Resume has a clear structure",
        "Contact information is included"
      ],
      weaknesses: [
        "Contains placeholder content that needs specific achievements",
        "Lacks quantifiable metrics and business impact",
        "Needs more industry-specific keywords",
        "Bullet points are too generic and need improvement"
      ],
      keywordsSuggestions: [
        "leadership",
        "project management",
        "data analysis",
        "cross-functional collaboration",
        "business impact"
      ],
      improvementAreas: [
        {
          section: "Experience",
          suggestions: [
            "Replace placeholder bullets with specific quantified achievements",
            "Add metrics like percentages, dollar amounts, team sizes",
            "Include specific technologies and methodologies used"
          ],
          improvedSnippets: [
            {
              original: "Bullet 1, Bullet 2, Bullet 3",
              improved: "Led cross-functional team of 12 to deliver $2M revenue product, increasing customer satisfaction by 35% through data-driven feature improvements"
            }
          ]
        }
      ]
    };
  }
};