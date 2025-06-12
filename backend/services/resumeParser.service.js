// services/resumeParser.service.js
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, S3_BUCKET } = require('../config/s3');
const { openai } = require('../config/openai');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

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
 * Process resume text with OpenAI to extract structured data
 * @param {string} text - Extracted text from resume
 * @returns {Object} Structured resume data
 */
async function processWithOpenAI(text) {
  try {
    console.log('Processing resume text with OpenAI...');
    
    // Check if text is too long for the API
    const maxTokens = 8000; // GPT-4 can handle ~8000 tokens
    // Rough estimation: 1 token ~= 4 characters in English
    if (text.length > maxTokens * 4) {
      console.log('Text is too long, truncating...');
      text = text.substring(0, maxTokens * 4);
    }
    
    // Prompt for OpenAI to extract structured data from the resume
    const prompt = `
    Extract structured information from the following resume text. 
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

    Extract all the information accurately from the resume. For dates, use the format YYYY-MM-DD when possible. 
    If information is not available or empty, leave it as an empty string or null. 
    For arrays, if no elements are present, return an empty array [].
    Make sure to include all skills mentioned in each work experience and project.
    For skill levels, use one of: "Beginner", "Intermediate", "Advanced", or "Expert".
    
    IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or additional text.

    Resume Text:
    ${text}
    `;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "You are an expert resume parser that extracts structured information from resume text. Be precise and thorough. Return ONLY valid JSON without any markdown formatting or code blocks."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
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
    console.log('Resume parsing with OpenAI completed successfully');
    
    return parsedData;
  } catch (error) {
    console.error('Error processing with OpenAI:', error);
    
    // Fallback to a simplified parsed data structure
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