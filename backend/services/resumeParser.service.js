// services/resumeParser.service.js - ENHANCED BULLET POINT PARSING
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, S3_BUCKET } = require('../config/s3');
const { openai } = require('../config/openai');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

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
 * Process resume text with OpenAI to extract structured data with enhanced bullet point parsing
 * @param {string} text - Extracted text from resume
 * @returns {Object} Structured resume data
 */
async function processWithOpenAI(text) {
  try {
    console.log('Processing resume text with OpenAI with enhanced bullet point parsing...');
    
    // Check if text is too long for the API
    const maxTokens = 8000; // GPT-4 can handle ~8000 tokens
    // Rough estimation: 1 token ~= 4 characters in English
    if (text.length > maxTokens * 4) {
      console.log('Text is too long, truncating...');
      text = text.substring(0, maxTokens * 4);
    }
    
    // Enhanced prompt for better bullet point extraction
    const prompt = `
    Extract structured information from the following resume text with SPECIAL ATTENTION to bullet points and achievements.
    
    **CRITICAL BULLET POINT PARSING INSTRUCTIONS:**
    - Look for lines that start with: -, •, *, >, →, or numbers (1., 2., etc.)
    - These should be extracted as separate items in the "highlights" array
    - DO NOT put bullet point content in the "description" field
    - Each bullet point should be a separate string in the highlights array
    - Remove bullet symbols from the extracted text (remove -, •, *, etc.)
    - If you see dash-separated achievements, extract each as a highlight
    
    **EXAMPLES OF BULLET POINT EXTRACTION:**
    
    Input text: "- Led Solution Architecture teams delivering B2B SaaS implementations
    - Drive delivery excellence for strategic accounts while building scalable processes"
    
    Should extract as:
    "highlights": [
      "Led Solution Architecture teams delivering B2B SaaS implementations",
      "Drive delivery excellence for strategic accounts while building scalable processes"
    ]
    
    Input text: "• Built inbound funnels generating 9,564 MQLs and 2,020 demos
    • Marketed Tovuti as the #1 trending LMS on G2 with 490 competitors"
    
    Should extract as:
    "highlights": [
      "Built inbound funnels generating 9,564 MQLs and 2,020 demos",
      "Marketed Tovuti as the #1 trending LMS on G2 with 490 competitors"
    ]
    
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

    **BULLET POINT EXTRACTION RULES:**
    1. Extract ALL bullet points into "highlights" arrays for experience and education
    2. Use "description" only for paragraph-style summaries without bullet points
    3. Remove bullet symbols (-, •, *, >, etc.) from the extracted text
    4. Each line starting with a bullet symbol should be a separate highlight
    5. Look for quantified achievements and metrics in bullet points
    6. Preserve the complete meaning of each bullet point
    
    **EXPERIENCE SECTION FOCUS:**
    - Extract job responsibilities and achievements as separate highlights
    - Look for metrics, numbers, percentages, and business impact
    - Each achievement or responsibility should be a separate highlight item
    
    Extract all the information accurately from the resume. For dates, use the format YYYY-MM-DD when possible. 
    If information is not available or empty, leave it as an empty string or null. 
    For arrays, if no elements are present, return an empty array [].
    Make sure to include all skills mentioned in each work experience and project.
    For skill levels, use one of: "Beginner", "Intermediate", "Advanced", or "Expert".
    
    IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or additional text.

    Resume Text:
    ${text}
    `;

    // Call OpenAI API with enhanced parameters
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "You are an expert resume parser that excels at extracting bullet points and structured information from resume text. You pay special attention to extracting achievements, responsibilities, and bullet points into proper arrays. You understand that lines starting with -, •, *, >, or numbers are bullet points that should be extracted separately. Return ONLY valid JSON without any markdown formatting or code blocks."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 3000,
    });

    // Get the response content
    const responseContent = response.choices[0].message.content.trim();
    
    // Clean up the response - remove any markdown code block syntax
    let cleanedResponse = responseContent;
    
    // If response starts with ```json or ``` and ends with ```, remove these markers
    if (responseContent.startsWith('```json') || responseContent.startsWith('```')) {
      const startIndex = responseContent.indexOf('{');
      const endIndex = responseContent.lastIndexOf('}');
      
      if (startIndex !== -1 && endIndex !== -1) {
        cleanedResponse = responseContent.substring(startIndex, endIndex + 1);
      }
    }
    
    console.log('Cleaned response for parsing:', cleanedResponse.substring(0, 100) + '...');
    
    // Parse the response
    const parsedData = JSON.parse(cleanedResponse);
    
    // ENHANCED: Apply post-processing to ensure bullet points are properly extracted
    if (parsedData.experience) {
      parsedData.experience = enhanceExperienceData(parsedData.experience);
      console.log('✅ Applied enhanced bullet point extraction to experience data');
    }
    
    if (parsedData.education) {
      parsedData.education = enhanceEducationData(parsedData.education);
      console.log('✅ Applied enhanced bullet point extraction to education data');
    }
    
    console.log('Resume parsing with enhanced bullet point extraction completed successfully');
    
    return parsedData;
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