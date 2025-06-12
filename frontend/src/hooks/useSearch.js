// src/hooks/useSearch.js
import { useState, useEffect, useCallback, useRef } from 'react';
import searchService from '../utils/searchService';

/**
 * Custom hook for managing search functionality
 */
const useSearch = (options = {}) => {
  const {
    initialQuery = '',
    initialCategory = 'all',
    autoSearch = true,
    debounceDelay = 300,
    enableSuggestions = true,
    onSearchComplete = null,
    onError = null
  } = options;

  // State
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [results, setResults] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  // Refs
  const debouncedSearchRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Initialize debounced search
  useEffect(() => {
    debouncedSearchRef.current = searchService.createDebouncedSearch(
      performSearch,
      debounceDelay
    );
  }, [category, debounceDelay]);

  // Load recent searches on mount
  useEffect(() => {
    const recent = searchService.getRecentSearches();
    setRecentSearches(recent);
  }, []);

  // Auto-search when query changes
  useEffect(() => {
    if (autoSearch && query.trim().length >= 2) {
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current(query);
      }
    } else if (query.trim().length === 0) {
      clearResults();
    }
  }, [query, autoSearch]);

  // Load suggestions when query changes
  useEffect(() => {
    if (enableSuggestions && query.length >= 1 && query.length < 2) {
      loadSuggestions(query);
    }
  }, [query, enableSuggestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return;
    }

    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsLoading(true);
      setError(null);

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      const searchResults = await searchService.globalSearch(searchQuery, {
        category,
        limit: 20
      });

      if (searchResults.success) {
        const formattedResults = searchService.formatSearchResults(searchResults.data.results);
        setResults(formattedResults);
        
        // Save to recent searches
        searchService.saveRecentSearch(searchQuery, searchResults.data.results);
        
        // Update recent searches state
        const updatedRecent = searchService.getRecentSearches();
        setRecentSearches(updatedRecent);

        // Call completion callback
        if (onSearchComplete) {
          onSearchComplete(formattedResults, searchQuery);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        const errorMessage = err.response?.data?.error || err.message || 'Search failed';
        setError(errorMessage);
        
        if (onError) {
          onError(err);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [category, onSearchComplete, onError]);

  const loadSuggestions = useCallback(async (searchQuery) => {
    try {
      const suggestionsData = await searchService.getSuggestions(searchQuery);
      setSuggestions(suggestionsData.suggestions || []);
    } catch (err) {
      console.error('Error loading suggestions:', err);
      setSuggestions([]);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setSuggestions([]);
    setError(null);
  }, []);

  const clearAll = useCallback(() => {
    setQuery('');
    clearResults();
  }, [clearResults]);

  const search = useCallback((searchQuery, searchCategory = category) => {
    setQuery(searchQuery);
    setCategory(searchCategory);
    performSearch(searchQuery);
  }, [category, performSearch]);

  const searchInCategory = useCallback((searchCategory) => {
    setCategory(searchCategory);
    if (query.trim().length >= 2) {
      performSearch(query);
    }
  }, [query, performSearch]);

  const retrySearch = useCallback(() => {
    if (query.trim().length >= 2) {
      performSearch(query);
    }
  }, [query, performSearch]);

  const getResultsForCategory = useCallback((categoryName) => {
    return results?.[categoryName] || [];
  }, [results]);

  const getTotalResults = useCallback(() => {
    return results?.totalCount || 0;
  }, [results]);

  const hasResults = useCallback(() => {
    return getTotalResults() > 0;
  }, [getTotalResults]);

  const hasResultsForCategory = useCallback((categoryName) => {
    return getResultsForCategory(categoryName).length > 0;
  }, [getResultsForCategory]);

  const searchSpecificCategory = useCallback(async (searchQuery, categoryName) => {
    try {
      setIsLoading(true);
      setError(null);

      let categoryResults = [];
      
      switch (categoryName) {
        case 'jobs':
          categoryResults = await searchService.searchJobs(searchQuery);
          break;
        case 'resumes':
          categoryResults = await searchService.searchResumes(searchQuery);
          break;
        case 'recruiters':
          categoryResults = await searchService.searchRecruiters(searchQuery);
          break;
        default:
          throw new Error('Invalid category');
      }

      return categoryResults;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateQuery = useCallback((searchQuery) => {
    return searchService.validateSearchQuery(searchQuery);
  }, []);

  const highlightText = useCallback((text, highlightQuery = query) => {
    return searchService.highlightSearchTerms(text, highlightQuery);
  }, [query]);

  const addToRecentSearches = useCallback((searchQuery) => {
    searchService.saveRecentSearch(searchQuery, results || { totalCount: 0 });
    const updatedRecent = searchService.getRecentSearches();
    setRecentSearches(updatedRecent);
  }, [results]);

  const clearRecentSearches = useCallback(() => {
    searchService.clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Return search state and methods
  return {
    // State
    query,
    category,
    results,
    suggestions,
    isLoading,
    error,
    recentSearches,

    // Actions
    setQuery,
    setCategory,
    search,
    searchInCategory,
    searchSpecificCategory,
    clearResults,
    clearAll,
    retrySearch,
    addToRecentSearches,
    clearRecentSearches,

    // Utilities
    getResultsForCategory,
    getTotalResults,
    hasResults,
    hasResultsForCategory,
    validateQuery,
    highlightText,

    // Categories
    categories: searchService.getSearchCategories(),

    // Keyboard shortcuts
    shortcuts: searchService.getKeyboardShortcuts()
  };
};

export default useSearch;