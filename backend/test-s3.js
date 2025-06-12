// test-s3.js
const AWS = require('aws-sdk');
const fs = require('fs');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const bucketName = process.env.AWS_BUCKET_NAME;

// Create a test file
const testFilePath = './test-file.txt';
fs.writeFileSync(testFilePath, 'This is a test file for S3 upload');

// Test bucket connection and file upload
async function testS3() {
  try {
    // Check if bucket exists
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log(`✅ Successfully connected to bucket: ${bucketName}`);
    
    // Upload a test file
    const fileContent = fs.readFileSync(testFilePath);
    const params = {
      Bucket: bucketName,
      Key: 'test-file.txt',
      Body: fileContent
    };
    
    const uploadResult = await s3.upload(params).promise();
    console.log(`✅ Successfully uploaded file to: ${uploadResult.Location}`);
    
    // List files in bucket
    const listResult = await s3.listObjectsV2({ Bucket: bucketName }).promise();
    console.log('Files in bucket:');
    listResult.Contents.forEach(item => {
      console.log(` - ${item.Key} (${item.Size} bytes)`);
    });
    
    // Clean up - delete test file
    await s3.deleteObject({ Bucket: bucketName, Key: 'test-file.txt' }).promise();
    console.log('✅ Successfully deleted test file');
    
    console.log('All S3 tests passed! Your configuration is working.');
  } catch (error) {
    console.error('❌ S3 Test Error:', error);
  } finally {
    // Delete local test file
    fs.unlinkSync(testFilePath);
  }
}

testS3();