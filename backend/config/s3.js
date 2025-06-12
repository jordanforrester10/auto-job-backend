
// config/s3.js
const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Create S3 client with proper configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Export the AWS S3 bucket name as a constant
// Look for either AWS_S3_BUCKET or AWS_BUCKET_NAME to be backward compatible
const S3_BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME;

// If the bucket name is not defined, log a warning
if (!S3_BUCKET) {
  console.warn('WARNING: AWS_BUCKET_NAME environment variable is not defined. File uploads will fail.');
}

module.exports = { s3Client, S3_BUCKET };