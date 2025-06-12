// config/openai.js
const OpenAI = require('openai');
require('dotenv').config();

// Initialize the OpenAI client with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Log a message to help with debugging
if (!process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY environment variable is not defined. AI features will not work.');
} else {
  console.log('OpenAI configuration loaded successfully');
}

module.exports = { openai };