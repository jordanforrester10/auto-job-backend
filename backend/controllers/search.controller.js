// backend/controllers/search.controller.js - FIXED VERSION
const User = require('../models/mongodb/user.model');
const Resume = require('../models/mongodb/resume.model');
const Job = require('../models/mongodb/job.model');
const db = require('../config/postgresql');

/**
 * Global search controller that searches across multiple data types
 */
class SearchController {
  /**
   * Unified search across jobs, resumes, and recruiters
   */
  static async globalSearch(req, res) {
    try {
      const { 
        query, 
        category = 'all', 
        limit = 20, 
        includeContent = false 
      } = req.query;
      
      const userId = req.user._id;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters long'
        });
      }

      console.log(`🔍 Global search: "${query}" for user ${userId}, category: ${category}`);

      const searchResults = {
        query: query.trim(),
        category,
        results: {
          jobs: [],
          resumes: [],
          recruiters: [],
          totalCount: 0
        },
        suggestions: [],
        recentSearches: []
      };

      // Parallel search execution
      const searchPromises = [];

      if (category === 'all' || category === 'jobs') {
        searchPromises.push(SearchController.searchJobs(userId, query, limit));
      }

      if (category === 'all' || category === 'resumes') {
        searchPromises.push(SearchController.searchResumes(userId, query, limit));
      }

      if (category === 'all' || category === 'recruiters') {
        searchPromises.push(SearchController.searchRecruiters(userId, query, limit));
      }

      // Execute all searches in parallel
      const results = await Promise.allSettled(searchPromises);

      // Process results
      let resultIndex = 0;
      if (category === 'all' || category === 'jobs') {
        const jobResults = results[resultIndex];
        if (jobResults.status === 'fulfilled') {
          searchResults.results.jobs = jobResults.value || [];
        } else {
          console.error('Job search failed:', jobResults.reason);
        }
        resultIndex++;
      }

      if (category === 'all' || category === 'resumes') {
        const resumeResults = results[resultIndex];
        if (resumeResults.status === 'fulfilled') {
          searchResults.results.resumes = resumeResults.value || [];
        } else {
          console.error('Resume search failed:', resumeResults.reason);
        }
        resultIndex++;
      }

      if (category === 'all' || category === 'recruiters') {
        const recruiterResults = results[resultIndex];
        if (recruiterResults.status === 'fulfilled') {
          searchResults.results.recruiters = recruiterResults.value || [];
        } else {
          console.error('Recruiter search failed:', recruiterResults.reason);
        }
        resultIndex++;
      }

      // Calculate total count
      searchResults.results.totalCount = 
        searchResults.results.jobs.length +
        searchResults.results.resumes.length +
        searchResults.results.recruiters.length;

      // Generate suggestions if no results found
      if (searchResults.results.totalCount === 0) {
        searchResults.suggestions = await SearchController.generateSuggestions(query);
      }

      // Get recent searches
      searchResults.recentSearches = await SearchController.getRecentSearches(userId);

      // Save this search
      await SearchController.saveSearch(userId, query, category, searchResults.results.totalCount);

      console.log(`✅ Search completed: ${searchResults.results.totalCount} total results`);

      res.json({
        success: true,
        data: searchResults
      });

    } catch (error) {
      console.error('Global search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        details: error.message
      });
    }
  }

  /**
   * Search jobs
   */
  static async searchJobs(userId, query, limit = 10) {
    try {
      const searchRegex = new RegExp(query, 'i');
      
      const jobs = await Job.find({
        userId,
        $or: [
          { title: searchRegex },
          { company: searchRegex },
          { description: searchRegex },
          { 'parsedData.keySkills.name': searchRegex },
          { 'parsedData.requirements': searchRegex },
          { 'parsedData.responsibilities': searchRegex }
        ]
      })
      .select('title company description parsedData.keySkills matchAnalysis applicationStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

      return jobs.map(job => ({
        id: job._id,
        type: 'job',
        title: job.title,
        subtitle: job.company,
        description: job.description ? job.description.substring(0, 150) + '...' : '',
        matchScore: job.matchAnalysis?.overallScore || null,
        status: job.applicationStatus || 'not_applied',
        skills: job.parsedData?.keySkills?.slice(0, 5) || [],
        createdAt: job.createdAt,
        url: `/jobs/${job._id}`
      }));

    } catch (error) {
      console.error('Job search error:', error);
      return [];
    }
  }

  /**
   * Search resumes
   */
  static async searchResumes(userId, query, limit = 10) {
    try {
      const searchRegex = new RegExp(query, 'i');
      
      const resumes = await Resume.find({
        userId,
        $or: [
          { name: searchRegex },
          { 'parsedData.summary': searchRegex },
          { 'parsedData.experience.title': searchRegex },
          { 'parsedData.experience.company': searchRegex },
          { 'parsedData.skills.name': searchRegex },
          { 'parsedData.education.institution': searchRegex },
          { 'parsedData.education.degree': searchRegex }
        ]
      })
      .select('name parsedData.summary parsedData.skills analysis isActive createdAt')
      .sort({ isActive: -1, createdAt: -1 })
      .limit(limit)
      .lean();

      return resumes.map(resume => ({
        id: resume._id,
        type: 'resume',
        title: resume.name,
        subtitle: resume.parsedData?.summary ? 
          resume.parsedData.summary.substring(0, 100) + '...' : 
          'Professional Resume',
        description: `${resume.parsedData?.skills?.length || 0} skills listed`,
        score: resume.analysis?.overallScore || null,
        isActive: resume.isActive,
        skills: resume.parsedData?.skills?.slice(0, 5) || [],
        createdAt: resume.createdAt,
        url: `/resumes/${resume._id}`
      }));

    } catch (error) {
      console.error('Resume search error:', error);
      return [];
    }
  }

  /**
   * Search recruiters
   */
  static async searchRecruiters(userId, query, limit = 10) {
    try {
      // Simplified search - just search by name and title for now
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const recruitersQuery = `
        SELECT 
          r.id,
          r.first_name,
          r.last_name,
          r.title,
          r.email,
          r.linkedin_url,
          r.experience_years,
          r.last_active_date,
          companies.name as company_name,
          industries.name as industry_name,
          locations.city,
          locations.state,
          locations.country
        FROM recruiters r
        LEFT JOIN companies ON r.current_company_id = companies.id
        LEFT JOIN industries ON r.industry_id = industries.id
        LEFT JOIN locations ON r.location_id = locations.id
        WHERE r.is_active = true 
        AND (
          LOWER(r.first_name) LIKE $1 OR 
          LOWER(r.last_name) LIKE $1 OR 
          LOWER(r.title) LIKE $1 OR 
          LOWER(companies.name) LIKE $1
        )
        ORDER BY r.last_active_date DESC NULLS LAST
        LIMIT $2
      `;

      const result = await db.query(recruitersQuery, [searchTerm, limit]);

      return result.rows.map(recruiter => ({
        id: recruiter.id,
        type: 'recruiter',
        title: `${recruiter.first_name} ${recruiter.last_name}`,
        subtitle: recruiter.title || 'Recruiter',
        description: `${recruiter.company_name || 'Unknown Company'}${recruiter.industry_name ? ` • ${recruiter.industry_name}` : ''}`,
        location: recruiter.city ? 
          `${recruiter.city}${recruiter.state ? `, ${recruiter.state}` : ''}` : 
          null,
        experience: recruiter.experience_years,
        hasContact: !!(recruiter.email || recruiter.linkedin_url),
        hasBeenContacted: false, // Simplified for now
        lastActiveDate: recruiter.last_active_date,
        url: `/recruiters/${recruiter.id}`
      }));

    } catch (error) {
      console.error('Recruiter search error:', error);
      return [];
    }
  }

  /**
   * Generate search suggestions
   */
  static async generateSuggestions(query) {
    try {
      const suggestions = [];
      
      // Common job titles
      const jobTitles = [
        'Software Engineer', 'Product Manager', 'Data Scientist', 
        'Marketing Manager', 'Sales Representative', 'Business Analyst'
      ];
      
      // Common skills
      const skills = [
        'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 
        'Machine Learning', 'Project Management', 'Marketing'
      ];
      
      // Common companies (you could populate this from your database)
      const companies = [
        'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix'
      ];

      // Find matching suggestions
      const queryLower = query.toLowerCase();
      
      jobTitles.forEach(title => {
        if (title.toLowerCase().includes(queryLower)) {
          suggestions.push({ text: title, type: 'job_title' });
        }
      });
      
      skills.forEach(skill => {
        if (skill.toLowerCase().includes(queryLower)) {
          suggestions.push({ text: skill, type: 'skill' });
        }
      });
      
      companies.forEach(company => {
        if (company.toLowerCase().includes(queryLower)) {
          suggestions.push({ text: company, type: 'company' });
        }
      });

      return suggestions.slice(0, 5);

    } catch (error) {
      console.error('Generate suggestions error:', error);
      return [];
    }
  }

  /**
   * Get recent searches for user
   */
  static async getRecentSearches(userId, limit = 5) {
    try {
      // You could implement a search history collection in MongoDB
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Get recent searches error:', error);
      return [];
    }
  }

  /**
   * Save search for analytics and recent searches
   */
  static async saveSearch(userId, query, category, resultCount) {
    try {
      // You could implement search analytics here
      console.log(`📊 Search saved: ${query} (${resultCount} results)`);
    } catch (error) {
      console.error('Save search error:', error);
    }
  }

  /**
   * Get search suggestions as user types
   */
  static async getSearchSuggestions(req, res) {
    try {
      const { query, limit = 5 } = req.query;
      
      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: { suggestions: [] }
        });
      }

      const suggestions = await SearchController.generateSuggestions(query);
      
      res.json({
        success: true,
        data: { suggestions: suggestions.slice(0, limit) }
      });

    } catch (error) {
      console.error('Get search suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suggestions'
      });
    }
  }

  /**
   * Get popular searches
   */
  static async getPopularSearches(req, res) {
    try {
      // Return common search terms
      const popularSearches = [
        'Software Engineer',
        'Product Manager',
        'JavaScript',
        'Remote Jobs',
        'Data Science',
        'Marketing',
        'Google',
        'Startup'
      ];

      res.json({
        success: true,
        data: { searches: popularSearches }
      });

    } catch (error) {
      console.error('Get popular searches error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular searches'
      });
    }
  }
}

module.exports = SearchController;