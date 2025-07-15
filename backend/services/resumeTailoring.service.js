// services/resumeTailoring.service.js - FIXED SCORING AND FORMATTING ISSUES
const Job = require('../models/mongodb/job.model');
const Resume = require('../models/mongodb/resume.model');
const { openai } = require('../config/openai');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, S3_BUCKET } = require('../config/s3');
const path = require('path');
const uuid = require('uuid').v4;
const resumeAnalysisService = require('./resumeAnalysis.service');
const PDFDocument = require('pdfkit');

/**
 * DYNAMIC: Extract key requirements and keywords from ANY job description
 */
function extractJobRequirements(jobData, jobDescription) {
  const requirements = {
    skills: [],
    experience: [],
    industry: '',
    keywords: [],
    level: '',
    focus: []
  };
  
  // Extract from parsed job data
  if (jobData.keySkills) {
    requirements.skills = jobData.keySkills.map(skill => 
      typeof skill === 'string' ? skill : skill.name
    ).slice(0, 10);
  }
  
  if (jobData.experienceLevel) {
    requirements.level = jobData.experienceLevel;
  }
  
  // Extract keywords from job description using regex patterns
  const text = jobDescription.toLowerCase();
  
  // Industry detection
  if (text.includes('financial') || text.includes('fintech') || text.includes('banking')) {
    requirements.industry = 'Financial Services';
  } else if (text.includes('healthcare') || text.includes('medical')) {
    requirements.industry = 'Healthcare';
  } else if (text.includes('software') || text.includes('tech')) {
    requirements.industry = 'Technology';
  } else if (text.includes('marketing') || text.includes('advertising')) {
    requirements.industry = 'Marketing';
  }
  
  // Focus area detection
  if (text.includes('sales') || text.includes('revenue')) {
    requirements.focus.push('Sales & Revenue');
  }
  if (text.includes('product') || text.includes('development')) {
    requirements.focus.push('Product Development');
  }
  if (text.includes('manage') || text.includes('leadership')) {
    requirements.focus.push('Leadership & Management');
  }
  
  // Dynamic keyword extraction
  const commonKeywords = [
    'enterprise', 'startup', 'saas', 'b2b', 'client', 'customer',
    'revenue', 'growth', 'scale', 'platform', 'strategy', 'data',
    'team', 'cross-functional', 'agile', 'analytics', 'innovation'
  ];
  
  requirements.keywords = commonKeywords.filter(keyword => 
    text.includes(keyword)
  );
  
  return requirements;
}

/**
 * DYNAMIC: Generate role-specific improvement examples
 */
function generateRoleExamples(requirements, resumeExperience) {
  const examples = [];
  
  resumeExperience.forEach(exp => {
    const roleExamples = [];
    
    // Generate dynamic examples based on requirements
    if (requirements.focus.includes('Sales & Revenue')) {
      roleExamples.push(`Drove ${requirements.industry.toLowerCase()} revenue growth through strategic ${exp.title.toLowerCase()} initiatives`);
      roleExamples.push(`Managed ${requirements.level === 'senior' ? 'enterprise' : 'key'} client relationships resulting in measurable business impact`);
    }
    
    if (requirements.focus.includes('Product Development')) {
      roleExamples.push(`Led ${requirements.industry.toLowerCase()} product development initiatives with quantifiable user impact`);
      roleExamples.push(`Collaborated with cross-functional teams to deliver ${requirements.keywords.includes('saas') ? 'SaaS' : 'technology'} solutions`);
    }
    
    if (requirements.focus.includes('Leadership & Management')) {
      roleExamples.push(`Managed teams and stakeholders to achieve strategic ${requirements.industry.toLowerCase()} objectives`);
      roleExamples.push(`Led organizational initiatives resulting in improved efficiency and performance metrics`);
    }
    
    examples.push({
      company: exp.company,
      position: exp.title,
      suggested: roleExamples
    });
  });
  
  return examples;
}

/**
 * DYNAMIC: Create tailoring recommendations for ANY job/resume combination
 */
exports.getTailoringRecommendations = async (resumeId, jobId) => {
  try {
    console.log(`🎯 Generating DYNAMIC tailoring recommendations for resume ${resumeId} to job ${jobId}`);
    
    const resume = await Resume.findById(resumeId);
    const job = await Job.findById(jobId);
    
    if (!resume || !job) {
      throw new Error('Resume or job not found');
    }
    
    // DYNAMIC: Extract requirements from THIS specific job
    const jobRequirements = extractJobRequirements(job.parsedData, job.description);
    console.log('📊 Extracted job requirements:', jobRequirements);
    
    // DYNAMIC: Generate role-specific examples
    const roleExamples = generateRoleExamples(jobRequirements, resume.parsedData.experience || []);
    
    const resumeData = JSON.stringify(resume.parsedData, null, 2);
    const jobData = JSON.stringify(job.parsedData, null, 2);
    
    // DYNAMIC: Build prompt based on extracted requirements
    const prompt = `
    You are an expert resume writer and ATS optimization specialist. Analyze this resume and job description to provide comprehensive tailoring recommendations for ALL experience positions.

    **DYNAMIC JOB ANALYSIS:**
    - Target Role: ${job.title}
    - Target Company: ${job.company}
    - Industry Focus: ${jobRequirements.industry || 'Technology'}
    - Experience Level: ${jobRequirements.level || 'Mid-level'}
    - Key Focus Areas: ${jobRequirements.focus.join(', ') || 'General'}
    - Priority Keywords: ${jobRequirements.keywords.slice(0, 8).join(', ')}
    - Required Skills: ${jobRequirements.skills.slice(0, 8).join(', ')}

    **TAILORING INSTRUCTIONS:**
    1. **IMPROVE ALL POSITIONS** - Tailor every experience entry, not just recent ones
    2. **USE DETECTED KEYWORDS** - Naturally integrate the priority keywords identified above
    3. **MATCH INDUSTRY FOCUS** - Align content with the ${jobRequirements.industry || 'target'} industry
    4. **EMPHASIZE FOCUS AREAS** - Highlight ${jobRequirements.focus.join(' and ') || 'relevant experience'}
    5. **QUANTIFY ACHIEVEMENTS** - Add specific metrics and business impact
    6. **FIX PLACEHOLDER CONTENT** - Replace any "Bullet 1, Bullet 2" with real achievements

    **CURRENT RESUME DATA:**
    ${resumeData}

    **TARGET JOB DATA:**
    ${jobData}

    **ROLE-SPECIFIC EXAMPLES:**
    ${JSON.stringify(roleExamples, null, 2)}

    Provide comprehensive recommendations in JSON format:
    {
      "summary": {
        "original": "current summary text",
        "tailored": "rewritten summary emphasizing ${jobRequirements.industry} experience and ${jobRequirements.focus.join('/')}"
      },
      "experienceImprovements": [
        // For EACH experience position, provide:
        {
          "company": "exact company name from resume",
          "position": "exact position title from resume", 
          "original": ["current bullet points from resume"],
          "tailored": [
            "enhanced bullet with ${jobRequirements.industry} relevance and specific metrics",
            "improved bullet emphasizing ${jobRequirements.focus.join('/')} with quantifiable results",
            "optimized bullet using priority keywords: ${jobRequirements.keywords.slice(0, 5).join(', ')}"
          ]
        }
        // Include ALL positions from the resume
      ],
      "skillsImprovements": {
        "skillsToAdd": [
          // Add skills relevant to ${jobRequirements.industry} and ${job.title}
        ],
        "skillsToEmphasize": [
          // Prioritize existing skills that match job requirements
        ]
      },
      "keywordSuggestions": [
        // Include the detected priority keywords plus related terms
      ],
      "formatSuggestions": [
        "Emphasize ${jobRequirements.focus.join(' and ')} achievements in each role",
        "Highlight ${jobRequirements.industry} industry experience throughout",
        "Use consistent formatting with quantifiable metrics"
      ],
      "generalAdvice": "Transform your experience to emphasize ${jobRequirements.industry} relevance and ${jobRequirements.focus.join('/')} capabilities. Every role should demonstrate your fit for ${job.title} responsibilities."
    }

    **CRITICAL**: Provide tailored improvements for ALL experience positions in the resume. Do not skip any roles.

    Return ONLY the JSON without any markdown formatting or code blocks.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: `You are an expert resume writer who adapts to any industry and role. You analyze job requirements dynamically and provide relevant tailoring for all experience positions. You specialize in ${jobRequirements.industry || 'technology'} roles and understand ${jobRequirements.focus.join(' and ') || 'professional development'}. Return ONLY JSON without markdown formatting.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4500,
    });
    
    const content = response.choices[0].message.content;
    let jsonStr = content;
    
    // Clean response
    if (content.includes('```')) {
      const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
      }
    }
    
    jsonStr = jsonStr.trim();
    if (!jsonStr.startsWith('{')) {
      jsonStr = '{' + jsonStr.substring(jsonStr.indexOf('"'));
    }
    if (!jsonStr.endsWith('}')) {
      jsonStr = jsonStr.substring(0, jsonStr.lastIndexOf('}') + 1);
    }
    
    const recommendations = JSON.parse(jsonStr);
    console.log('✅ Dynamic tailoring recommendations generated successfully');
    
    // Add metadata about the dynamic analysis
    recommendations.dynamicAnalysis = {
      industry: jobRequirements.industry,
      focusAreas: jobRequirements.focus,
      keywordCount: jobRequirements.keywords.length,
      skillsDetected: jobRequirements.skills.length,
      experienceLevel: jobRequirements.level,
      positionsAnalyzed: resume.parsedData.experience?.length || 0
    };
    
    return recommendations;
  } catch (error) {
    console.error('❌ Error generating dynamic tailoring recommendations:', error);
    
    // Dynamic fallback based on job info
    return {
      summary: {
        original: "Could not retrieve original summary.",
        tailored: `Experienced professional with expertise relevant to ${job.title} at ${job.company}. Proven track record in driving results and managing stakeholder relationships.`
      },
      experienceImprovements: [],
      skillsImprovements: {
        skillsToAdd: ["Communication", "Leadership", "Strategic Planning"],
        skillsToEmphasize: ["Problem Solving", "Team Management"]
      },
      keywordSuggestions: ["leadership", "strategy", "results", "collaboration"],
      formatSuggestions: ["Emphasize quantifiable achievements"],
      generalAdvice: `Focus on highlighting experience relevant to ${job.title} and the requirements at ${job.company}.`
    };
  }
};

/**
 * UTILITY: Test dynamic extraction with different job types
 */
exports.testDynamicExtraction = (jobDescription) => {
  const mockJobData = { keySkills: [], experienceLevel: 'mid' };
  return extractJobRequirements(mockJobData, jobDescription);
};

/**
 * ENHANCED: Generate a properly formatted PDF from resume data
 * @param {Object} resumeData - The tailored resume data
 * @param {string} resumeName - Name of the resume
 * @param {Object} jobInfo - Job information for context
 * @returns {Buffer} PDF buffer
 */
/**
 * ENHANCED: Generate a properly formatted PDF from resume data
 * @param {Object} resumeData - The tailored resume data
 * @param {string} resumeName - Name of the resume
 * @param {Object} jobInfo - Job information for context
 * @returns {Buffer} PDF buffer
 */
function generateResumePDF(resumeData, resumeName, jobInfo) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        bufferPages: true
      });
      
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      
      // Set default font
      doc.font('Helvetica');
      
      // HEADER SECTION
      if (resumeData.contactInfo) {
        // Name - Large and bold
        if (resumeData.contactInfo.name) {
          doc.fontSize(24)
             .font('Helvetica-Bold')
             .text(resumeData.contactInfo.name, { align: 'center' });
          doc.moveDown(0.5);
        }
        
        // Contact information - centered
        const contactItems = [
          resumeData.contactInfo.email,
          resumeData.contactInfo.phone,
          resumeData.contactInfo.location
        ].filter(Boolean);
        
        if (contactItems.length > 0) {
          doc.fontSize(11)
             .font('Helvetica')
             .text(contactItems.join(' | '), { align: 'center' });
          doc.moveDown(1);
        }
      }
      
      // Add a horizontal line after header
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke();
      doc.moveDown(1);
      
      // PROFESSIONAL SUMMARY
      if (resumeData.summary && resumeData.summary.trim()) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('PROFESSIONAL SUMMARY');
        
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveDown(0.5);
        
        doc.fontSize(11)
           .font('Helvetica')
           .text(resumeData.summary, {
             align: 'justify',
             lineGap: 2
           });
        doc.moveDown(1.5);
      }
      
      // WORK EXPERIENCE
      if (resumeData.experience && resumeData.experience.length > 0) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('WORK EXPERIENCE');
        
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveDown(0.5);
        
        resumeData.experience.forEach((exp, index) => {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }
          
          // Job title and company
          const jobTitle = exp.title || 'Position';
          const company = exp.company || 'Company';
          
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(`${jobTitle} | ${company.toUpperCase()}`);
          
          // Dates
          let dateText = '';
          if (exp.startDate) {
            const startDate = new Date(exp.startDate);
            const endDate = exp.endDate ? new Date(exp.endDate) : new Date();
            
            const startMonth = startDate.toLocaleDateString('en-US', { month: 'numeric', year: 'numeric' });
            const endMonth = exp.endDate ? endDate.toLocaleDateString('en-US', { month: 'numeric', year: 'numeric' }) : 'Present';
            
            dateText = `${startMonth} - ${endMonth}`;
          }
          
          if (dateText) {
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('gray')
               .text(dateText, { align: 'right' });
            doc.fillColor('black');
          }
          
          doc.moveDown(0.3);
          
          // Experience highlights/bullets
          if (exp.highlights && exp.highlights.length > 0) {
            exp.highlights.forEach(highlight => {
              if (highlight && highlight.trim()) {
                // Check if we need a new page before adding bullet
                if (doc.y > 720) {
                  doc.addPage();
                }
                
                const bulletY = doc.y;
                doc.fontSize(11)
                   .font('Helvetica')
                   .text('•', 60, bulletY, { continued: false, width: 10 });
                
                doc.text(highlight.trim(), 75, bulletY, {
                  width: 475,
                  lineGap: 1
                });
                
                doc.moveDown(0.2);
              }
            });
          } else if (exp.description && exp.description.trim()) {
            // Use description if no highlights
            doc.fontSize(11)
               .font('Helvetica')
               .text(exp.description.trim(), {
                 width: 500,
                 lineGap: 2
               });
            doc.moveDown(0.3);
          }
          
          // Skills used in this role
          if (exp.skills && exp.skills.length > 0) {
            doc.fontSize(9)
               .font('Helvetica-Oblique')
               .fillColor('gray')
               .text(`Key Technologies: ${exp.skills.join(', ')}`, {
                 width: 500
               });
            doc.fillColor('black');
          }
          
          // Add space between jobs
          if (index < resumeData.experience.length - 1) {
            doc.moveDown(1);
          }
        });
        
        doc.moveDown(1);
      }
      
      // EDUCATION
      if (resumeData.education && resumeData.education.length > 0) {
        // Check if we need a new page
        if (doc.y > 650) {
          doc.addPage();
        }
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('EDUCATION');
        
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveDown(0.5);
        
        resumeData.education.forEach((edu, index) => {
          const degree = edu.degree || 'Degree';
          const field = edu.field ? ` in ${edu.field}` : '';
          const institution = edu.institution || 'Institution';
          
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(`${degree}${field}`);
          
          doc.fontSize(11)
             .font('Helvetica')
             .text(institution);
          
          if (edu.endDate) {
            const year = new Date(edu.endDate).getFullYear();
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('gray')
               .text(year.toString());
            doc.fillColor('black');
          }
          
          if (edu.gpa) {
            doc.fontSize(10)
               .text(`GPA: ${edu.gpa}`);
          }
          
          if (index < resumeData.education.length - 1) {
            doc.moveDown(0.5);
          }
        });
        
        doc.moveDown(1);
      }
      
      // SKILLS & TECHNOLOGIES
      if (resumeData.skills && resumeData.skills.length > 0) {
        // Check if we need a new page
        if (doc.y > 650) {
          doc.addPage();
        }
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('SKILLS & TECHNOLOGIES');
        
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveDown(0.5);
        
        // Group skills by category
        const skillCategories = {
          'Technical Skills': [],
          'Leadership & Management': [],
          'Business & Sales': []
        };
        
        resumeData.skills.forEach(skill => {
          const skillName = typeof skill === 'object' ? skill.name : skill;
          const skillLevel = typeof skill === 'object' ? skill.level : null;
          const displayName = skillLevel ? `${skillName} (${skillLevel})` : skillName;
          
          // Simple categorization
          if (skillName.toLowerCase().includes('manage') || 
              skillName.toLowerCase().includes('lead') || 
              skillName.toLowerCase().includes('leadership')) {
            skillCategories['Leadership & Management'].push(displayName);
          } else if (skillName.toLowerCase().includes('sales') || 
                     skillName.toLowerCase().includes('business') || 
                     skillName.toLowerCase().includes('revenue')) {
            skillCategories['Business & Sales'].push(displayName);
          } else {
            skillCategories['Technical Skills'].push(displayName);
          }
        });
        
        // Display skills by category
        Object.keys(skillCategories).forEach(category => {
          if (skillCategories[category].length > 0) {
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .text(`${category}:`);
            
            doc.fontSize(11)
               .font('Helvetica')
               .text(skillCategories[category].join(' • '), {
                 width: 500,
                 lineGap: 2
               });
            
            doc.moveDown(0.7);
          }
        });
      }
      
      // CERTIFICATIONS
      if (resumeData.certifications && resumeData.certifications.length > 0) {
        // Check if we need a new page
        if (doc.y > 650) {
          doc.addPage();
        }
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('CERTIFICATIONS');
        
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveDown(0.5);
        
        resumeData.certifications.forEach((cert, index) => {
          doc.fontSize(11)
             .font('Helvetica-Bold')
             .text(cert.name || 'Certification');
          
          if (cert.issuer) {
            doc.fontSize(10)
               .font('Helvetica')
               .text(cert.issuer);
          }
          
          if (cert.dateObtained) {
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('gray')
               .text(`Obtained: ${new Date(cert.dateObtained).toLocaleDateString()}`);
            doc.fillColor('black');
          }
          
          if (index < resumeData.certifications.length - 1) {
            doc.moveDown(0.5);
          }
        });
        
        doc.moveDown(1);
      }
      
      // FOOTER - Tailoring note
      doc.fontSize(8)
         .font('Helvetica-Oblique')
         .fillColor('gray')
         .text(`This resume has been AI-tailored for ${jobInfo.title} at ${jobInfo.company}`, {
           align: 'center'
         });
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}

/**
 * ENHANCED: Create a tailored version of a resume for a job with improved analysis
 * @param {string} resumeId - MongoDB ID of the resume
 * @param {string} jobId - MongoDB ID of the job
 * @param {Object} tailoringOptions - Options for tailoring
 * @returns {Object} New resume version information
 */
exports.createTailoredResume = async (resumeId, jobId, tailoringOptions) => {
  try {
    console.log(`Creating enhanced tailored resume for resumeId: ${resumeId}, jobId: ${jobId}`);
    
    // Get the resume and job
    const resume = await Resume.findById(resumeId);
    const job = await Job.findById(jobId);
    
    if (!resume) {
      throw new Error('Resume not found');
    }
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Get tailoring recommendations if not provided
    const tailoringRecommendations = tailoringOptions?.recommendations || 
                                    await this.getTailoringRecommendations(resumeId, jobId);
    
    // Create a new resume with the tailored data
    const userId = resume.userId;
    
    // Create a unique name for the new resume
    const newResumeName = tailoringOptions?.name || 
                         `[AI Tailored] ${resume.name} for ${job.title} at ${job.company}`;
    
    // Create a deep copy of the original resume's parsed data
    const parsedData = JSON.parse(JSON.stringify(resume.parsedData));
    
    console.log('🔧 Applying comprehensive tailoring improvements...');
    
    // ENHANCED: Apply tailoring recommendations to the parsed data
    
    // 1. Update summary with job-specific optimization
    if (tailoringRecommendations.summary && 
        tailoringRecommendations.summary.tailored && 
        tailoringRecommendations.summary.tailored !== "Could not generate tailored summary. Please try again later.") {
      
      console.log('✅ Updating professional summary with job-specific keywords');
      parsedData.summary = tailoringRecommendations.summary.tailored;
    }
    
    // 2. ENHANCED: Update experience bullet points with better matching
    if (tailoringRecommendations.experienceImprovements && 
        tailoringRecommendations.experienceImprovements.length > 0) {
      
      console.log('✅ Enhancing experience bullet points for better job alignment');
      
      tailoringRecommendations.experienceImprovements.forEach(improvement => {
        // Find the matching experience with flexible matching
        let experienceIndex = parsedData.experience.findIndex(exp => 
          exp.company === improvement.company && exp.title === improvement.position);
        
        // If exact match not found, try partial matching
        if (experienceIndex === -1) {
          experienceIndex = parsedData.experience.findIndex(exp => 
            exp.company.toLowerCase().includes(improvement.company.toLowerCase()) ||
            exp.title.toLowerCase().includes(improvement.position.toLowerCase()));
        }
        
        if (experienceIndex !== -1 && improvement.tailored && improvement.tailored.length > 0) {
          console.log(`  → Updating ${improvement.company} - ${improvement.position}`);
          parsedData.experience[experienceIndex].highlights = improvement.tailored;
          
          // Also update description if it exists in recommendations
          if (improvement.description) {
            parsedData.experience[experienceIndex].description = improvement.description;
          }
        }
      });
    }
    
    // 3. ENHANCED: Comprehensive skills optimization
    if (tailoringRecommendations.skillsImprovements) {
      console.log('✅ Optimizing skills section for ATS and job requirements');
      
      // Ensure parsedData.skills is initialized as an array
      if (!parsedData.skills) {
        parsedData.skills = [];
      }
      
      // Create a set of existing skill names (handle both string and object formats)
      const existingSkillNames = new Set();
      parsedData.skills.forEach(skill => {
        if (typeof skill === 'string') {
          existingSkillNames.add(skill.toLowerCase());
        } else if (skill && skill.name) {
          existingSkillNames.add(skill.name.toLowerCase());
        }
      });
      
      // Add critical missing skills from job requirements
      if (tailoringRecommendations.skillsImprovements.skillsToAdd) {
        tailoringRecommendations.skillsImprovements.skillsToAdd.forEach(skillName => {
          if (!existingSkillNames.has(skillName.toLowerCase())) {
            const skillObject = {
              name: skillName,
              level: "Proficient", // Default level for added skills
              yearsOfExperience: null,
              addedForJob: true // Flag to indicate this was added during tailoring
            };
            
            console.log(`  → Adding critical skill: ${skillName}`);
            parsedData.skills.unshift(skillObject); // Add to beginning for priority
            existingSkillNames.add(skillName.toLowerCase());
          }
        });
      }
      
      // Reorganize skills to emphasize job-relevant ones
      if (tailoringRecommendations.skillsImprovements.skillsToEmphasize) {
        console.log('  → Reorganizing skills to emphasize job-relevant competencies');
        
        const emphasizedSkills = [];
        const otherSkills = [];
        
        parsedData.skills.forEach(skill => {
          const skillName = typeof skill === 'object' ? skill.name : skill;
          const shouldEmphasize = tailoringRecommendations.skillsImprovements.skillsToEmphasize.some(
            emphasizeSkill => skillName.toLowerCase().includes(emphasizeSkill.toLowerCase())
          );
          
          if (shouldEmphasize) {
            emphasizedSkills.push(skill);
          } else {
            otherSkills.push(skill);
          }
        });
        
        // Reorder: emphasized skills first, then others
        parsedData.skills = [...emphasizedSkills, ...otherSkills];
      }
    }
    
    // 4. Add metadata about tailoring for analysis
    parsedData.tailoringMetadata = {
      originalResumeId: resume._id,
      jobId: job._id,
      jobTitle: job.title,
      company: job.company,
      tailoredAt: new Date(),
      improvementsApplied: {
        summaryUpdated: !!tailoringRecommendations.summary?.tailored,
        experienceEnhanced: tailoringRecommendations.experienceImprovements?.length > 0,
        skillsOptimized: !!tailoringRecommendations.skillsImprovements?.skillsToAdd?.length,
        keywordsAdded: tailoringRecommendations.keywordSuggestions?.length > 0
      },
      keywordsTargeted: tailoringRecommendations.keywordSuggestions || [],
      tailoringVersion: '2.0-enhanced'
    };
    
    console.log('🎨 Generating professionally formatted PDF...');
    
    // Generate the tailored resume as a properly formatted PDF
    const pdfBuffer = await generateResumePDF(parsedData, newResumeName, {
      title: job.title,
      company: job.company
    });
    
    // Generate a unique S3 key
    const s3Key = `resumes/${userId}/${uuid()}.pdf`;
    
    // Upload to S3
    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
    };
    
    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log('📁 Tailored resume PDF uploaded to S3:', s3Key);
    
    // CRITICAL: Create resume with explicit analysis reset
    const newResume = new Resume({
      userId,
      name: newResumeName,
      originalFilename: `${newResumeName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      fileUrl: s3Key,
      fileType: 'PDF',
      isActive: false,
      parsedData: parsedData,
      analysis: null, // FORCE fresh analysis
      isTailored: true,
      tailoredForJob: {
        jobId: job._id,
        jobTitle: job.title,
        company: job.company,
        originalResumeId: resume._id
      },
      versions: [],
      processingStatus: {
        status: 'analyzing',
        progress: 80,
        message: 'Running fresh AI analysis on enhanced tailored resume...',
        updatedAt: new Date()
      }
    });
    
    // Save the resume FIRST
    await newResume.save();
    console.log('💾 Enhanced tailored resume created with ID:', newResume._id);
    
    // CRITICAL: Force a delay to ensure document is fully committed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // CRITICAL: Run fresh analysis with enhanced detection
    console.log('🧠 Starting fresh AI analysis for enhanced tailored resume...');
    
    try {
      // Force fresh analysis by calling service directly
      const analysis = await resumeAnalysisService.analyzeResume(newResume._id);
      
      console.log('📊 Fresh analysis completed:', {
        resumeId: newResume._id,
        overallScore: analysis.overallScore,
        atsCompatibility: analysis.atsCompatibility,
        isTailored: true,
        improvementsDetected: analysis.strengthsHighlight?.includes('tailored') || analysis.strengthsHighlight?.includes('optimized')
      });
      
      // CRITICAL: Update with fresh analysis and enhanced metadata
      await Resume.findByIdAndUpdate(newResume._id, {
        $set: {
          analysis: {
            ...analysis,
            // Add enhancement bonus for tailored resume
            tailoringBonus: {
              applied: true,
              originalScore: resume.analysis?.overallScore || 0,
              improvementDetected: analysis.overallScore > (resume.analysis?.overallScore || 0),
              tailoringDate: new Date()
            }
          },
          processingStatus: {
            status: 'completed',
            progress: 100,
            message: 'Enhanced analysis completed successfully with tailoring optimizations',
            updatedAt: new Date()
          }
        }
      }, { new: true });
      
      console.log('✅ Enhanced analysis saved to database successfully');
      
      // Update local object
      newResume.analysis = analysis;
      newResume.processingStatus = {
        status: 'completed',
        progress: 100,
        message: 'Enhanced analysis completed successfully',
        updatedAt: new Date()
      };
      
    } catch (analysisError) {
      console.error('❌ Error running fresh analysis on enhanced tailored resume:', analysisError);
      
      // Set error state but don't fail the whole process
      await Resume.findByIdAndUpdate(newResume._id, {
        $set: {
          analysis: {
            overallScore: 0,
            atsCompatibility: 0,
            profileSummary: { currentRole: "Analysis pending", careerLevel: "Unknown", industries: [], suggestedJobTitles: [], suggestedIndustries: [] },
            strengths: ["Analysis in progress - please retry"],
            weaknesses: ["Analysis in progress - please retry"],
            keywordsSuggestions: ["Analysis in progress - please retry"],
            improvementAreas: []
          },
          processingStatus: {
            status: 'error',
            progress: 75,
            message: 'Analysis failed - please try manual analysis',
            error: analysisError.message,
            updatedAt: new Date()
          }
        }
      });
    }
    
    // AUTO-TRIGGER: Re-match job with new tailored resume
    console.log('🔄 Auto-triggering job re-match with enhanced tailored resume...');
    try {
      const jobMatchingService = require('./jobMatching.service');
      
      // Force re-match with the new tailored resume
      const matchAnalysis = await jobMatchingService.matchResumeWithJob(newResume._id, jobId);
      
      // Update job's match analysis
      job.matchAnalysis = {
        ...matchAnalysis,
        resumeId: newResume._id,
        lastAnalyzed: new Date(),
        analysisVersion: '2.0-enhanced-tailored',
        tailoredResumeId: newResume._id,
        improvementsApplied: parsedData.tailoringMetadata.improvementsApplied
      };
      
      await job.save();
      
      console.log('✅ Enhanced job re-match completed:', {
        jobId: job._id,
        newScore: `${matchAnalysis.overallScore}%`,
        usedTailoredResume: newResume.name,
        expectedImprovement: 'Should show 10-25 point increase'
      });
      
    } catch (rematchError) {
      console.error('❌ Auto re-match failed (non-critical):', rematchError.message);
      if (job.matchAnalysis) {
        job.matchAnalysis.tailoredResumeId = newResume._id;
        await job.save();
      }
    }
    
    // Generate signed URL for download
    const getObjectParams = {
      Bucket: S3_BUCKET,
      Key: s3Key
    };
    
    const command = new GetObjectCommand(getObjectParams);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return {
      message: "Enhanced tailored resume created successfully with fresh analysis and improved formatting",
      resume: {
        id: newResume._id,
        name: newResume.name,
        originalFilename: newResume.originalFilename,
        fileType: newResume.fileType,
        isTailored: newResume.isTailored,
        downloadUrl: signedUrl,
        analysis: newResume.analysis,
        processingStatus: newResume.processingStatus,
        createdAt: newResume.createdAt,
        tailoringMetadata: parsedData.tailoringMetadata
      }
    };
  } catch (error) {
    console.error('Error creating enhanced tailored resume:', error);
    throw error;
  }
};