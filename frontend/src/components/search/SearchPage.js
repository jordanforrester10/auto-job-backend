// src/components/search/SearchPage.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Slider,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Work as WorkIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  Bookmark as BookmarkIcon,
  Share as ShareIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import useSearch from '../../hooks/useSearch';
import searchService from '../../utils/searchService';

const SearchPage = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Initialize search with URL params
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'all';

  const {
    query,
    category,
    results,
    suggestions,
    isLoading,
    error,
    recentSearches,
    setQuery,
    setCategory,
    search,
    clearAll,
    getResultsForCategory,
    getTotalResults,
    hasResults,
    categories
  } = useSearch({
    initialQuery,
    initialCategory,
    autoSearch: true,
    onSearchComplete: (results, searchQuery) => {
      // Update URL with search params
      const newSearchParams = new URLSearchParams();
      newSearchParams.set('q', searchQuery);
      if (category !== 'all') {
        newSearchParams.set('category', category);
      }
      navigate(`/search?${newSearchParams}`, { replace: true });
    }
  });

  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    matchScore: [0, 100],
    location: '',
    company: '',
    experienceLevel: '',
    skills: [],
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  // Popular searches and categories
  const [popularSearches, setPopularSearches] = useState([]);

  useEffect(() => {
    loadPopularSearches();
  }, []);

  const loadPopularSearches = async () => {
    try {
      const popular = await searchService.getPopularSearches();
      setPopularSearches(popular.searches || []);
    } catch (error) {
      console.error('Error loading popular searches:', error);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (query.trim()) {
      search(query, category);
    }
  };

  const handleCategoryChange = (event, newCategory) => {
    setCategory(newCategory);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      dateRange: 'all',
      matchScore: [0, 100],
      location: '',
      company: '',
      experienceLevel: '',
      skills: [],
      sortBy: 'relevance',
      sortOrder: 'desc'
    });
  };

  const handleResultClick = (result) => {
    navigate(result.url);
  };

  const renderSearchInput = () => (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box component="form" onSubmit={handleSearchSubmit}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search jobs, resumes, recruiters, companies, skills..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {query && (
                  <IconButton onClick={() => setQuery('')} edge="end">
                    <ClearIcon />
                  </IconButton>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ ml: 1 }}
                  disabled={!query.trim()}
                >
                  Search
                </Button>
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '1.1rem',
              '& fieldset': {
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
              },
            }
          }}
        />
      </Box>

      {/* Recent and Popular Searches */}
      {!query && (
        <Box sx={{ mt: 2 }}>
          {recentSearches.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
                Recent Searches
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {recentSearches.slice(0, 5).map((search, index) => (
                  <Chip
                    key={index}
                    label={search.query}
                    onClick={() => setQuery(search.query)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {popularSearches.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon fontSize="small" sx={{ mr: 1 }} />
                Popular Searches
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {popularSearches.slice(0, 8).map((search, index) => (
                  <Chip
                    key={index}
                    label={search}
                    variant="outlined"
                    onClick={() => setQuery(search)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );

  const renderFilters = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterListIcon sx={{ mr: 1 }} />
            Filters
          </Typography>
          <Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              sx={{ mr: 1 }}
            >
              Advanced
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={handleClearFilters}
            >
              Clear All
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range</InputLabel>
              <Select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                label="Date Range"
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                label="Sort By"
              >
                <MenuItem value="relevance">Relevance</MenuItem>
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="match_score">Match Score</MenuItem>
                <MenuItem value="alphabetical">Alphabetical</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {category === 'jobs' && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Location"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Company"
                  value={filters.company}
                  onChange={(e) => handleFilterChange('company', e.target.value)}
                />
              </Grid>
            </>
          )}
        </Grid>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Advanced Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Match Score Range
                  </Typography>
                  <Slider
                    value={filters.matchScore}
                    onChange={(e, value) => handleFilterChange('matchScore', value)}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 50, label: '50%' },
                      { value: 100, label: '100%' }
                    ]}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Experience Level
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {['Entry Level', 'Mid Level', 'Senior Level', 'Executive'].map((level) => (
                      <FormControlLabel
                        key={level}
                        control={<Checkbox size="small" />}
                        label={level}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );

  const renderCategoryTabs = () => (
    <Paper sx={{ mb: 3 }}>
      <Tabs
        value={category}
        onChange={handleCategoryChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {categories.map((cat) => (
          <Tab
            key={cat.value}
            value={cat.value}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {cat.label}
                {results && getResultsForCategory(cat.value).length > 0 && (
                  <Badge
                    badgeContent={getResultsForCategory(cat.value).length}
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
    </Paper>
  );

  const renderResults = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      );
    }

    if (!hasResults() && query) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No results found for "{query}"
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your search terms or filters
          </Typography>
          <Button onClick={clearAll}>Clear Search</Button>
        </Paper>
      );
    }

    if (!hasResults()) {
      return null;
    }

    const currentResults = getResultsForCategory(category);

    return (
      <Paper>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">
            {getTotalResults()} results found
            {query && ` for "${query}"`}
          </Typography>
        </Box>

        <List>
          {currentResults.map((result, index) => {
            const typeDisplay = searchService.getResultTypeDisplay(result.type);
            
            return (
              <React.Fragment key={`${result.type}-${result.id}`}>
                {index > 0 && <Divider />}
                <ListItem
                  button
                  onClick={() => handleResultClick(result)}
                  sx={{ py: 2 }}
                >
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        backgroundColor: alpha(typeDisplay.color, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: typeDisplay.color
                      }}
                    >
                      {result.type === 'job' && <WorkIcon />}
                      {result.type === 'resume' && <DescriptionIcon />}
                      {result.type === 'recruiter' && <PersonIcon />}
                    </Box>
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {result.title}
                        </Typography>
                        <Chip
                          label={typeDisplay.label}
                          size="small"
                          sx={{ 
                            backgroundColor: alpha(typeDisplay.color, 0.1),
                            color: typeDisplay.color,
                            fontSize: '0.7rem'
                          }}
                        />
                        {result.matchScore && (
                          <Chip
                            label={`${result.matchScore}% match`}
                            size="small"
                            color={result.matchScore >= 80 ? 'success' : result.matchScore >= 60 ? 'info' : 'warning'}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {result.subtitle}
                        </Typography>
                        {result.description && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                            {result.description}
                          </Typography>
                        )}
                        {result.skills && result.skills.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {result.skills.slice(0, 5).map((skill, skillIndex) => (
                              <Chip
                                key={skillIndex}
                                label={typeof skill === 'string' ? skill : skill.name}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.65rem' }}
                              />
                            ))}
                            {result.skills.length > 5 && (
                              <Typography variant="caption" color="text.secondary">
                                +{result.skills.length - 5} more
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                  />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <IconButton size="small">
                      <BookmarkIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small">
                      <ShareIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </Paper>
    );
  };

  return (
    <MainLayout>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Typography variant="h4" gutterBottom>
            Search
          </Typography>
          
          {renderSearchInput()}
          
          {query && (
            <>
              {renderFilters()}
              {renderCategoryTabs()}
            </>
          )}
          
          {renderResults()}
        </Box>
      </Container>
    </MainLayout>
  );
};

export default SearchPage;