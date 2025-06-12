// src/components/common/GlobalSearch.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  InputBase,
  IconButton,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  useTheme,
  alpha,
  ClickAwayListener,
  Popper,
  Fade,
  ListItemButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Work as WorkIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import searchService from '../../utils/searchService';
import RecruiterDetails from '../recruiters/RecruiterDetails';

const GlobalSearch = ({ sx = {} }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);
  const [recruiterModalOpen, setRecruiterModalOpen] = useState(false);
  
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const debouncedSearchRef = useRef(null);

  // Search categories
  const categories = searchService.getSearchCategories();

  // Initialize debounced search with dependency on selectedCategory
  useEffect(() => {
    debouncedSearchRef.current = searchService.createDebouncedSearch(
      async (searchQuery) => {
        if (searchQuery.trim().length >= 2) {
          await performSearch(searchQuery);
        } else {
          setResults(null);
          if (searchQuery.length >= 1) {
            await loadSuggestions(searchQuery);
          }
        }
      },
      300
    );
  }, []); // Remove selectedCategory dependency to prevent recreating debounced function

  // Load initial data when search opens
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Global search shortcut (Ctrl/Cmd + K or /)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k' || event.key === '/') {
        event.preventDefault();
        openSearch();
      }
      
      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        closeSearch();
      }
      
      // Arrow navigation
      if (isOpen && results) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          navigateResults(1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          navigateResults(-1);
        } else if (event.key === 'Enter' && selectedIndex >= 0) {
          event.preventDefault();
          selectResult();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const loadInitialData = async () => {
    try {
      // Load recent searches
      const recent = searchService.getRecentSearches();
      setRecentSearches(recent);
      
      // Load popular searches
      const popular = await searchService.getPopularSearches();
      setPopularSearches(popular.searches || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadSuggestions = async (searchQuery) => {
    try {
      const suggestionsData = await searchService.getSuggestions(searchQuery);
      setSuggestions(suggestionsData.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const performSearch = async (searchQuery) => {
    try {
      setIsLoading(true);
      const searchResults = await searchService.globalSearch(searchQuery, {
        category: selectedCategory,
        limit: 20
      });
      
      if (searchResults.success) {
        const formattedResults = searchService.formatSearchResults(searchResults.data.results);
        setResults(formattedResults);
        
        // Save to recent searches
        searchService.saveRecentSearch(searchQuery, searchResults.data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    
    // Clear previous results when query changes and reset to 'all' category
    if (value.trim().length < 2) {
      setResults(null);
      setError(null);
      // Also clear recruiter modal state when query changes
      setSelectedRecruiter(null);
      setRecruiterModalOpen(false);
      if (value.trim().length === 0) {
        setSelectedCategory('all'); // Reset category when query is completely cleared
      }
    }
    
    if (debouncedSearchRef.current) {
      debouncedSearchRef.current(value);
    }
  };

  const openSearch = () => {
    setIsOpen(true);
    // Don't reset category when opening search - keep user's current tab
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const closeSearch = () => {
    setIsOpen(false);
    // Don't clear query and results when closing - keep them for when user reopens
    setSelectedIndex(-1);
  };

  const handleRecruiterModalClose = () => {
    setRecruiterModalOpen(false);
    setSelectedRecruiter(null);
    // Don't clear the search results when closing the recruiter modal
    // This keeps the search context intact
  };

  const handleStartOutreach = (recruiter) => {
    // Close the modal and search
    handleRecruiterModalClose();
    closeSearch();
    // Navigate to outreach page or handle outreach
    console.log('Starting outreach for:', recruiter);
    // You can add navigation logic here if needed
  };

  const clearAll = () => {
    setQuery('');
    setResults(null);
    setSuggestions([]);
    setSelectedIndex(-1);
    setError(null);
  };

  const navigateResults = (direction) => {
    if (!results) return;
    
    const currentResults = results[selectedCategory] || [];
    const maxIndex = currentResults.length - 1;
    
    if (direction === 1) {
      setSelectedIndex(prev => prev < maxIndex ? prev + 1 : 0);
    } else {
      setSelectedIndex(prev => prev > 0 ? prev - 1 : maxIndex);
    }
  };

  const selectResult = () => {
    if (!results || selectedIndex < 0) return;
    
    const currentResults = results[selectedCategory] || [];
    const selectedResult = currentResults[selectedIndex];
    
    if (selectedResult) {
      navigate(selectedResult.url);
      closeSearch();
    }
  };

  const handleResultClick = (result) => {
    // Handle recruiter results differently - open modal instead of navigating
    if (result.type === 'recruiter') {
      setSelectedRecruiter(result.id);
      setRecruiterModalOpen(true);
    } else {
      // For jobs and resumes, navigate normally
      navigate(result.url);
      closeSearch();
    }
  };

  const handleCategoryChange = (event, newCategory) => {
    console.log(`🔄 Switching category from ${selectedCategory} to ${newCategory}`);
    const oldCategory = selectedCategory;
    setSelectedCategory(newCategory);
    setSelectedIndex(-1);
    
    // Don't re-search when switching categories - just show the existing results
    // The search was already performed with category 'all', so we have all the data
    console.log(`📊 Showing results for ${newCategory} from existing search results`);
    
    if (results) {
      console.log(`📊 Available results:`, {
        totalCount: results.totalCount,
        jobs: results.jobs?.length || 0,
        resumes: results.resumes?.length || 0,
        recruiters: results.recruiters?.length || 0,
        currentCategory: newCategory,
        resultsForCategory: getResultsForCategory(newCategory).length
      });
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.text);
    performSearch(suggestion.text);
  };

  const handleRecentSearchClick = (recentSearch) => {
    setQuery(recentSearch.query);
    performSearch(recentSearch.query);
  };

  const clearQuery = () => {
    setQuery('');
    setResults(null);
    setSuggestions([]);
    setSelectedIndex(-1);
    setError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'job': return <WorkIcon fontSize="small" />;
      case 'resume': return <DescriptionIcon fontSize="small" />;
      case 'recruiter': return <PersonIcon fontSize="small" />;
      default: return <SearchIcon fontSize="small" />;
    }
  };

  const getResultsForCategory = (category) => {
    if (!results) return [];
    
    // Handle 'all' category by combining results
    if (category === 'all') {
      const allResults = [
        ...(results.jobs || []),
        ...(results.resumes || []),
        ...(results.recruiters || [])
      ];
      
      // Sort by relevance/type
      return allResults.sort((a, b) => {
        // Prioritize by match score if available
        if (a.matchScore && b.matchScore) {
          return b.matchScore - a.matchScore;
        }
        // Then by creation date
        const aDate = new Date(a.createdAt || a.lastActiveDate || 0);
        const bDate = new Date(b.createdAt || b.lastActiveDate || 0);
        return bDate - aDate;
      });
    }
    
    // Return specific category results
    return results[category] || [];
  };

  const getResultCount = (category) => {
    if (!results) return 0;
    return results[category]?.length || 0;
  };

  const renderEmptyState = () => {
    if (query.trim().length === 0) {
      return (
        <Box sx={{ p: 3 }}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
                Recent Searches
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {recentSearches.slice(0, 5).map((search, index) => (
                  <Chip
                    key={index}
                    label={search.query}
                    size="small"
                    onClick={() => handleRecentSearchClick(search)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {/* Popular Searches */}
          {popularSearches.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon fontSize="small" sx={{ mr: 1 }} />
                Popular Searches
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {popularSearches.slice(0, 6).map((search, index) => (
                  <Chip
                    key={index}
                    label={search}
                    size="small"
                    variant="outlined"
                    onClick={() => handleSuggestionClick({ text: search })}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {/* Keyboard Shortcuts */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Tip: Use <kbd>/</kbd> or <kbd>Ctrl+K</kbd> to search from anywhere
            </Typography>
          </Box>
        </Box>
      );
    }

    if (query.trim().length >= 2 && results && results.totalCount === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No results found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try different keywords or check spelling
          </Typography>
          
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Did you mean:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {suggestions.map((suggestion, index) => (
                  <Chip
                    key={index}
                    label={suggestion.text}
                    size="small"
                    onClick={() => handleSuggestionClick(suggestion)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      );
    }

    return null;
  };

  const renderResults = () => {
    if (!results || results.totalCount === 0) {
      return renderEmptyState();
    }

    const currentResults = results[selectedCategory] || [];

    return (
      <Box>
        {/* Category Tabs */}
        <Tabs
          value={selectedCategory}
          onChange={handleCategoryChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          {categories.map((category) => (
            <Tab
              key={category.value}
              value={category.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {category.label}
                  {getResultCount(category.value) > 0 && (
                    <Badge
                      badgeContent={getResultCount(category.value)}
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.7rem',
                          height: 16,
                          minWidth: 16
                        }
                      }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* Results List */}
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {currentResults.map((result, index) => {
            const isSelected = index === selectedIndex;
            const typeDisplay = searchService.getResultTypeDisplay(result.type);
            
            return (
              <ListItemButton
                key={`${result.type}-${result.id}`}
                selected={isSelected}
                onClick={() => handleResultClick(result)}
                sx={{
                  py: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      backgroundColor: alpha(typeDisplay.color, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: typeDisplay.color
                    }}
                  >
                    {getResultIcon(result.type)}
                  </Box>
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {result.title}
                      </Typography>
                      {result.matchScore && (
                        <Chip
                          label={`${result.matchScore}% match`}
                          size="small"
                          color={result.matchScore >= 80 ? 'success' : result.matchScore >= 60 ? 'info' : 'warning'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                      {result.isActive && (
                        <Chip
                          label="Active"
                          size="small"
                          color="success"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {result.subtitle}
                      </Typography>
                      {result.description && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {result.description}
                        </Typography>
                      )}
                      {result.skills && result.skills.length > 0 && (
                        <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {result.skills.slice(0, 3).map((skill, skillIndex) => (
                            <Chip
                              key={skillIndex}
                              label={typeof skill === 'string' ? skill : skill.name}
                              size="small"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          ))}
                          {result.skills.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                              +{result.skills.length - 3} more
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  }
                />
                
                <KeyboardArrowRightIcon fontSize="small" color="action" />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    );
  };

  return (
    <>
      <ClickAwayListener onClickAway={() => {
        if (isOpen) {
          closeSearch();
        }
      }}>
        <Box sx={{ position: 'relative', ...sx }}>
          {/* Search Input */}
          <Box
            sx={{
              display: 'flex',
              position: 'relative',
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.common.black, 0.04),
              '&:hover': {
                backgroundColor: alpha(theme.palette.common.black, 0.06),
              },
              '&:focus-within': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                outline: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              },
              width: '100%',
              maxWidth: { xs: '100%', sm: 400, md: 500 },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <IconButton 
              sx={{ 
                p: 1.5,
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main'
                }
              }} 
              aria-label="search"
              onClick={openSearch}
            >
              <SearchIcon />
            </IconButton>
            
            <InputBase
              ref={inputRef}
              placeholder="Search jobs, companies, skills..."
              value={query}
              onChange={handleInputChange}
              onFocus={openSearch}
              sx={{
                color: 'text.primary',
                flex: 1,
                '& .MuiInputBase-input': {
                  padding: theme.spacing(1.5, 1, 1.5, 0),
                  width: '100%',
                  fontSize: '0.95rem',
                  '&::placeholder': {
                    color: 'text.secondary',
                    opacity: 0.7
                  }
                },
              }}
            />
            
            {isLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
                <CircularProgress size={20} />
              </Box>
            )}
            
            {query && !isLoading && (
              <IconButton
                onClick={clearQuery}
                size="small"
                sx={{ mr: 1 }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* Search Results Dropdown */}
          {isOpen && (
            <Paper
              ref={resultsRef}
              elevation={8}
              sx={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                mt: 1,
                maxHeight: 500,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid',
                borderColor: 'divider',
                zIndex: theme.zIndex.modal + 1,
                width: inputRef.current?.offsetWidth || '100%'
              }}
            >
              {/* Close button for mobile */}
              <Box sx={{ 
                display: { xs: 'block', md: 'none' },
                p: 1,
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}>
                <IconButton
                  onClick={closeSearch}
                  size="small"
                  sx={{ float: 'right' }}
                >
                  <CloseIcon />
                </IconButton>
                <Typography variant="subtitle2" sx={{ pt: 1 }}>
                  Search Results
                </Typography>
              </Box>

              {renderResults()}
            </Paper>
          )}
        </Box>
      </ClickAwayListener>

      {/* Recruiter Details Modal */}
      <RecruiterDetails
        open={recruiterModalOpen}
        onClose={handleRecruiterModalClose}
        recruiterId={selectedRecruiter}
        onStartOutreach={handleStartOutreach}
      />
    </>
  );
};

export default GlobalSearch;