import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Autocomplete,
  TextField,
  Chip,
  Alert,
  FormHelperText,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  Work as WorkIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  TravelExplore as TravelExploreIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Common US cities for autocomplete suggestions
const COMMON_CITIES = [
  'Remote',
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
  'San Jose, CA',
  'Austin, TX',
  'Jacksonville, FL',
  'Fort Worth, TX',
  'Columbus, OH',
  'Charlotte, NC',
  'San Francisco, CA',
  'Indianapolis, IN',
  'Seattle, WA',
  'Denver, CO',
  'Washington, DC',
  'Boston, MA',
  'El Paso, TX',
  'Nashville, TN',
  'Detroit, MI',
  'Oklahoma City, OK',
  'Portland, OR',
  'Las Vegas, NV',
  'Memphis, TN',
  'Louisville, KY',
  'Baltimore, MD',
  'Milwaukee, WI',
  'Albuquerque, NM',
  'Tucson, AZ',
  'Fresno, CA',
  'Sacramento, CA',
  'Mesa, AZ',
  'Kansas City, MO',
  'Atlanta, GA',
  'Long Beach, CA',
  'Colorado Springs, CO',
  'Raleigh, NC',
  'Miami, FL',
  'Virginia Beach, VA',
  'Omaha, NE',
  'Oakland, CA',
  'Minneapolis, MN',
  'Tulsa, OK',
  'Arlington, TX',
  'Tampa, FL'
];

const JobPreferencesStep = ({ onContinue, onPrevious, resumeAnalysis, loading = false }) => {
  const theme = useTheme();
  
  // Form state
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedJobTitles, setSelectedJobTitles] = useState([]);
  const [locationInput, setLocationInput] = useState('');
  const [jobTitleInput, setJobTitleInput] = useState('');
  
  // Validation state
  const [locationError, setLocationError] = useState('');
  const [jobTitleError, setJobTitleError] = useState('');
  
  // Suggestions based on resume analysis
  const [jobTitleSuggestions, setJobTitleSuggestions] = useState([]);

  // Extract job title suggestions from resume analysis
  useEffect(() => {
    if (resumeAnalysis) {
      const suggestions = [];
      
      // Add current/recent job titles from experience
      if (resumeAnalysis.experience && resumeAnalysis.experience.length > 0) {
        resumeAnalysis.experience.slice(0, 3).forEach(exp => {
          if (exp.title) {
            suggestions.push(exp.title);
          }
        });
      }
      
      // Add some common variations based on the first job title
      if (suggestions.length > 0) {
        const firstTitle = suggestions[0];
        
        // Add senior/junior variations
        if (!firstTitle.toLowerCase().includes('senior')) {
          suggestions.push(`Senior ${firstTitle}`);
        }
        if (!firstTitle.toLowerCase().includes('junior') && !firstTitle.toLowerCase().includes('senior')) {
          suggestions.push(`Junior ${firstTitle}`);
        }
        
        // Add lead variation
        if (!firstTitle.toLowerCase().includes('lead')) {
          suggestions.push(`Lead ${firstTitle}`);
        }
      }
      
      // Add some common job titles as fallback
      const commonTitles = [
        'Software Engineer',
        'Product Manager',
        'Data Scientist',
        'Marketing Manager',
        'Sales Representative',
        'Business Analyst',
        'Project Manager',
        'UX Designer',
        'DevOps Engineer',
        'Full Stack Developer'
      ];
      
      // Merge and deduplicate
      const allSuggestions = [...new Set([...suggestions, ...commonTitles])];
      setJobTitleSuggestions(allSuggestions);
    }
  }, [resumeAnalysis]);

  // Validation functions
  const validateLocations = () => {
    if (selectedLocations.length === 0) {
      setLocationError('Please select at least 1 location');
      return false;
    }
    if (selectedLocations.length > 5) {
      setLocationError('Maximum 5 locations allowed');
      return false;
    }
    setLocationError('');
    return true;
  };

  const validateJobTitles = () => {
    if (selectedJobTitles.length === 0) {
      setJobTitleError('Please select at least 1 job title');
      return false;
    }
    if (selectedJobTitles.length > 3) {
      setJobTitleError('Maximum 3 job titles allowed');
      return false;
    }
    setJobTitleError('');
    return true;
  };

  // Handle form submission
  const handleContinue = () => {
    const isLocationsValid = validateLocations();
    const isJobTitlesValid = validateJobTitles();
    
    if (isLocationsValid && isJobTitlesValid) {
      // Convert locations to the format expected by the backend
      const formattedLocations = selectedLocations.map(location => ({
        name: location,
        type: location === 'Remote' ? 'remote' : 'city'
      }));
      
      onContinue(formattedLocations, selectedJobTitles);
    }
  };

  // Check if form is valid
  const isFormValid = selectedLocations.length >= 1 && 
                     selectedLocations.length <= 5 && 
                     selectedJobTitles.length >= 1 && 
                     selectedJobTitles.length <= 3;

  return (
    <Paper elevation={0} sx={{ p: 4, border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
      {/* Header with Navigation Buttons */}
      <Box sx={{ textAlign: 'center', mb: 4, position: 'relative' }}>
        {/* Icon and Buttons on same line */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'relative',
          mb: 2 
        }}>
          {/* Back Button */}
          <Button
            variant="outlined"
            onClick={onPrevious}
            startIcon={<ArrowBackIcon />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Back to Analysis
          </Button>

          {/* Centered Icon */}
          <TravelExploreIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          
          {/* Continue Button with Loading State */}
          <Button
            variant="contained"
            onClick={handleContinue}
            disabled={!isFormValid || loading}
            endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              fontSize: '0.9rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              minWidth: 140 // Prevent button width changes during loading
            }}
          >
            {loading ? 'Finding Jobs...' : 'Find My Jobs'}
          </Button>
        </Box>
        
        {/* Title */}
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
          Let's Find Your Perfect Jobs! 🎯
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Tell us where you'd like to work and what roles you're targeting. We'll use this to find personalized job matches just for you.
        </Typography>
      </Box>

      {/* Form Content */}
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        {/* Location Preferences Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LocationOnIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Where would you like to work?
            </Typography>
            <Chip 
              label="Required" 
              color="error" 
              size="small" 
              sx={{ ml: 2 }} 
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select 1-5 locations where you'd like to find jobs. Include "Remote" if you're open to remote work.
          </Typography>
          
          <Autocomplete
            multiple
            options={COMMON_CITIES}
            value={selectedLocations}
            onChange={(event, newValue) => {
              if (newValue.length <= 5) {
                setSelectedLocations(newValue);
                setLocationError('');
              }
            }}
            inputValue={locationInput}
            onInputChange={(event, newInputValue) => {
              setLocationInput(newInputValue);
            }}
            freeSolo
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                  color={option === 'Remote' ? 'success' : 'primary'}
                  icon={<LocationOnIcon />}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={selectedLocations.length === 0 ? "Type a city (e.g., San Francisco, CA) or select Remote" : "Add another location..."}
                error={!!locationError}
                helperText={locationError || `${selectedLocations.length}/5 locations selected`}
                sx={{ mb: 1 }}
              />
            )}
            sx={{ mb: 2 }}
          />
          
          {selectedLocations.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Great! We'll search for jobs in: {selectedLocations.join(', ')}
              </Typography>
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Job Title Preferences Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <WorkIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              What roles are you targeting?
            </Typography>
            <Chip 
              label="Required" 
              color="error" 
              size="small" 
              sx={{ ml: 2 }} 
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select 1-3 job titles you're interested in. We've suggested some based on your resume.
          </Typography>
          
          <Autocomplete
            multiple
            options={jobTitleSuggestions}
            value={selectedJobTitles}
            onChange={(event, newValue) => {
              if (newValue.length <= 3) {
                setSelectedJobTitles(newValue);
                setJobTitleError('');
              }
            }}
            inputValue={jobTitleInput}
            onInputChange={(event, newInputValue) => {
              setJobTitleInput(newInputValue);
            }}
            freeSolo
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                  color="secondary"
                  icon={<WorkIcon />}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={selectedJobTitles.length === 0 ? "Type a job title (e.g., Software Engineer, Product Manager)" : "Add another job title..."}
                error={!!jobTitleError}
                helperText={jobTitleError || `${selectedJobTitles.length}/3 job titles selected`}
                sx={{ mb: 1 }}
              />
            )}
            sx={{ mb: 2 }}
          />
          
          {selectedJobTitles.length > 0 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Perfect! We'll find: {selectedJobTitles.join(', ')} positions
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Form Validation Summary */}
        {(!isFormValid && (selectedLocations.length > 0 || selectedJobTitles.length > 0)) && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Please complete both sections:
            </Typography>
            <Typography variant="body2">
              • {selectedLocations.length === 0 ? 'Select at least 1 location' : `✓ ${selectedLocations.length} location${selectedLocations.length > 1 ? 's' : ''} selected`}
            </Typography>
            <Typography variant="body2">
              • {selectedJobTitles.length === 0 ? 'Select at least 1 job title' : `✓ ${selectedJobTitles.length} job title${selectedJobTitles.length > 1 ? 's' : ''} selected`}
            </Typography>
          </Alert>
        )}

        {/* Success Message */}
        {isFormValid && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Ready to find your perfect jobs! 🚀
            </Typography>
            <Typography variant="body2">
              We'll search for {selectedJobTitles.join(', ')} positions in {selectedLocations.join(', ')}
            </Typography>
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

export default JobPreferencesStep;
