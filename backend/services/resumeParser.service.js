// services/resumeParser.service.js - ENHANCED WITH SMART DATE PARSING AND ROBUST JSON HANDLING
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, S3_BUCKET } = require('../config/s3');
const { openai } = require('../config/openai');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Smart date parser that handles various date formats and special cases
 * @param {string|Date} dateValue - Date value to parse
 * @returns {Date|string} Parsed date or original string for special cases
 */
function smartDateParser(dateValue) {
  if (!dateValue) return null;
  
  // If already a Date object, return as-is
  if (dateValue instanceof Date) return dateValue;
  
  // If not a string, try to convert
  if (typeof dateValue !== 'string') {
    return dateValue;
  }
  
  const dateStr = dateValue.trim().toLowerCase();
  
  // Handle special current job/education indicators
  const currentIndicators = ['present', 'current', 'ongoing', 'now', 'today'];
  if (currentIndicators.includes(dateStr)) {
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1); // Capitalize first letter
  }
  
  // Handle "never expires" indicators for certifications
  const neverExpires = ['never', 'permanent', 'lifetime', 'no expiration'];
  if (neverExpires.includes(dateStr)) {
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }
  
  // Try to parse as a regular date
  const parsedDate = new Date(dateValue);
  
  // Check if the parsed date is valid
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  
  // Handle common date formats manually
  const datePatterns = [
    // MM/YYYY, MM-YYYY, MM.YYYY
    /^(\d{1,2})[\/\-\.](\d{4})$/,
    // YYYY-MM, YYYY/MM, YYYY.MM
    /^(\d{4})[\/\-\.](\d{1,2})$/,
    // Just year: 2024, 2023, etc.
    /^(\d{4})$/,
    // Month Year: "January 2024", "Jan 2024"
    /^(\w+)\s+(\d{4})$/
  ];
  
  for (const pattern of datePatterns) {
    const match = dateValue.match(pattern);
    if (match) {
      try {
        let year, month;
        
        if (pattern.source.includes('(\\d{4})$')) { // Just year
          year = parseInt(match[1]);
          return new Date(year, 0, 1); // January 1st of that year
        } else if (pattern.source.startsWith('^(\\d{1,2})')) { // MM/YYYY format
          month = parseInt(match[1]) - 1; // Month is 0-indexed
          year = parseInt(match[2]);
          return new Date(year, month, 1);
        } else if (pattern.source.startsWith('^(\\d{4})')) { // YYYY-MM format
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          return new Date(year, month, 1);
        } else if (pattern.source.includes('(\\w+)\\s+(\\d{4})')) { // Month Year format
          const monthName = match[1].toLowerCase();
          year = parseInt(match[2]);
          
          const months = {
            'january': 0, 'jan': 0,
            'february': 1, 'feb': 1,
            'march': 2, 'mar': 2,
            'april': 3, 'apr': 3,
            'may': 4,
            'june': 5, 'jun': 5,
            'july': 6, 'jul': 6,
            'august': 7, 'aug': 7,
            'september': 8, 'sep': 8, 'sept': 8,
            'october': 9, 'oct': 9,
            'november': 10, 'nov': 10,
            'december': 11, 'dec': 11
          };
          
          month = months[monthName];
          if (month !== undefined) {
            return new Date(year, month, 1);
          }
        }
      } catch (error) {
        console.log(`Date parsing error for "${dateValue}":`, error.message);
      }
    }
  }
  
  // If all parsing attempts fail, return the original string
  console.log(`Unable to parse date: "${dateValue}", keeping as string`);
  return dateValue;
}

/**
 * Process parsed data to ensure date fields are properly formatted
 * @param {Object} parsedData - Raw parsed data from OpenAI
 * @returns {Object} Processed data with smart date handling
 */
function processDateFields(parsedData) {
  if (!parsedData || typeof parsedData !== 'object') {
    return parsedData;
  }
  
  console.log('🔧 Processing date fields with smart date parser...');
  
  // Process experience dates
  if (Array.isArray(parsedData.experience)) {
    parsedData.experience = parsedData.experience.map(exp => {
      if (exp.startDate) {
        exp.startDate = smartDateParser(exp.startDate);
      }
      if (exp.endDate) {
        exp.endDate = smartDateParser(exp.endDate);
      }
      return exp;
    });
    console.log(`✅ Processed ${parsedData.experience.length} experience entries`);
  }
  
  // Process education dates
  if (Array.isArray(parsedData.education)) {
    parsedData.education = parsedData.education.map(edu => {
      if (edu.startDate) {
        edu.startDate = smartDateParser(edu.startDate);
      }
      if (edu.endDate) {
        edu.endDate = smartDateParser(edu.endDate);
      }
      return edu;
    });
    console.log(`✅ Processed ${parsedData.education.length} education entries`);
  }
  
  // Process certification dates
  if (Array.isArray(parsedData.certifications)) {
    parsedData.certifications = parsedData.certifications.map(cert => {
      if (cert.dateObtained) {
        cert.dateObtained = smartDateParser(cert.dateObtained);
      }
      if (cert.validUntil) {
        cert.validUntil = smartDateParser(cert.validUntil);
      }
      return cert;
    });
    console.log(`✅ Processed ${parsedData.certifications.length} certification entries`);
  }
  
  // Process project dates
  if (Array.isArray(parsedData.projects)) {
    parsedData.projects = parsedData.projects.map(project => {
      if (project.startDate) {
        project.startDate = smartDateParser(project.startDate);
      }
      if (project.endDate) {
        project.endDate = smartDateParser(project.endDate);
      }
      return project;
    });
    console.log(`✅ Processed ${parsedData.projects.length} project entries`);
  }
  
  return parsedData;
}

/**
 * Enhanced post-processing function to extract bullet points from text
 * @param {string} text - Text content that may contain bullet points
 * @returns {object} Object with cleaned description and extracted highlights
 */
function extractBulletPoints(text) {
  if (!text || typeof text !== 'string') {
    return { description: '', highlights: [] };
  }

  // Split text into lines
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  const highlights = [];
  const descriptionLines = [];
  
  for (const line of lines) {
    // Check if line starts with common bullet point indicators
    const bulletPatterns = [
      /^[-−–—]\s+(.+)$/,           // Dash variations
      /^[•·▪▫◦‣⁃]\s+(.+)$/,        // Bullet symbols
      /^\*\s+(.+)$/,               // Asterisk
      /^>\s+(.+)$/,                // Greater than
      /^→\s+(.+)$/,                // Arrow
      /^\d+\.\s+(.+)$/,            // Numbered list
    ];
    
    let isBulletPoint = false;
    
    for (const pattern of bulletPatterns) {
      const match = line.match(pattern);
      if (match) {
        highlights.push(match[1].trim());
        isBulletPoint = true;
        break;
      }
    }
    
    // If not a bullet point and not empty, add to description
    if (!isBulletPoint && line.length > 10) { // Minimum length for meaningful content
      descriptionLines.push(line);
    }
  }
  
  return {
    description: descriptionLines.join(' '),
    highlights: highlights
  };
}

/**
 * Enhanced post-processing for experience array
 * @param {Array} experiences - Array of experience objects
 * @returns {Array} Enhanced experience array with proper bullet points
 */
function enhanceExperienceData(experiences) {
  if (!Array.isArray(experiences)) return experiences;
  
  return experiences.map(exp => {
    // If highlights array is empty or missing, try to extract from description
    if (!exp.highlights || exp.highlights.length === 0) {
      const { description, highlights } = extractBulletPoints(exp.description);
      
      return {
        ...exp,
        description: description || exp.description,
        highlights: highlights.length > 0 ? highlights : (exp.highlights || [])
      };
    }
    
    return exp;
  });
}

/**
 * Enhanced post-processing for education array
 * @param {Array} education - Array of education objects
 * @returns {Array} Enhanced education array with proper highlights
 */
function enhanceEducationData(education) {
  if (!Array.isArray(education)) return education;
  
  return education.map(edu => {
    // Extract highlights from description if highlights array is empty
    if (!edu.highlights || edu.highlights.length === 0) {
      const { description, highlights } = extractBulletPoints(edu.description || '');
      
      return {
        ...edu,
        description: description || edu.description || '',
        highlights: highlights.length > 0 ? highlights : (edu.highlights || [])
      };
    }
    
    return edu;
  });
}

/**
 * NEW: Robust JSON parser with multiple fallback strategies
 * @param {string} responseContent - Raw response from OpenAI
 * @returns {Object} Parsed JSON data or fallback object
 */
function robustJSONParse(responseContent) {
  console.log('🔧 Attempting robust JSON parsing...');
  
  // Strategy 1: Clean and parse the full response
  try {
    let cleanedResponse = responseContent.trim();
    
    // Remove markdown code block syntax
    if (cleanedResponse.startsWith('```json') || cleanedResponse.startsWith('```')) {
      const startIndex = cleanedResponse.indexOf('{');
      const endIndex = cleanedResponse.lastIndexOf('}');
      
      if (startIndex !== -1 && endIndex !== -1) {
        cleanedResponse = cleanedResponse.substring(startIndex, endIndex + 1);
      }
    }
    
    console.log('✅ Strategy 1: Attempting to parse cleaned response...');
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.log('❌ Strategy 1 failed:', error.message);
  }
  
  // Strategy 2: Find and extract the JSON object boundaries
  try {
    const startIndex = responseContent.indexOf('{');
    const lastBraceIndex = responseContent.lastIndexOf('}');
    
    if (startIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > startIndex) {
      const jsonString = responseContent.substring(startIndex, lastBraceIndex + 1);
      console.log('✅ Strategy 2: Attempting to parse extracted JSON boundaries...');
      return JSON.parse(jsonString);
    }
  } catch (error) {
    console.log('❌ Strategy 2 failed:', error.message);
  }
  
  // Strategy 3: Progressive truncation to find valid JSON
  try {
    const startIndex = responseContent.indexOf('{');
    if (startIndex !== -1) {
      let jsonContent = responseContent.substring(startIndex);
      
      // Try progressively shorter strings from the end
      for (let i = jsonContent.length; i > jsonContent.length * 0.5; i -= 100) {
        const testString = jsonContent.substring(0, i);
        const lastBrace = testString.lastIndexOf('}');
        
        if (lastBrace !== -1) {
          try {
            const candidate = testString.substring(0, lastBrace + 1);
            console.log(`✅ Strategy 3: Attempting truncated parse at position ${lastBrace}...`);
            return JSON.parse(candidate);
          } catch (error) {
            // Continue to next iteration
            continue;
          }
        }
      }
    }
  } catch (error) {
    console.log('❌ Strategy 3 failed:', error.message);
  }
  
  // Strategy 4: Manual field extraction as last resort
  try {
    console.log('✅ Strategy 4: Attempting manual field extraction...');
    
    const fallbackData = {
      contactInfo: { name: '', email: '', phone: '', location: '', websites: [] },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
      projects: []
    };
    
    // Try to extract contact name
    const nameMatch = responseContent.match(/"name":\s*"([^"]+)"/);
    if (nameMatch) {
      fallbackData.contactInfo.name = nameMatch[1];
    }
    
    // Try to extract email
    const emailMatch = responseContent.match(/"email":\s*"([^"]+)"/);
    if (emailMatch) {
      fallbackData.contactInfo.email = emailMatch[1];
    }
    
    // Try to extract summary
    const summaryMatch = responseContent.match(/"summary":\s*"([^"]+)"/);
    if (summaryMatch) {
      fallbackData.summary = summaryMatch[1];
    }
    
    console.log('✅ Manual extraction completed with partial data');
    return fallbackData;
  } catch (error) {
    console.log('❌ Strategy 4 failed:', error.message);
  }
  
  // Final fallback
  console.log('⚠️ All parsing strategies failed, returning basic fallback');
  return {
    contactInfo: {
      name: 'Parsing Error - Please Try Again',
      email: '',
      phone: '',
      location: '',
      websites: []
    },
    summary: 'Unable to parse resume due to formatting issues. Please try uploading again or contact support if the problem persists.',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    projects: []
  };
}

/**
 * Parse a resume file and extract structured data using OpenAI
 * @param {string} fileUrl - S3 key for the resume file
 * @param {string} fileType - Type of file (PDF, DOCX, DOC)
 * @returns {Object} Parsed resume data
 */
exports.parseResume = async (fileUrl, fileType) => {
  try {
    console.log(`Parsing resume file: ${fileUrl}, type: ${fileType}`);
    
    // Debug check for S3 bucket configuration
    console.log('S3 bucket config check:', { bucket: S3_BUCKET });
    
    if (!S3_BUCKET) {
      throw new Error('S3 bucket not configured. Please set AWS_BUCKET_NAME environment variable.');
    }
    
    // Get file from S3
    const getObjectParams = {
      Bucket: S3_BUCKET,
      Key: fileUrl
    };
    
    console.log('Getting file from S3:', { bucket: S3_BUCKET, key: fileUrl });
    
    const { Body } = await s3Client.send(new GetObjectCommand(getObjectParams));
    
    // Convert readable stream to buffer
    const chunks = [];
    for await (const chunk of Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    console.log(`File retrieved from S3, size: ${buffer.length} bytes`);
    
    // Extract text based on file type
    let text = '';
    if (fileType === 'PDF') {
      console.log('Parsing PDF file...');
      const pdfData = await pdf(buffer);
      text = pdfData.text;
    } else if (fileType === 'DOCX') {
      console.log('Parsing DOCX file...');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (fileType === 'DOC') {
      // For DOC files, we would need a different parser
      // This is a placeholder for now
      console.log('DOC parsing not fully implemented');
      text = 'DOC parsing not fully implemented';
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    console.log(`Text extracted, length: ${text.length} characters`);
    
    // Process the text using OpenAI to extract structured information
    return await processWithOpenAI(text);
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
};

/**
 * Process resume text with OpenAI to extract structured data with enhanced bullet point parsing and smart date handling
 * @param {string} text - Extracted text from resume
 * @returns {Object} Structured resume data
 */
async function processWithOpenAI(text) {
  try {
    console.log('Processing resume text with OpenAI with enhanced bullet point parsing and smart date handling...');
    
    // Check if text is too long for the API - INCREASED LIMITS
    const maxTokens = 12000; // Increased from 8000 to handle larger resumes
    // Rough estimation: 1 token ~= 4 characters in English
    if (text.length > maxTokens * 4) {
      console.log(`Text is too long (${text.length} chars), truncating to ${maxTokens * 4} characters...`);
      text = text.substring(0, maxTokens * 4);
    }
    
    // Enhanced prompt for better bullet point extraction and date handling
    const prompt = `
    Extract structured information from the following resume text with SPECIAL ATTENTION to bullet points, achievements, and date handling.
    
    **CRITICAL DATE HANDLING INSTRUCTIONS:**
    - For current positions/education, if you see "Present", "Current", "Ongoing", or "Now", keep these as strings
    - For historical dates, convert to YYYY-MM-DD format when possible
    - For partial dates like "2024" or "Jan 2024", use appropriate date format
    - Examples:
      * "2024 to Present" → startDate: "2024-01-01", endDate: "Present"
      * "January 2023 - March 2024" → startDate: "2023-01-01", endDate: "2024-03-01"
      * "2020 - 2022" → startDate: "2020-01-01", endDate: "2022-12-31"
    
    **CRITICAL BULLET POINT PARSING INSTRUCTIONS:**
    - Look for lines that start with: -, •, *, >, →, or numbers (1., 2., etc.)
    - These should be extracted as separate items in the "highlights" array
    - DO NOT put bullet point content in the "description" field
    - Each bullet point should be a separate string in the highlights array
    - Remove bullet symbols from the extracted text (remove -, •, *, etc.)
    - If you see dash-separated achievements, extract each as a highlight
    
    **IMPORTANT: Handle special characters carefully:**
    - Escape quotes properly in JSON strings
    - Handle URLs and email addresses carefully
    - If a string contains quotes, use proper JSON escaping with backslashes
    
    Provide the information in JSON format with the following structure:
    {
      "contactInfo": {
        "name": "",
        "email": "",
        "phone": "",
        "location": "",
        "websites": []
      },
      "summary": "",
      "experience": [
        {
          "company": "",
          "title": "",
          "location": "",
          "startDate": "",
          "endDate": "",
          "description": "",
          "highlights": [],
          "skills": []
        }
      ],
      "education": [
        {
          "institution": "",
          "degree": "",
          "field": "",
          "startDate": "",
          "endDate": "",
          "gpa": null,
          "highlights": []
        }
      ],
      "skills": [
        {
          "name": "",
          "level": "",
          "yearsOfExperience": null
        }
      ],
      "certifications": [
        {
          "name": "",
          "issuer": "",
          "dateObtained": "",
          "validUntil": ""
        }
      ],
      "languages": [
        {
          "language": "",
          "proficiency": ""
        }
      ],
      "projects": [
        {
          "name": "",
          "description": "",
          "url": "",
          "startDate": "",
          "endDate": "",
          "skills": []
        }
      ]
    }

    IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or additional text.
    Make sure all strings are properly escaped for JSON parsing.

    Resume Text:
    ${text}
    `;

    // Call OpenAI API with enhanced parameters
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "You are an expert resume parser that excels at extracting bullet points and structured information from resume text. You pay special attention to extracting achievements, responsibilities, and bullet points into proper arrays. You understand that lines starting with -, •, *, >, or numbers are bullet points that should be extracted separately. You also handle dates intelligently, keeping 'Present' as a string for current positions and converting historical dates to proper formats. Return ONLY valid JSON without any markdown formatting or code blocks. Always properly escape quotes and special characters in JSON strings."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000, // Increased token limit
    });

    // Get the response content
    const responseContent = response.choices[0].message.content.trim();
    
    console.log('Raw OpenAI response length:', responseContent.length);
    console.log('Response preview:', responseContent.substring(0, 200) + '...');
    
    // Use robust JSON parsing with multiple fallback strategies
    const parsedData = robustJSONParse(responseContent);
    
    // 🔧 Apply smart date processing to handle "Present" and other date formats
    const processedData = processDateFields(parsedData);
    
    // ENHANCED: Apply post-processing to ensure bullet points are properly extracted
    if (processedData.experience) {
      processedData.experience = enhanceExperienceData(processedData.experience);
      console.log('✅ Applied enhanced bullet point extraction to experience data');
    }
    
    if (processedData.education) {
      processedData.education = enhanceEducationData(processedData.education);
      console.log('✅ Applied enhanced bullet point extraction to education data');
    }
    
    console.log('Resume parsing with enhanced bullet point extraction and smart date handling completed successfully');
    
    return processedData;
  } catch (error) {
    console.error('Error processing with OpenAI:', error);
    
    // Enhanced fallback to a simplified parsed data structure
    return {
      contactInfo: {
        name: 'Parsing Error',
        email: '',
        phone: '',
        location: '',
        websites: []
      },
      summary: 'Error parsing resume. Please try again or contact support.',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
      projects: []
    };
  }
}