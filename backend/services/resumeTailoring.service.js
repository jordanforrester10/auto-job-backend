// services/resumeTailoring.service.js - FIXED SKILLS VALIDATION ISSUE
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
 * Get tailoring recommendations for a resume based on a job
 * @param {string} resumeId - MongoDB ID of the resume
 * @param {string} jobId - MongoDB ID of the job
 * @returns {Object} Tailoring recommendations
 */
exports.getTailoringRecommendations = async (resumeId, jobId) => {
  try {
    console.log(`Generating tailoring recommendations for resume ${resumeId} to job ${jobId}`);
    
    // Get the resume, job, and any existing match analysis
    const resume = await Resume.findById(resumeId);
    const job = await Job.findById(jobId);
    
    if (!resume) {
      throw new Error('Resume not found');
    }
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Get the match analysis if it exists
    const matchAnalysis = job.matchAnalysis && job.matchAnalysis.resumeId && 
                          job.matchAnalysis.resumeId.toString() === resumeId ? 
                          job.matchAnalysis : null;
    
    console.log('Generating tailoring recommendations with OpenAI');
    
    // Convert data to strings for OpenAI
    const resumeData = JSON.stringify(resume.parsedData, null, 2);
    const jobData = JSON.stringify(job.parsedData, null, 2);
    const matchData = matchAnalysis ? JSON.stringify(matchAnalysis, null, 2) : 'No match analysis available';
    
    // Prompt for OpenAI to generate tailoring recommendations
    const prompt = `
    Generate detailed recommendations for tailoring the following resume to better match the job description.

    Provide the recommendations in JSON format with the following structure:
    {
      "summary": {
        "original": "original summary text",
        "tailored": "tailored summary text"
      },
      "experienceImprovements": [
        {
          "company": "company name",
          "position": "position title",
          "original": ["original bullet point 1", "original bullet point 2"],
          "tailored": ["tailored bullet point 1", "tailored bullet point 2"]
        }
      ],
      "skillsImprovements": {
        "skillsToAdd": ["skill1", "skill2"],
        "skillsToEmphasize": ["skill3", "skill4"]
      },
      "keywordSuggestions": ["keyword1", "keyword2", "keyword3"],
      "formatSuggestions": ["format suggestion 1", "format suggestion 2"],
      "generalAdvice": "General advice for tailoring this resume to this job"
    }

    Return ONLY the JSON without any markdown formatting, code blocks, or additional explanation.
    Focus on tailoring content to highlight experience and skills that are most relevant to the job.
    The tailored content should be truthful and based on the original resume - no fabrication.
    Use relevant keywords and phrases from the job description naturally.
    Prioritize the most important skills and requirements from the job description.
    Keep the tailored version concise, impactful, and achievement-oriented.

    Resume Data:
    ${resumeData}

    Job Data:
    ${jobData}

    Match Analysis:
    ${matchData}
    `;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "You are an expert resume writer specializing in tailoring resumes to specific job descriptions. Return ONLY JSON without markdown formatting or code blocks."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 3000,
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    
    // Extract JSON from the response if it's wrapped in markdown
    let jsonStr = content;
    
    // Handle potential markdown code blocks
    if (content.includes('```')) {
      const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
      }
    }
    
    // Clean up any extra whitespace or newlines
    jsonStr = jsonStr.trim();
    
    // Ensure it's a valid JSON object
    if (!jsonStr.startsWith('{')) {
      jsonStr = '{' + jsonStr.substring(jsonStr.indexOf('"'));
    }
    if (!jsonStr.endsWith('}')) {
      jsonStr = jsonStr.substring(0, jsonStr.lastIndexOf('}') + 1);
    }
    
    // Parse the cleaned JSON
    const recommendations = JSON.parse(jsonStr);
    console.log('Resume tailoring recommendations with OpenAI completed successfully');
    
    return recommendations;
  } catch (error) {
    console.error('Error generating tailoring recommendations with OpenAI:', error);
    
    // Fallback to a simplified recommendations structure
    return {
      summary: {
        original: "Could not retrieve original summary.",
        tailored: "Could not generate tailored summary. Please try again later."
      },
      experienceImprovements: [],
      skillsImprovements: {
        skillsToAdd: ["Technical error occurred while generating recommendations."],
        skillsToEmphasize: []
      },
      keywordSuggestions: ["Please try again later."],
      formatSuggestions: ["Ensure your resume is clear and concise."],
      generalAdvice: "Focus on highlighting relevant experience and skills that match the job requirements."
    };
  }
};

/**
 * Generate a proper PDF from resume data
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
        size: 'A4'
      });
      
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      
      // Helper function to add styled text
      const addText = (text, options = {}) => {
        const defaultOptions = {
          fontSize: 11,
          lineGap: 2
        };
        doc.text(text, { ...defaultOptions, ...options });
      };
      
      // Header with contact info
      if (resumeData.contactInfo) {
        doc.fontSize(18).font('Helvetica-Bold')
           .text(resumeData.contactInfo.name || 'Professional Resume', { align: 'center' });
        
        doc.fontSize(10).font('Helvetica')
           .text([
             resumeData.contactInfo.email,
             resumeData.contactInfo.phone,
             resumeData.contactInfo.location
           ].filter(Boolean).join(' | '), { align: 'center' });
        
        doc.moveDown(1);
      }
      
      // Professional Summary
      if (resumeData.summary) {
        doc.fontSize(14).font('Helvetica-Bold').text('PROFESSIONAL SUMMARY');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        
        doc.fontSize(11).font('Helvetica').text(resumeData.summary, {
          align: 'justify',
          lineGap: 2
        });
        doc.moveDown(1);
      }
      
      // Work Experience
      if (resumeData.experience && resumeData.experience.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('WORK EXPERIENCE');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        
        resumeData.experience.forEach((exp, index) => {
          // Job title and company
          doc.fontSize(12).font('Helvetica-Bold')
             .text(`${exp.title || 'Position'} | ${exp.company || 'Company'}`, { continued: false });
          
          // Dates and location
          const dateStr = exp.startDate && exp.endDate 
            ? `${new Date(exp.startDate).toLocaleDateString()} - ${exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'Present'}`
            : exp.startDate 
              ? `From ${new Date(exp.startDate).toLocaleDateString()}`
              : 'Date not specified';
          
          doc.fontSize(10).font('Helvetica').fillColor('gray')
             .text(`${dateStr}${exp.location ? ' | ' + exp.location : ''}`, { align: 'right' });
          
          doc.fillColor('black').moveDown(0.3);
          
          // Description
          if (exp.description) {
            doc.fontSize(11).font('Helvetica').text(exp.description, { lineGap: 2 });
            doc.moveDown(0.3);
          }
          
          // Highlights/Achievements
          if (exp.highlights && exp.highlights.length > 0) {
            exp.highlights.forEach(highlight => {
              doc.fontSize(11).font('Helvetica')
                 .text(`• ${highlight}`, { 
                   indent: 15,
                   lineGap: 2,
                   paragraphGap: 2
                 });
            });
          }
          
          // Skills used
          if (exp.skills && exp.skills.length > 0) {
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica-Oblique').fillColor('gray')
               .text(`Technologies: ${exp.skills.join(', ')}`, { lineGap: 2 });
            doc.fillColor('black');
          }
          
          if (index < resumeData.experience.length - 1) {
            doc.moveDown(0.8);
          }
        });
        
        doc.moveDown(1);
      }
      
      // Education
      if (resumeData.education && resumeData.education.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('EDUCATION');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        
        resumeData.education.forEach((edu, index) => {
          doc.fontSize(12).font('Helvetica-Bold')
             .text(`${edu.degree || 'Degree'} ${edu.field ? 'in ' + edu.field : ''}`);
          
          doc.fontSize(11).font('Helvetica')
             .text(edu.institution || 'Institution');
          
          if (edu.startDate || edu.endDate) {
            const dateStr = edu.startDate && edu.endDate 
              ? `${new Date(edu.startDate).getFullYear()} - ${new Date(edu.endDate).getFullYear()}`
              : edu.endDate 
                ? new Date(edu.endDate).getFullYear().toString()
                : 'Current';
            
            doc.fontSize(10).font('Helvetica').fillColor('gray')
               .text(dateStr);
            doc.fillColor('black');
          }
          
          if (edu.gpa) {
            doc.fontSize(10).text(`GPA: ${edu.gpa}`);
          }
          
          if (index < resumeData.education.length - 1) {
            doc.moveDown(0.5);
          }
        });
        
        doc.moveDown(1);
      }
      
      // Skills
      if (resumeData.skills && resumeData.skills.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('SKILLS & TECHNOLOGIES');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        
        const skillsText = resumeData.skills.map(skill => {
          if (typeof skill === 'object' && skill.name) {
            return skill.level ? `${skill.name} (${skill.level})` : skill.name;
          }
          return skill;
        }).join(' • ');
        
        doc.fontSize(11).font('Helvetica').text(skillsText, { lineGap: 2 });
        doc.moveDown(1);
      }
      
      // Certifications
      if (resumeData.certifications && resumeData.certifications.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('CERTIFICATIONS');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        
        resumeData.certifications.forEach((cert, index) => {
          doc.fontSize(11).font('Helvetica-Bold').text(cert.name || 'Certification');
          doc.fontSize(10).font('Helvetica').text(cert.issuer || 'Issuer');
          
          if (cert.dateObtained) {
            doc.fontSize(10).fillColor('gray')
               .text(`Obtained: ${new Date(cert.dateObtained).toLocaleDateString()}`);
            doc.fillColor('black');
          }
          
          if (index < resumeData.certifications.length - 1) {
            doc.moveDown(0.5);
          }
        });
        
        doc.moveDown(1);
      }
      
      // Footer note about tailoring
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('gray')
         .text(`This resume has been AI-tailored for ${jobInfo.title} at ${jobInfo.company}`, {
           align: 'center'
         });
      
      // Finalize PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create a tailored version of a resume for a job
 * @param {string} resumeId - MongoDB ID of the resume
 * @param {string} jobId - MongoDB ID of the job
 * @param {Object} tailoringOptions - Options for tailoring
 * @returns {Object} New resume version information
 */
exports.createTailoredResume = async (resumeId, jobId, tailoringOptions) => {
  try {
    console.log(`Creating tailored resume for resumeId: ${resumeId}, jobId: ${jobId}`);
    
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
    
    // Apply tailoring recommendations to the parsed data
    // Update summary if available
    if (tailoringRecommendations.summary && 
        tailoringRecommendations.summary.tailored && 
        tailoringRecommendations.summary.tailored !== "Could not generate tailored summary. Please try again later.") {
      parsedData.summary = tailoringRecommendations.summary.tailored;
    }
    
    // Update experience bullet points
    if (tailoringRecommendations.experienceImprovements && 
        tailoringRecommendations.experienceImprovements.length > 0) {
      
      tailoringRecommendations.experienceImprovements.forEach(improvement => {
        // Find the matching experience in the original resume
        const experienceIndex = parsedData.experience.findIndex(exp => 
          exp.company === improvement.company && exp.title === improvement.position);
        
        if (experienceIndex !== -1) {
          // If there are highlights, replace them with the tailored ones
          if (parsedData.experience[experienceIndex].highlights && improvement.tailored) {
            parsedData.experience[experienceIndex].highlights = improvement.tailored;
          }
        }
      });
    }
    
    // FIXED: Add missing skills - ALWAYS ensure they are objects matching the schema
    if (tailoringRecommendations.skillsImprovements && 
        tailoringRecommendations.skillsImprovements.skillsToAdd) {
      
      console.log('Adding skills from tailoring recommendations:', tailoringRecommendations.skillsImprovements.skillsToAdd);
      
      // Ensure parsedData.skills is initialized as an array
      if (!parsedData.skills) {
        parsedData.skills = [];
      }
      
      // Create a set of existing skill names for quick lookup (handle both string and object formats)
      const existingSkillNames = new Set();
      parsedData.skills.forEach(skill => {
        if (typeof skill === 'string') {
          existingSkillNames.add(skill.toLowerCase());
        } else if (skill && skill.name) {
          existingSkillNames.add(skill.name.toLowerCase());
        }
      });
      
      // Add new skills that don't already exist - ALWAYS as objects to match schema
      tailoringRecommendations.skillsImprovements.skillsToAdd.forEach(skillName => {
        if (!existingSkillNames.has(skillName.toLowerCase())) {
          // CRITICAL FIX: Always push skills as objects matching the MongoDB schema
          const skillObject = {
            name: skillName,
            level: "Intermediate", // Default level
            yearsOfExperience: null
          };
          
          console.log('Adding skill object:', skillObject);
          parsedData.skills.push(skillObject);
          
          // Add to existing names set to prevent duplicates
          existingSkillNames.add(skillName.toLowerCase());
        }
      });
      
      console.log('Final skills array length:', parsedData.skills.length);
      console.log('Sample skill object:', parsedData.skills[0]);
    }
    
    console.log('Generating tailored resume PDF...');
    
    // Generate the tailored resume as a proper PDF
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
    console.log('Tailored resume PDF uploaded to S3:', s3Key);
    
    // Create a new resume document in MongoDB WITHOUT ANALYSIS INITIALLY
    const newResume = new Resume({
      userId,
      name: newResumeName,
      originalFilename: `${newResumeName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      fileUrl: s3Key,
      fileType: 'PDF',
      isActive: false,
      parsedData: parsedData,
      analysis: null, // CRITICAL: Set to null initially to force fresh analysis
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
        progress: 75,
        message: 'Running fresh AI analysis on tailored resume...',
        updatedAt: new Date()
      }
    });
    
    // CRITICAL: Save the resume FIRST, then run analysis
    await newResume.save();
    console.log('Tailored resume created successfully with ID:', newResume._id);
    
    // CRITICAL: Add a delay to ensure the resume is fully saved before analysis
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // CRITICAL: Run fresh analysis on the tailored resume in a separate process
    console.log('Starting fresh AI analysis for tailored resume...');
    
    try {
      // Force a fresh analysis by calling the service directly
      const analysis = await resumeAnalysisService.analyzeResume(newResume._id);
      
      console.log('Fresh analysis completed:', {
        resumeId: newResume._id,
        overallScore: analysis.overallScore,
        atsCompatibility: analysis.atsCompatibility,
        hasProfileSummary: !!analysis.profileSummary,
        strengthsCount: analysis.strengths?.length || 0
      });
      
      // CRITICAL: Update the resume with the NEW analysis scores
      await Resume.findByIdAndUpdate(newResume._id, {
        $set: {
          analysis: analysis,
          processingStatus: {
            status: 'completed',
            progress: 100,
            message: 'Fresh analysis completed successfully',
            updatedAt: new Date()
          }
        }
      }, { new: true });
      
      console.log('✅ Fresh analysis saved to database successfully');
      
      // Update the local object for return
      newResume.analysis = analysis;
      newResume.processingStatus = {
        status: 'completed',
        progress: 100,
        message: 'Fresh analysis completed successfully',
        updatedAt: new Date()
      };
      
    } catch (analysisError) {
      console.error('❌ Error running fresh analysis on tailored resume:', analysisError);
      
      // Update status to show analysis failed
      await Resume.findByIdAndUpdate(newResume._id, {
        $set: {
          analysis: {
            overallScore: 0,
            atsCompatibility: 0,
            profileSummary: { currentRole: "Analysis pending", careerLevel: "Unknown", industries: [], suggestedJobTitles: [], suggestedIndustries: [] },
            strengths: ["Analysis in progress..."],
            weaknesses: ["Analysis in progress..."],
            keywordsSuggestions: ["Analysis in progress..."],
            improvementAreas: []
          },
          processingStatus: {
            status: 'error',
            progress: 50,
            message: 'Fresh analysis failed - please try manual analysis',
            error: analysisError.message,
            updatedAt: new Date()
          }
        }
      });
      
      // Set the error state in the local object
      newResume.analysis = {
        overallScore: 0,
        atsCompatibility: 0,
        profileSummary: { currentRole: "Analysis pending", careerLevel: "Unknown", industries: [], suggestedJobTitles: [], suggestedIndustries: [] },
        strengths: ["Analysis failed - please retry"],
        weaknesses: ["Analysis failed - please retry"],
        keywordsSuggestions: ["Analysis failed - please retry"],
        improvementAreas: []
      };
    }
    
    // AUTOMATIC TRIGGER: Re-match THIS SPECIFIC JOB with the new tailored resume
    console.log('🔄 Auto-triggering job re-match with new tailored resume...');
    try {
      const jobMatchingService = require('./jobMatching.service');
      
      // Force re-match this specific job with the new tailored resume
      const matchAnalysis = await jobMatchingService.matchResumeWithJob(newResume._id, jobId);
      
      // Update the job's match analysis with the new tailored resume
      job.matchAnalysis = {
        ...matchAnalysis,
        resumeId: newResume._id,
        lastAnalyzed: new Date(),
        analysisVersion: '2.0-tailored-auto',
        tailoredResumeId: newResume._id
      };
      
      await job.save();
      
      console.log('✅ Job-specific auto re-match completed:', {
        jobId: job._id,
        jobTitle: job.title,
        newScore: `${matchAnalysis.overallScore}%`,
        usedTailoredResume: newResume.name
      });
      
    } catch (rematchError) {
      console.error('❌ Auto re-match failed (non-critical):', rematchError.message);
      // Still add reference even if re-matching fails
      if (job.matchAnalysis) {
        job.matchAnalysis.tailoredResumeId = newResume._id;
        await job.save();
      }
    }
    
    // Generate a signed URL for downloading
    const getObjectParams = {
      Bucket: S3_BUCKET,
      Key: s3Key
    };
    
    const command = new GetObjectCommand(getObjectParams);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return {
      message: "Tailored resume created successfully with fresh analysis",
      resume: {
        id: newResume._id,
        name: newResume.name,
        originalFilename: newResume.originalFilename,
        fileType: newResume.fileType,
        isTailored: newResume.isTailored,
        downloadUrl: signedUrl,
        analysis: newResume.analysis,
        processingStatus: newResume.processingStatus,
        createdAt: newResume.createdAt
      }
    };
  } catch (error) {
    console.error('Error creating tailored resume:', error);
    throw error;
  }
};

//