// backend/services/resumeEditor.service.js - AI-POWERED RESUME EDITOR
const { openai } = require('../config/openai');
const Resume = require('../models/mongodb/resume.model');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, S3_BUCKET } = require('../config/s3');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const uuid = require('uuid').v4;

class ResumeEditorService {
  /**
   * Apply AI-suggested changes to a resume
   */
  static async applyResumeChanges(resumeId, userId, changes) {
    try {
      console.log(`🤖 AJ: Applying changes to resume ${resumeId}`);
      
      const resume = await Resume.findOne({ _id: resumeId, userId });
      if (!resume) {
        throw new Error('Resume not found');
      }

      // Parse the change request using AI
      const structuredChanges = await this.parseChangeRequest(changes, resume.parsedData);
      
      // Apply changes to resume data
      const updatedResumeData = await this.applyStructuredChanges(resume.parsedData, structuredChanges);
      
      // Update resume in database
      resume.parsedData = updatedResumeData;
      resume.updatedAt = new Date();
      
      // Add version tracking
      const versionNumber = (resume.versions || []).length + 1;
      if (!resume.versions) resume.versions = [];
      
      // Create new version entry
      const newVersion = {
        versionNumber,
        createdAt: new Date(),
        fileUrl: resume.fileUrl, // Will be updated after file generation
        changesDescription: this.summarizeChanges(structuredChanges),
        aiGenerated: true
      };

      resume.versions.push(newVersion);
      await resume.save();

      // Generate updated resume file
      const updatedFileUrl = await this.generateUpdatedResumeFile(resume, updatedResumeData);
      
      // Update the version with new file URL
      resume.versions[resume.versions.length - 1].fileUrl = updatedFileUrl;
      await resume.save();

      console.log(`✅ AJ: Successfully updated resume with ${structuredChanges.length} changes`);

      return {
        success: true,
        updatedResume: resume,
        changes: structuredChanges,
        newFileUrl: updatedFileUrl,
        changesSummary: this.summarizeChanges(structuredChanges)
      };

    } catch (error) {
      console.error('Resume update error:', error);
      throw error;
    }
  }

  /**
   * Parse natural language change request into structured changes
   */
static async parseChangeRequest(changeRequest, currentResumeData) {
  try {
    const prompt = `You are an expert resume editor. Parse this change request and convert it into structured JSON changes.

CURRENT RESUME DATA:
${JSON.stringify(currentResumeData, null, 2)}

CHANGE REQUEST:
"${changeRequest}"

CRITICAL: When updating work experience highlights/achievements, generate ONE single action that replaces the entire highlights array with 3-5 detailed bullet points.

Return JSON in this EXACT format:
{
  "changes": [
    {
      "section": "experience",
      "action": "enhance",
      "target": "0",
      "field": "highlights",
      "newValue": [
        "Detailed bullet point 1 with specific metrics and technologies",
        "Detailed bullet point 2 showcasing leadership and impact", 
        "Detailed bullet point 3 with quantifiable business results",
        "Detailed bullet point 4 highlighting technical expertise",
        "Detailed bullet point 5 demonstrating strategic thinking"
      ],
      "originalValue": "current highlights array",
      "reason": "Enhanced with multiple detailed achievements"
    }
  ]
}

IMPORTANT RULES:
- Generate EXACTLY ONE change action, not multiple separate ones
- Use action: "enhance" for updating existing experience
- Set field: "highlights" for bullet points
- newValue MUST be an array of 3-5 detailed strings
- Each bullet should be 15-25 words with specific metrics
- Use strong action verbs (Led, Developed, Achieved, Implemented, etc.)
- Include technologies, numbers, percentages, and business impact
- Make bullets relevant to the current role and industry

EXAMPLE - DO THIS:
{
  "changes": [
    {
      "section": "experience",
      "action": "enhance",
      "target": "0",
      "field": "highlights", 
      "newValue": [
        "Led development of AI-powered tax platform serving 10k+ enterprise clients with 40% faster processing",
        "Architected machine learning workflows reducing manual review time by 65% and improving accuracy to 98%",
        "Managed cross-functional team of 15 engineers delivering $3.2M in new AI product revenue",
        "Implemented automated compliance checking system preventing 200+ regulatory violations annually",
        "Drove product strategy for agentic AI features resulting in 85% customer satisfaction increase"
      ],
      "reason": "Enhanced Thomson Reuters role with specific AI achievements and quantifiable impact"
    }
  ]
}

DON'T DO THIS (multiple separate actions):
{
  "changes": [
    {"action": "add", "target": "0/highlights", "newValue": "bullet 1"},
    {"action": "add", "target": "0/highlights", "newValue": "bullet 2"},
    {"action": "add", "target": "0/highlights", "newValue": "bullet 3"}
  ]
}

IMPORTANT: Return ONLY the JSON object, no markdown or additional text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume editor. Generate ONE comprehensive change action with an array of detailed bullet points. Return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    let parsedChanges;
    try {
      const responseContent = response.choices[0].message.content.trim();
      // Clean up response if it has markdown
      const cleanedResponse = responseContent.replace(/```json\n?|\n?```/g, '').trim();
      parsedChanges = JSON.parse(cleanedResponse);
      
      console.log('📋 Parsed changes:', JSON.stringify(parsedChanges, null, 2));
      
      // 🔧 VALIDATION: Ensure we have the right structure for experience updates
      if (parsedChanges.changes) {
        parsedChanges.changes.forEach((change, index) => {
          if (change.section === 'experience' && 
              change.action === 'enhance' && 
              change.field === 'highlights' && 
              Array.isArray(change.newValue)) {
            console.log(`✅ Valid experience enhancement found with ${change.newValue.length} bullet points`);
          }
        });
      }
      
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse change request');
    }

    return parsedChanges.changes || [];

  } catch (error) {
    console.error('Error parsing change request:', error);
    throw error;
  }
}

  /**
   * Apply structured changes to resume data
   */
  static async applyStructuredChanges(resumeData, changes) {
    const updatedData = JSON.parse(JSON.stringify(resumeData)); // Deep clone

    for (const change of changes) {
      try {
        console.log(`Applying change: ${change.action} to ${change.section}`);
        
        switch (change.section) {
          case 'contactInfo':
            this.updateContactInfo(updatedData, change);
            break;
          case 'summary':
            this.updateSummary(updatedData, change);
            break;
          case 'experience':
            this.updateExperience(updatedData, change);
            break;
          case 'education':
            this.updateEducation(updatedData, change);
            break;
          case 'skills':
            this.updateSkills(updatedData, change);
            break;
          case 'certifications':
            this.updateCertifications(updatedData, change);
            break;
          case 'projects':
            this.updateProjects(updatedData, change);
            break;
          case 'languages':
            this.updateLanguages(updatedData, change);
            break;
          default:
            console.warn(`Unknown section: ${change.section}`);
        }
      } catch (error) {
        console.error(`Error applying change to ${change.section}:`, error);
      }
    }

    return updatedData;
  }

  // Section-specific update methods
  static updateContactInfo(data, change) {
    if (!data.contactInfo) data.contactInfo = {};
    
    switch (change.action) {
      case 'update':
        if (change.target && change.newValue) {
          data.contactInfo[change.target] = change.newValue;
        }
        break;
      case 'add':
        if (change.target === 'websites' && change.newValue) {
          if (!data.contactInfo.websites) data.contactInfo.websites = [];
          data.contactInfo.websites.push(change.newValue);
        }
        break;
    }
  }

  static updateSummary(data, change) {
    switch (change.action) {
      case 'update':
      case 'rewrite':
      case 'enhance':
        data.summary = change.newValue;
        break;
      case 'add':
        if (!data.summary) {
          data.summary = change.newValue;
        }
        break;
    }
  }

static updateExperience(data, change) {
  if (!data.experience) data.experience = [];

  console.log(`🔧 Updating experience - Action: ${change.action}, Target: ${change.target}, Field: ${change.field}`);
  console.log(`🔧 NewValue type: ${Array.isArray(change.newValue) ? 'array' : typeof change.newValue}`);
  console.log(`🔧 NewValue content:`, change.newValue);

  switch (change.action) {
    case 'add':
      // 🎯 FIXED: Handle adding new experience vs adding to existing experience
      if (change.target && change.target.includes('/')) {
        // Adding to existing experience (e.g., "0/highlights")
        const [indexStr, field] = change.target.split('/');
        const index = parseInt(indexStr);
        
        if (data.experience[index]) {
          if (field === 'highlights') {
            // Initialize highlights array if it doesn't exist
            if (!data.experience[index].highlights) {
              data.experience[index].highlights = [];
            }
            
            if (Array.isArray(change.newValue)) {
              // 🔧 FIXED: Replace entire highlights array with new content
              console.log(`🎯 Replacing highlights array with ${change.newValue.length} items`);
              data.experience[index].highlights = change.newValue;
            } else if (typeof change.newValue === 'string') {
              // Add single highlight
              console.log(`🎯 Adding single highlight: ${change.newValue}`);
              data.experience[index].highlights.push(change.newValue);
            }
            console.log(`✅ Updated experience[${index}].highlights - now has ${data.experience[index].highlights.length} items`);
          } else {
            // Add to other fields
            data.experience[index][field] = change.newValue;
            console.log(`✅ Added to experience[${index}].${field}`);
          }
        } else {
          console.warn(`❌ Experience index ${index} not found`);
        }
      } else if (change.newValue && typeof change.newValue === 'object') {
        // Adding entirely new experience entry
        data.experience.push(change.newValue);
        console.log('✅ Added new experience entry');
      }
      break;
      
    case 'update':
      if (change.target !== undefined) {
        const index = parseInt(change.target);
        if (data.experience[index]) {
          // Update specific field or entire experience entry
          if (change.field) {
            data.experience[index][change.field] = change.newValue;
            console.log(`✅ Updated experience[${index}].${change.field}`);
          } else {
            data.experience[index] = { ...data.experience[index], ...change.newValue };
            console.log(`✅ Updated entire experience[${index}]`);
          }
        } else {
          console.warn(`❌ Experience index ${index} not found`);
        }
      }
      break;
      
    case 'delete':
      if (change.target !== undefined) {
        const index = parseInt(change.target);
        data.experience.splice(index, 1);
        console.log(`✅ Deleted experience[${index}]`);
      }
      break;
      
    case 'enhance':
      if (change.target !== undefined) {
        const index = parseInt(change.target);
        if (data.experience[index]) {
          
          // 🎯 ENHANCED: Handle highlights field specifically
          if (change.field === 'highlights' && Array.isArray(change.newValue)) {
            console.log(`🎯 Setting experience[${index}].highlights with ${change.newValue.length} bullet points`);
            data.experience[index].highlights = change.newValue;
            console.log(`✅ Enhanced experience[${index}].highlights:`, data.experience[index].highlights);
            
          } else if (change.field === 'description') {
            data.experience[index].description = change.newValue;
            console.log(`✅ Enhanced experience[${index}].description`);
            
          } else if (change.field && change.newValue) {
            // Handle other specific fields
            data.experience[index][change.field] = change.newValue;
            console.log(`✅ Enhanced experience[${index}].${change.field}`);
            
          } else if (!change.field && Array.isArray(change.newValue)) {
            // 🔧 FIXED: Default to highlights when no field specified but array provided
            console.log('🎯 No field specified, defaulting to highlights for array data');
            data.experience[index].highlights = change.newValue;
            console.log(`✅ Set experience[${index}].highlights with ${change.newValue.length} items`);
            
          } else if (!change.field && typeof change.newValue === 'object') {
            // Handle object updates
            Object.keys(change.newValue).forEach(key => {
              data.experience[index][key] = change.newValue[key];
              console.log(`✅ Updated experience[${index}].${key}`);
            });
            
          } else {
            console.warn(`❌ Cannot enhance experience[${index}] - invalid field/value combination`);
            console.warn(`Field: ${change.field}, NewValue: ${JSON.stringify(change.newValue)}`);
          }
        } else {
          console.warn(`❌ Experience index ${index} not found for enhancement`);
        }
      } else {
        console.warn('❌ No target specified for enhance action');
      }
      break;
      
    default:
      console.warn(`❌ Unknown action: ${change.action}`);
  }
}

  static updateEducation(data, change) {
    if (!data.education) data.education = [];

    switch (change.action) {
      case 'add':
        if (change.newValue && typeof change.newValue === 'object') {
          data.education.push(change.newValue);
        }
        break;
      case 'update':
        if (change.target !== undefined) {
          const index = parseInt(change.target);
          if (data.education[index]) {
            if (change.field) {
              data.education[index][change.field] = change.newValue;
            } else {
              data.education[index] = { ...data.education[index], ...change.newValue };
            }
          }
        }
        break;
      case 'delete':
        if (change.target !== undefined) {
          const index = parseInt(change.target);
          data.education.splice(index, 1);
        }
        break;
    }
  }

  static updateSkills(data, change) {
    if (!data.skills) data.skills = [];

    switch (change.action) {
      case 'add':
        if (change.newValue) {
          // Handle both string and object skills
          if (typeof change.newValue === 'string') {
            data.skills.push({ name: change.newValue, level: 'Intermediate' });
          } else {
            data.skills.push(change.newValue);
          }
        }
        break;
      case 'update':
        if (change.target) {
          const skillIndex = data.skills.findIndex(skill => 
            (typeof skill === 'string' ? skill : skill.name) === change.target
          );
          if (skillIndex !== -1) {
            if (typeof change.newValue === 'string') {
              data.skills[skillIndex] = { name: change.newValue, level: 'Intermediate' };
            } else {
              data.skills[skillIndex] = change.newValue;
            }
          }
        }
        break;
      case 'delete':
        if (change.target) {
          data.skills = data.skills.filter(skill => 
            (typeof skill === 'string' ? skill : skill.name) !== change.target
          );
        }
        break;
    }
  }

  static updateCertifications(data, change) {
    if (!data.certifications) data.certifications = [];

    switch (change.action) {
      case 'add':
        if (change.newValue && typeof change.newValue === 'object') {
          data.certifications.push(change.newValue);
        }
        break;
      case 'update':
        if (change.target !== undefined) {
          const index = parseInt(change.target);
          if (data.certifications[index]) {
            data.certifications[index] = { ...data.certifications[index], ...change.newValue };
          }
        }
        break;
      case 'delete':
        if (change.target !== undefined) {
          const index = parseInt(change.target);
          data.certifications.splice(index, 1);
        }
        break;
    }
  }

  static updateProjects(data, change) {
    if (!data.projects) data.projects = [];

    switch (change.action) {
      case 'add':
        if (change.newValue && typeof change.newValue === 'object') {
          data.projects.push(change.newValue);
        }
        break;
      case 'update':
        if (change.target !== undefined) {
          const index = parseInt(change.target);
          if (data.projects[index]) {
            data.projects[index] = { ...data.projects[index], ...change.newValue };
          }
        }
        break;
      case 'delete':
        if (change.target !== undefined) {
          const index = parseInt(change.target);
          data.projects.splice(index, 1);
        }
        break;
    }
  }

  static updateLanguages(data, change) {
    if (!data.languages) data.languages = [];

    switch (change.action) {
      case 'add':
        if (change.newValue && typeof change.newValue === 'object') {
          data.languages.push(change.newValue);
        }
        break;
      case 'update':
        if (change.target !== undefined) {
          const index = parseInt(change.target);
          if (data.languages[index]) {
            data.languages[index] = { ...data.languages[index], ...change.newValue };
          }
        }
        break;
      case 'delete':
        if (change.target !== undefined) {
          const index = parseInt(change.target);
          data.languages.splice(index, 1);
        }
        break;
    }
  }

  /**
   * Generate updated resume file (PDF/DOCX)
   */
  static async generateUpdatedResumeFile(resume, updatedData) {
    try {
      const fileType = resume.fileType;
      let buffer;
      let contentType;
      let extension;

      if (fileType === 'PDF') {
        buffer = await this.generatePDF(updatedData);
        contentType = 'application/pdf';
        extension = '.pdf';
      } else if (fileType === 'DOCX') {
        buffer = await this.generateDOCX(updatedData);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = '.docx';
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Upload to S3
      const s3Key = `resumes/${resume.userId}/updated_${uuid()}${extension}`;
      
      const uploadParams = {
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
      
      console.log(`✅ Generated updated resume file: ${s3Key}`);
      return s3Key;

    } catch (error) {
      console.error('Error generating updated resume file:', error);
      throw error;
    }
  }

/**
 * Send progress update to connected SSE clients
 */
static sendProgressUpdate(resumeId, userId, stage, percentage, message) {
  try {
    if (global.progressClients) {
      const progressData = {
        type: 'progress',
        resumeId,
        stage,
        percentage,
        message,
        timestamp: new Date().toISOString()
      };
      
      // Send to all clients for this user/resume
      global.progressClients.forEach((res, clientId) => {
        if (clientId.includes(`${userId}_${resumeId}`)) {
          try {
            res.write(`data: ${JSON.stringify(progressData)}\n\n`);
            console.log(`📡 Sent progress: ${percentage}% - ${message}`);
          } catch (error) {
            console.error('Error sending SSE progress:', error);
            global.progressClients.delete(clientId);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error in sendProgressUpdate:', error);
  }
}

  /**
   * Generate PDF from resume data
   */
  static async generatePDF(resumeData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).text(resumeData.contactInfo?.name || 'Resume', { align: 'center' });
        doc.fontSize(12);
        
        if (resumeData.contactInfo?.email) {
          doc.text(`Email: ${resumeData.contactInfo.email}`);
        }
        if (resumeData.contactInfo?.phone) {
          doc.text(`Phone: ${resumeData.contactInfo.phone}`);
        }
        if (resumeData.contactInfo?.location) {
          doc.text(`Location: ${resumeData.contactInfo.location}`);
        }

        doc.moveDown();

        // Summary
        if (resumeData.summary) {
          doc.fontSize(14).text('Professional Summary', { underline: true });
          doc.fontSize(11).text(resumeData.summary);
          doc.moveDown();
        }

        // Experience
        if (resumeData.experience && resumeData.experience.length > 0) {
          doc.fontSize(14).text('Work Experience', { underline: true });
          resumeData.experience.forEach(exp => {
            doc.fontSize(12).text(`${exp.title} at ${exp.company}`, { bold: true });
            if (exp.startDate || exp.endDate) {
              doc.fontSize(10).text(`${exp.startDate || ''} - ${exp.endDate || 'Present'}`);
            }
            if (exp.description) {
              doc.fontSize(11).text(exp.description);
            }
            if (exp.highlights && exp.highlights.length > 0) {
              exp.highlights.forEach(highlight => {
                doc.text(`• ${highlight}`);
              });
            }
            doc.moveDown();
          });
        }

        // Education
        if (resumeData.education && resumeData.education.length > 0) {
          doc.fontSize(14).text('Education', { underline: true });
          resumeData.education.forEach(edu => {
            doc.fontSize(12).text(`${edu.degree} in ${edu.field || ''}`);
            doc.fontSize(11).text(edu.institution);
            if (edu.startDate || edu.endDate) {
              doc.fontSize(10).text(`${edu.startDate || ''} - ${edu.endDate || ''}`);
            }
            doc.moveDown();
          });
        }

        // Skills
        if (resumeData.skills && resumeData.skills.length > 0) {
          doc.fontSize(14).text('Skills', { underline: true });
          const skillsText = resumeData.skills.map(skill => 
            typeof skill === 'string' ? skill : `${skill.name} (${skill.level || ''})`
          ).join(', ');
          doc.fontSize(11).text(skillsText);
          doc.moveDown();
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate DOCX from resume data
   */
  static async generateDOCX(resumeData) {
    try {
      const children = [];

      // Header
      children.push(
        new Paragraph({
          text: resumeData.contactInfo?.name || 'Resume',
          heading: HeadingLevel.TITLE,
          alignment: 'center'
        })
      );

      if (resumeData.contactInfo?.email) {
        children.push(new Paragraph({ text: `Email: ${resumeData.contactInfo.email}` }));
      }
      if (resumeData.contactInfo?.phone) {
        children.push(new Paragraph({ text: `Phone: ${resumeData.contactInfo.phone}` }));
      }
      if (resumeData.contactInfo?.location) {
        children.push(new Paragraph({ text: `Location: ${resumeData.contactInfo.location}` }));
      }

      // Summary
      if (resumeData.summary) {
        children.push(
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({
            text: 'Professional Summary',
            heading: HeadingLevel.HEADING_1
          }),
          new Paragraph({ text: resumeData.summary })
        );
      }

      // Experience
      if (resumeData.experience && resumeData.experience.length > 0) {
        children.push(
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({
            text: 'Work Experience',
            heading: HeadingLevel.HEADING_1
          })
        );

        resumeData.experience.forEach(exp => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${exp.title} at ${exp.company}`, bold: true })
              ]
            })
          );
          
          if (exp.startDate || exp.endDate) {
            children.push(
              new Paragraph({ text: `${exp.startDate || ''} - ${exp.endDate || 'Present'}` })
            );
          }
          
          if (exp.description) {
            children.push(new Paragraph({ text: exp.description }));
          }
          
          if (exp.highlights && exp.highlights.length > 0) {
            exp.highlights.forEach(highlight => {
              children.push(new Paragraph({ text: `• ${highlight}` }));
            });
          }
        });
      }

      // Education, Skills, etc. (similar pattern)
      if (resumeData.education && resumeData.education.length > 0) {
        children.push(
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({
            text: 'Education',
            heading: HeadingLevel.HEADING_1
          })
        );

        resumeData.education.forEach(edu => {
          children.push(
            new Paragraph({ text: `${edu.degree} in ${edu.field || ''}` }),
            new Paragraph({ text: edu.institution })
          );
        });
      }

      if (resumeData.skills && resumeData.skills.length > 0) {
        children.push(
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({
            text: 'Skills',
            heading: HeadingLevel.HEADING_1
          })
        );

        const skillsText = resumeData.skills.map(skill => 
          typeof skill === 'string' ? skill : `${skill.name} (${skill.level || ''})`
        ).join(', ');
        
        children.push(new Paragraph({ text: skillsText }));
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: children
        }]
      });

      return await Packer.toBuffer(doc);
    } catch (error) {
      console.error('Error generating DOCX:', error);
      throw error;
    }
  }

  /**
   * Summarize changes for version tracking
   */
  static summarizeChanges(changes) {
    if (!changes || changes.length === 0) return 'No changes applied';

    const summary = changes.map(change => {
      const action = change.action.charAt(0).toUpperCase() + change.action.slice(1);
      return `${action} ${change.section}${change.target ? ` (${change.target})` : ''}`;
    }).join(', ');

    return `AI Updates: ${summary}`;
  }

/**
 * Optimize resume for ATS with real progress tracking
 */
static async optimizeForATSWithProgress(resumeId, userId, targetJob = null, originalData, progressCallback = null) {
  const startTime = Date.now();
  const stages = [];
  
  const reportProgress = (stage, percentage, message) => {
    stages.push({ stage, percentage, message, timestamp: Date.now() - startTime });
    
    // Send real-time update via SSE
    this.sendProgressUpdate(resumeId, userId, stage, percentage, message);
    
    // Also call the callback if provided
    if (progressCallback) {
      progressCallback(stage, percentage, message);
    }
    
    console.log(`📊 Real Progress: ${percentage}% - ${message}`);
  };

  try {
    console.log(`🤖 AJ: Optimizing resume ${resumeId} for ATS with real progress tracking`);
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      throw new Error('Resume not found');
    }

    // Store previous ATS score
    const previousScore = resume.analysis?.atsCompatibility || 0;

    // Step 1: Generate ATS optimization suggestions (20% progress)
    reportProgress('analyzing', 20, 'Analyzing resume for ATS optimizations...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Realistic delay
    
    const optimizations = await this.generateATSOptimizations(resume.parsedData, targetJob);
    
    // Step 2: Apply optimizations (60% progress) 
    reportProgress('applying', 40, 'Generating enhancement suggestions...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    reportProgress('applying', 60, 'Applying ATS optimizations to resume...');
    const changeRequest = `Apply these ATS optimizations: ${optimizations.map(opt => opt.change).join('. ')}`;
    const result = await this.applyResumeChanges(resumeId, userId, changeRequest);

    // Step 3: Re-analyze resume (80% progress)
    reportProgress('analyzing', 80, 'Re-analyzing optimized resume...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const resumeAnalysisService = require('./resumeAnalysis.service');
    const newAnalysis = await resumeAnalysisService.analyzeResume(resumeId);
    
    // Step 4: Generate comparison data (90% progress)
    reportProgress('comparing', 90, 'Generating before/after comparison...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedResume = await Resume.findById(resumeId);
    updatedResume.analysis = newAnalysis;
    await updatedResume.save();

    // Generate detailed comparison
    const comparison = this.generateBeforeAfterComparison(originalData, {
      parsedData: updatedResume.parsedData,
      analysis: newAnalysis
    });

    const newATSScore = newAnalysis.atsCompatibility || 0;
    const processingTime = Date.now() - startTime;

    // Step 5: Complete (100% progress)
    reportProgress('complete', 100, `Optimization complete! ATS score improved from ${previousScore}% to ${newATSScore}%`);

    console.log(`✅ Real Progress: 100% - ATS optimization complete. Score: ${previousScore}% → ${newATSScore}% (${processingTime}ms)`);

    // Send completion message via SSE
    this.sendProgressUpdate(resumeId, userId, 'complete', 100, 'Optimization completed successfully!');

    return {
      success: true,
      optimizations: optimizations,
      newATSScore: newATSScore,
      previousScore: previousScore,
      updatedResume: updatedResume,
      comparison: comparison,
      processingTime: processingTime,
      stages: stages
    };

  } catch (error) {
    console.error('ATS optimization with real progress error:', error);
    
    // Send error via SSE
    this.sendProgressUpdate(resumeId, userId, 'error', 0, `Optimization failed: ${error.message}`);
    
    throw error;
  }
}

/**
 * Optimize resume for ATS with progress tracking and before/after comparison
 */
static async optimizeForATSWithProgress(resumeId, userId, targetJob = null, originalData) {
  try {
    console.log(`🤖 AJ: Optimizing resume ${resumeId} for ATS with progress tracking`);
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      throw new Error('Resume not found');
    }

    // Store previous ATS score
    const previousScore = resume.analysis?.atsCompatibility || 0;

    // Step 1: Generate ATS optimization suggestions (20% progress)
    console.log(`📊 Progress: 20% - Analyzing resume for ATS optimizations...`);
    const optimizations = await this.generateATSOptimizations(resume.parsedData, targetJob);
    
    // Step 2: Apply optimizations (60% progress)
    console.log(`📊 Progress: 60% - Applying ATS optimizations...`);
    const changeRequest = `Apply these ATS optimizations: ${optimizations.map(opt => opt.change).join('. ')}`;
    const result = await this.applyResumeChanges(resumeId, userId, changeRequest);

    // Step 3: Re-analyze resume (80% progress)
    console.log(`📊 Progress: 80% - Re-analyzing optimized resume...`);
    const resumeAnalysisService = require('./resumeAnalysis.service');
    const newAnalysis = await resumeAnalysisService.analyzeResume(resumeId);
    
    // Step 4: Generate comparison data (90% progress)
    console.log(`📊 Progress: 90% - Generating before/after comparison...`);
    const updatedResume = await Resume.findById(resumeId);
    updatedResume.analysis = newAnalysis;
    await updatedResume.save();

    // Generate detailed comparison
    const comparison = this.generateBeforeAfterComparison(originalData, {
      parsedData: updatedResume.parsedData,
      analysis: newAnalysis
    });

    const newATSScore = newAnalysis.atsCompatibility || 0;

    console.log(`✅ Progress: 100% - ATS optimization complete. Score: ${previousScore}% → ${newATSScore}%`);

    return {
      success: true,
      optimizations: optimizations,
      newATSScore: newATSScore,
      previousScore: previousScore,
      updatedResume: updatedResume,
      comparison: comparison
    };

  } catch (error) {
    console.error('ATS optimization with progress error:', error);
    throw error;
  }
}

/**
 * Send progress update to connected SSE clients
 */
static sendProgressUpdate(resumeId, userId, stage, percentage, message) {
  try {
    if (global.progressClients) {
      const progressData = {
        type: 'progress',
        resumeId,
        stage,
        percentage,
        message,
        timestamp: new Date().toISOString()
      };
      
      // Send to all clients for this user/resume
      global.progressClients.forEach((res, clientId) => {
        if (clientId.includes(`${userId}_${resumeId}`)) {
          try {
            res.write(`data: ${JSON.stringify(progressData)}\n\n`);
            console.log(`📡 Sent progress: ${percentage}% - ${message}`);
          } catch (error) {
            console.error('Error sending SSE progress:', error);
            global.progressClients.delete(clientId);
          }
        }
      });
    } else {
      console.log('⚠️ No progress clients connected for SSE updates');
    }
  } catch (error) {
    console.error('Error in sendProgressUpdate:', error);
  }
}

/**
 * Optimize resume for ATS with real progress tracking
 */
static async optimizeForATSWithProgress(resumeId, userId, targetJob = null, originalData, progressCallback = null) {
  const startTime = Date.now();
  const stages = [];
  
  const reportProgress = (stage, percentage, message) => {
    stages.push({ stage, percentage, message, timestamp: Date.now() - startTime });
    
    // Send real-time update via SSE
    this.sendProgressUpdate(resumeId, userId, stage, percentage, message);
    
    // Also call the callback if provided
    if (progressCallback) {
      progressCallback(stage, percentage, message);
    }
    
    console.log(`📊 Real Progress: ${percentage}% - ${message}`);
  };

  try {
    console.log(`🤖 AJ: Optimizing resume ${resumeId} for ATS with real progress tracking`);
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      throw new Error('Resume not found');
    }

    // Store previous ATS score
    const previousScore = resume.analysis?.atsCompatibility || 0;

    // Step 1: Generate ATS optimization suggestions (20% progress)
    reportProgress('analyzing', 20, 'Analyzing resume for ATS optimizations...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Realistic delay
    
    const optimizations = await this.generateATSOptimizations(resume.parsedData, targetJob);
    
    // Step 2: Apply optimizations (60% progress) 
    reportProgress('applying', 40, 'Generating enhancement suggestions...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    reportProgress('applying', 60, 'Applying ATS optimizations to resume...');
    const changeRequest = `Apply these ATS optimizations: ${optimizations.map(opt => opt.change).join('. ')}`;
    const result = await this.applyResumeChanges(resumeId, userId, changeRequest);

    // Step 3: Re-analyze resume (80% progress)
    reportProgress('analyzing', 80, 'Re-analyzing optimized resume...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const resumeAnalysisService = require('./resumeAnalysis.service');
    const newAnalysis = await resumeAnalysisService.analyzeResume(resumeId);
    
    // Step 4: Generate comparison data (90% progress)
    reportProgress('comparing', 90, 'Generating before/after comparison...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedResume = await Resume.findById(resumeId);
    updatedResume.analysis = newAnalysis;
    await updatedResume.save();

    // Generate detailed comparison
    const comparison = this.generateBeforeAfterComparison(originalData, {
      parsedData: updatedResume.parsedData,
      analysis: newAnalysis
    });

    const newATSScore = newAnalysis.atsCompatibility || 0;
    const processingTime = Date.now() - startTime;

    // Step 5: Complete (100% progress)
    reportProgress('complete', 100, `Optimization complete! ATS score: ${previousScore}% → ${newATSScore}%`);

    console.log(`✅ Real Progress: 100% - ATS optimization complete. Score: ${previousScore}% → ${newATSScore}% (${processingTime}ms)`);

    // Send completion message via SSE
    this.sendProgressUpdate(resumeId, userId, 'complete', 100, 'Optimization completed successfully!');

    return {
      success: true,
      optimizations: optimizations,
      newATSScore: newATSScore,
      previousScore: previousScore,
      updatedResume: updatedResume,
      comparison: comparison,
      processingTime: processingTime,
      stages: stages
    };

  } catch (error) {
    console.error('ATS optimization with real progress error:', error);
    
    // Send error via SSE
    this.sendProgressUpdate(resumeId, userId, 'error', 0, `Optimization failed: ${error.message}`);
    
    throw error;
  }
}

/**
 * Generate detailed before/after comparison
 */
static generateBeforeAfterComparison(originalData, updatedData) {
  const comparison = {
    scores: {
      before: {
        overallScore: originalData.analysis?.overallScore || 0,
        atsCompatibility: originalData.analysis?.atsCompatibility || 0
      },
      after: {
        overallScore: updatedData.analysis?.overallScore || 0,
        atsCompatibility: updatedData.analysis?.atsCompatibility || 0
      }
    },
    changes: [],
    summary: {
      sectionsModified: 0,
      improvementsCount: 0,
      keywordsAdded: 0
    }
  };

  // Compare experience section
  const originalExp = originalData.parsedData?.experience || [];
  const updatedExp = updatedData.parsedData?.experience || [];

  originalExp.forEach((origJob, index) => {
    if (updatedExp[index]) {
      const updatedJob = updatedExp[index];
      
      // Compare highlights
      if (JSON.stringify(origJob.highlights) !== JSON.stringify(updatedJob.highlights)) {
        comparison.changes.push({
          section: 'experience',
          jobTitle: origJob.title || 'Position',
          company: origJob.company || 'Company',
          field: 'highlights',
          before: origJob.highlights || [],
          after: updatedJob.highlights || [],
          changeType: 'enhanced',
          impact: 'Improved quantification and ATS keywords'
        });
        comparison.summary.sectionsModified++;
      }

      // Compare description
      if (origJob.description !== updatedJob.description) {
        comparison.changes.push({
          section: 'experience',
          jobTitle: origJob.title || 'Position',
          company: origJob.company || 'Company',
          field: 'description',
          before: origJob.description || '',
          after: updatedJob.description || '',
          changeType: 'optimized',
          impact: 'Enhanced for ATS compatibility'
        });
      }
    }
  });

  // Compare skills section
  const originalSkills = originalData.parsedData?.skills || [];
  const updatedSkills = updatedData.parsedData?.skills || [];
  
  if (JSON.stringify(originalSkills) !== JSON.stringify(updatedSkills)) {
    comparison.changes.push({
      section: 'skills',
      field: 'skills',
      before: originalSkills,
      after: updatedSkills,
      changeType: 'expanded',
      impact: 'Added relevant keywords and skills'
    });
    comparison.summary.sectionsModified++;
  }

  // Calculate improvement metrics
  comparison.summary.improvementsCount = comparison.changes.length;
  comparison.summary.keywordsAdded = this.countNewKeywords(originalData, updatedData);

  // Generate summary text
  const scoreImprovement = comparison.scores.after.atsCompatibility - comparison.scores.before.atsCompatibility;
  comparison.summaryText = `Enhanced ${comparison.summary.sectionsModified} section${comparison.summary.sectionsModified !== 1 ? 's' : ''} with ${comparison.summary.improvementsCount} improvement${comparison.summary.improvementsCount !== 1 ? 's' : ''}${scoreImprovement > 0 ? `, boosting ATS score by ${scoreImprovement}%` : ''}`;

  return comparison;
}

/**
 * Count new keywords added during optimization
 */
static countNewKeywords(originalData, updatedData) {
  const originalText = JSON.stringify(originalData.parsedData).toLowerCase();
  const updatedText = JSON.stringify(updatedData.parsedData).toLowerCase();
  
  // Simple keyword counting - could be enhanced with more sophisticated analysis
  const commonKeywords = ['api', 'cloud', 'agile', 'leadership', 'development', 'management', 'strategy', 'security'];
  
  let newKeywords = 0;
  commonKeywords.forEach(keyword => {
    const originalCount = (originalText.match(new RegExp(keyword, 'g')) || []).length;
    const updatedCount = (updatedText.match(new RegExp(keyword, 'g')) || []).length;
    if (updatedCount > originalCount) {
      newKeywords += (updatedCount - originalCount);
    }
  });
  
  return newKeywords;
}

/**
 * Generate detailed before/after comparison
 */
static generateBeforeAfterComparison(originalData, updatedData) {
  const comparison = {
    scores: {
      before: {
        overallScore: originalData.analysis?.overallScore || 0,
        atsCompatibility: originalData.analysis?.atsCompatibility || 0
      },
      after: {
        overallScore: updatedData.analysis?.overallScore || 0,
        atsCompatibility: updatedData.analysis?.atsCompatibility || 0
      }
    },
    changes: [],
    summary: {
      sectionsModified: 0,
      improvementsCount: 0,
      keywordsAdded: 0
    }
  };

  // Compare experience section
  const originalExp = originalData.parsedData?.experience || [];
  const updatedExp = updatedData.parsedData?.experience || [];

  originalExp.forEach((origJob, index) => {
    if (updatedExp[index]) {
      const updatedJob = updatedExp[index];
      
      // Compare highlights
      if (JSON.stringify(origJob.highlights) !== JSON.stringify(updatedJob.highlights)) {
        comparison.changes.push({
          section: 'experience',
          jobTitle: origJob.title || 'Position',
          company: origJob.company || 'Company',
          field: 'highlights',
          before: origJob.highlights || [],
          after: updatedJob.highlights || [],
          changeType: 'enhanced',
          impact: 'Improved quantification and ATS keywords'
        });
        comparison.summary.sectionsModified++;
      }

      // Compare description
      if (origJob.description !== updatedJob.description) {
        comparison.changes.push({
          section: 'experience',
          jobTitle: origJob.title || 'Position',
          company: origJob.company || 'Company',
          field: 'description',
          before: origJob.description || '',
          after: updatedJob.description || '',
          changeType: 'optimized',
          impact: 'Enhanced for ATS compatibility'
        });
      }
    }
  });

  // Compare skills section
  const originalSkills = originalData.parsedData?.skills || [];
  const updatedSkills = updatedData.parsedData?.skills || [];
  
  if (JSON.stringify(originalSkills) !== JSON.stringify(updatedSkills)) {
    comparison.changes.push({
      section: 'skills',
      field: 'skills',
      before: originalSkills,
      after: updatedSkills,
      changeType: 'expanded',
      impact: 'Added relevant keywords and skills'
    });
    comparison.summary.sectionsModified++;
  }

  // Calculate improvement metrics
  comparison.summary.improvementsCount = comparison.changes.length;
  comparison.summary.keywordsAdded = this.countNewKeywords(originalData, updatedData);

  // Generate summary text
  const scoreImprovement = comparison.scores.after.atsCompatibility - comparison.scores.before.atsCompatibility;
  comparison.summaryText = `Enhanced ${comparison.summary.sectionsModified} section${comparison.summary.sectionsModified !== 1 ? 's' : ''} with ${comparison.summary.improvementsCount} improvement${comparison.summary.improvementsCount !== 1 ? 's' : ''}${scoreImprovement > 0 ? `, boosting ATS score by ${scoreImprovement}%` : ''}`;

  return comparison;
}

/**
 * Count new keywords added during optimization
 */
static countNewKeywords(originalData, updatedData) {
  const originalText = JSON.stringify(originalData.parsedData).toLowerCase();
  const updatedText = JSON.stringify(updatedData.parsedData).toLowerCase();
  
  // Simple keyword counting - could be enhanced with more sophisticated analysis
  const commonKeywords = ['api', 'cloud', 'agile', 'leadership', 'development', 'management', 'strategy', 'security'];
  
  let newKeywords = 0;
  commonKeywords.forEach(keyword => {
    const originalCount = (originalText.match(new RegExp(keyword, 'g')) || []).length;
    const updatedCount = (updatedText.match(new RegExp(keyword, 'g')) || []).length;
    if (updatedCount > originalCount) {
      newKeywords += (updatedCount - originalCount);
    }
  });
  
  return newKeywords;
}

  /**
   * Generate ATS optimization suggestions
   */
  static async generateATSOptimizations(resumeData, targetJob) {
    try {
      let prompt = `You are an ATS (Applicant Tracking System) optimization expert. Analyze this resume and provide specific optimizations to improve ATS compatibility.

CURRENT RESUME DATA:
${JSON.stringify(resumeData, null, 2)}`;

      if (targetJob) {
        prompt += `\n\nTARGET JOB:
Title: ${targetJob.title}
Company: ${targetJob.company}
Description: ${targetJob.description}`;
      }

      prompt += `

Provide ATS optimizations in this JSON format:
{
  "optimizations": [
    {
      "section": "summary|experience|skills|education|etc",
      "type": "keyword_addition|format_improvement|section_enhancement|ats_formatting",
      "change": "specific change to make",
      "reason": "why this improves ATS score",
      "keywords": ["relevant", "keywords", "to", "add"],
      "priority": "high|medium|low"
    }
  ],
  "atsImprovements": {
    "keywordDensity": "improvements needed",
    "formatting": "formatting changes",
    "structure": "structural improvements",
    "content": "content enhancements"
  }
}

Focus on:
1. Adding relevant keywords naturally
2. Improving section headers for ATS parsing
3. Optimizing bullet point structure
4. Enhancing skill descriptions
5. Ensuring proper formatting for ATS scanning

IMPORTANT: Return ONLY the JSON object, no markdown or additional text.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an ATS optimization expert. Provide specific, actionable suggestions to improve resume ATS compatibility. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const responseContent = response.choices[0].message.content.trim();
      const cleanedResponse = responseContent.replace(/```json\n?|\n?```/g, '').trim();
      const optimizations = JSON.parse(cleanedResponse);

      return optimizations.optimizations || [];

    } catch (error) {
      console.error('Error generating ATS optimizations:', error);
      throw error;
    }
  }
}

module.exports = ResumeEditorService;