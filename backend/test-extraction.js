// test-extraction.js - Quick test script for the new extraction methods
const jobBoardAPIsService = require('./services/jobBoardAPIs.service');
const headlessScraperService = require('./services/headlessScraper.service');

// Test configuration
const testCompanies = [
  {
    name: 'Lever Test Company',
    careerUrl: 'https://jobs.lever.co/example',
    industry: 'Technology'
  },
  {
    name: 'Simple Tech Company',
    careerUrl: 'https://example-tech.com/careers',
    industry: 'Technology'
  }
];

const testCareerProfile = {
  jobTitles: ['Software Engineer', 'Frontend Developer', 'Product Manager'],
  industries: ['Technology', 'Software'],
  experienceLevel: 'mid',
  keySkills: ['JavaScript', 'React', 'Node.js']
};

async function testExtractionMethods() {
  console.log('🧪 Testing extraction methods...\n');
  
  for (const company of testCompanies) {
    console.log(`\n🏢 Testing ${company.name}...`);
    console.log(`URL: ${company.careerUrl}`);
    
    // Test 1: ATS Platform Detection
    console.log('\n1️⃣ Testing ATS Platform Detection...');
    try {
      const atsInfo = await jobBoardAPIsService.detectATSPlatform(company.careerUrl);
      console.log('ATS Detection Result:', {
        platform: atsInfo.platform,
        hasAPI: atsInfo.hasAPI,
        slug: atsInfo.slug,
        apiUrl: atsInfo.apiUrl ? atsInfo.apiUrl.substring(0, 100) + '...' : null
      });
    } catch (error) {
      console.error('ATS Detection Error:', error.message);
    }
    
    // Test 2: Free APIs
    console.log('\n2️⃣ Testing Free APIs...');
    try {
      const apiResult = await jobBoardAPIsService.tryFreeAPIs(company, testCareerProfile);
      console.log('API Result:', {
        success: apiResult.success,
        method: apiResult.method,
        platform: apiResult.platform,
        jobsFound: apiResult.jobs?.length || 0
      });
      
      if (apiResult.jobs && apiResult.jobs.length > 0) {
        console.log('Sample job:', {
          title: apiResult.jobs[0].title,
          company: apiResult.jobs[0].company,
          location: apiResult.jobs[0].location
        });
      }
    } catch (error) {
      console.error('API Test Error:', error.message);
    }
    
    // Test 3: Pattern Scraping (only test for non-real URLs to avoid hitting real sites)
    if (company.careerUrl.includes('example')) {
      console.log('\n3️⃣ Testing Pattern Scraping...');
      try {
        const patternResult = await headlessScraperService.tryPatternScraping(company, testCareerProfile);
        console.log('Pattern Scraping Result:', {
          success: patternResult.success,
          method: patternResult.method,
          jobsFound: patternResult.jobs?.length || 0,
          error: patternResult.error
        });
      } catch (error) {
        console.error('Pattern Scraping Error:', error.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
  }
  
  // Test 4: Job relevance filtering
  console.log('\n4️⃣ Testing Job Relevance Filtering...');
  
  const testJobs = [
    { title: 'Senior Software Engineer', company: 'TestCorp' },
    { title: 'Frontend Developer', company: 'TestCorp' },
    { title: 'Product Manager', company: 'TestCorp' },
    { title: 'Marketing Specialist', company: 'TestCorp' },
    { title: 'Data Scientist', company: 'TestCorp' },
    { title: 'Junior Developer', company: 'TestCorp' }
  ];
  
  console.log('Test jobs:', testJobs.map(j => j.title));
  console.log('Career profile targets:', testCareerProfile.jobTitles);
  
  // Import the filtering function (you'll need to expose this from the service)
  // This is just for testing - in real implementation it's internal
  
  await headlessScraperService.cleanup();
  console.log('\n✅ Testing completed!');
}

// Helper function to test just ATS detection without hitting APIs
async function quickATSTest() {
  console.log('🔍 Quick ATS Detection Test...\n');
  
  const testUrls = [
    'https://boards.greenhouse.io/company',
    'https://jobs.lever.co/company',
    'https://company.myworkdayjobs.com/careers',
    'https://company.bamboohr.com/jobs/',
    'https://regular-company.com/careers'
  ];
  
  for (const url of testUrls) {
    console.log(`Testing: ${url}`);
    try {
      const result = await jobBoardAPIsService.detectATSPlatform(url);
      console.log(`  Platform: ${result.platform}, Has API: ${result.hasAPI}, Slug: ${result.slug}\n`);
    } catch (error) {
      console.log(`  Error: ${error.message}\n`);
    }
  }
}

// Run the appropriate test
if (process.argv.includes('--quick')) {
  quickATSTest().catch(console.error);
} else if (process.argv.includes('--ats-only')) {
  quickATSTest().catch(console.error);
} else {
  testExtractionMethods().catch(console.error);
}

module.exports = { testExtractionMethods, quickATSTest };