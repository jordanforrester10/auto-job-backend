// src/utils/searchService.js
import api from './axios';

const searchService = {
  /**
   * Global search across all content types
   */
  globalSearch: async (query, options = {}) => {
    try {
      const {
        category = 'all',
        limit = 20,
        includeContent = false
      } = options;

      if (!query || query.trim().length < 2) {
        return {
          success: false,
          error: 'Search query must be at least 2 characters long'
        };
      }

      console.log(`🔍 Searching for: "${query}" in category: ${category}`);

      const params = new URLSearchParams();
      params.append('query', query.trim());
      params.append('category', category);
      params.append('limit', limit);
      if (includeContent) params.append('includeContent', 'true');

      const response = await api.get(`/search?${params}`);
      
      console.log(`✅ Search completed: ${response.data.data.results.totalCount} results`);
      return response.data;

    } catch (error) {
      console.error('Global search error:', error);
      throw error;
    }
  },

  /**
   * Get search suggestions as user types
   */
  getSuggestions: async (query, limit = 5) => {
    try {
      if (!query || query.length < 2) {
        return { suggestions: [] };
      }

      const params = new URLSearchParams();
      params.append('query', query);
      params.append('limit', limit);

      const response = await api.get(`/search/suggestions?${params}`);
      return response.data.data;

    } catch (error) {
      console.error('Get suggestions error:', error);
      return { suggestions: [] };
    }
  },

  /**
   * Get popular searches
   */
  getPopularSearches: async () => {
    try {
      const response = await api.get('/search/popular');
      return response.data.data;
    } catch (error) {
      console.error('Get popular searches error:', error);
      return { searches: [] };
    }
  },

  /**
   * Search specific category with custom parameters
   */
  searchJobs: async (query, options = {}) => {
    try {
      const result = await searchService.globalSearch(query, {
        ...options,
        category: 'jobs'
      });
      return result.data?.results?.jobs || [];
    } catch (error) {
      console.error('Search jobs error:', error);
      return [];
    }
  },

  searchResumes: async (query, options = {}) => {
    try {
      const result = await searchService.globalSearch(query, {
        ...options,
        category: 'resumes'
      });
      return result.data?.results?.resumes || [];
    } catch (error) {
      console.error('Search resumes error:', error);
      return [];
    }
  },

  searchRecruiters: async (query, options = {}) => {
    try {
      const result = await searchService.globalSearch(query, {
        ...options,
        category: 'recruiters'
      });
      return result.data?.results?.recruiters || [];
    } catch (error) {
      console.error('Search recruiters error:', error);
      return [];
    }
  },

  /**
   * Format search results for display
   */
  formatSearchResults: (results) => {
    const formatted = {
      all: [],
      jobs: [],
      resumes: [],
      recruiters: [],
      totalCount: 0
    };

    if (!results) return formatted;

    // Combine all results for 'all' category view
    const allResults = [
      ...(results.jobs || []),
      ...(results.resumes || []),
      ...(results.recruiters || [])
    ];

    // Sort all results by relevance/date
    allResults.sort((a, b) => {
      // Prioritize by type relevance, then by date
      const typeOrder = { job: 0, resume: 1, recruiter: 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return new Date(b.createdAt || b.lastActiveDate) - new Date(a.createdAt || a.lastActiveDate);
    });

    formatted.all = allResults;
    formatted.jobs = results.jobs || [];
    formatted.resumes = results.resumes || [];
    formatted.recruiters = results.recruiters || [];
    formatted.totalCount = results.totalCount || 0;

    return formatted;
  },

  /**
   * Get result type icon and color
   */
  getResultTypeDisplay: (type) => {
    const displays = {
      job: {
        icon: 'Work',
        color: '#4285f4',
        label: 'Job'
      },
      resume: {
        icon: 'Description',
        color: '#34a853',
        label: 'Resume'
      },
      recruiter: {
        icon: 'Person',
        color: '#00c4b4',
        label: 'Recruiter'
      }
    };

    return displays[type] || {
      icon: 'Search',
      color: '#666',
      label: 'Unknown'
    };
  },

  /**
   * Highlight search terms in text
   */
  highlightSearchTerms: (text, searchQuery) => {
    if (!text || !searchQuery) return text;

    const regex = new RegExp(`(${searchQuery.split(' ').join('|')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  /**
   * Get search categories for filtering
   */
  getSearchCategories: () => {
    return [
      { value: 'all', label: 'All Results', icon: 'Search' },
      { value: 'jobs', label: 'Jobs', icon: 'Work' },
      { value: 'resumes', label: 'Resumes', icon: 'Description' },
      { value: 'recruiters', label: 'Recruiters', icon: 'Person' }
    ];
  },

  /**
   * Debounced search function
   */
  createDebouncedSearch: (callback, delay = 300) => {
    let timeoutId;
    
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback.apply(null, args), delay);
    };
  },

  /**
   * Save search to local storage for recent searches
   */
  saveRecentSearch: (query, results) => {
    try {
      const recentSearches = searchService.getRecentSearches();
      
      // Remove if already exists
      const filtered = recentSearches.filter(search => 
        search.query.toLowerCase() !== query.toLowerCase()
      );
      
      // Add to beginning
      filtered.unshift({
        query,
        timestamp: new Date().toISOString(),
        resultCount: results.totalCount || 0
      });
      
      // Keep only last 10 searches
      const limited = filtered.slice(0, 10);
      
      localStorage.setItem('recentSearches', JSON.stringify(limited));
    } catch (error) {
      console.error('Save recent search error:', error);
    }
  },

  /**
   * Get recent searches from local storage
   */
  getRecentSearches: () => {
    try {
      const stored = localStorage.getItem('recentSearches');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Get recent searches error:', error);
      return [];
    }
  },

  /**
   * Clear recent searches
   */
  clearRecentSearches: () => {
    try {
      localStorage.removeItem('recentSearches');
    } catch (error) {
      console.error('Clear recent searches error:', error);
    }
  },

  /**
   * Validate search query
   */
  validateSearchQuery: (query) => {
    const errors = [];
    
    if (!query || query.trim().length === 0) {
      errors.push('Search query cannot be empty');
    }
    
    if (query && query.trim().length < 2) {
      errors.push('Search query must be at least 2 characters long');
    }
    
    if (query && query.length > 100) {
      errors.push('Search query must be less than 100 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Get search keyboard shortcuts
   */
  getKeyboardShortcuts: () => {
    return {
      openSearch: ['/', 'Ctrl+K', 'Cmd+K'],
      closeSearch: ['Escape'],
      navigateResults: ['ArrowUp', 'ArrowDown'],
      selectResult: ['Enter'],
      nextCategory: ['Tab'],
      previousCategory: ['Shift+Tab']
    };
  }
};

export default searchService;