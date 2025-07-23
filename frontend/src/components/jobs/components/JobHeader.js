// src/components/jobs/components/JobHeader.js
import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  useTheme
} from '@mui/material';
import {
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  SmartToy as SmartToyIcon,
  OpenInNew as OpenInNewIcon,
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import AutoJobLogo from '../../common/AutoJobLogo';
import AddToTrackerButton from '../../tracker/AddToTrackerButton';

const JobHeader = ({ 
  job, 
  onTailorClick, 
  onMenuClick, 
  onOpenOriginal 
}) => {
  const theme = useTheme();

  // Safe AutoJobLogo wrapper component
  const SafeAutoJobLogo = ({ size = 'small' }) => {
    try {
      return (
        <AutoJobLogo 
          variant="icon-only" 
          size={size} 
          showTagline={false}
        />
      );
    } catch (error) {
      // Fallback to SmartToy icon if AutoJobLogo fails
      console.warn('AutoJobLogo failed to render:', error);
      return <SmartToyIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
    }
  };

  // Custom chip icon for discovered jobs - properly sized and positioned
  const DiscoveredChipIcon = () => {
    try {
      return (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: 18, 
          height: 18,
          ml: 0.5  // Add left margin to bring logo closer to "Discovered" text
        }}>
          <AutoJobLogo 
            variant="icon-only" 
            size="small"
            showTagline={false}
            sx={{ 
              '& svg': { 
                width: 14, 
                height: 14,
                display: 'block'
              } 
            }}
          />
        </Box>
      );
    } catch (error) {
      console.warn('AutoJobLogo failed to render in chip:', error);
      return <SmartToyIcon sx={{ fontSize: 16 }} />;
    }
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 4, 
        borderRadius: 3,
        backgroundImage: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.light}15 100%)` 
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700} color="primary">
            {job.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Chip 
              icon={<BusinessIcon />} 
              label={job.company} 
              size="small" 
              sx={{ mr: 1 }} 
            />
            {job.location && (
              <Chip 
                icon={<LocationOnIcon />} 
                label={job.location.city ? 
                  `${job.location.city}${job.location.state ? `, ${job.location.state}` : ''}` : 
                  job.location.remote ? 'Remote' : 'Location not specified'} 
                size="small"
                sx={{ mr: 1 }} 
              />
            )}
            {job.isAiGenerated && (
              <Chip 
                icon={<DiscoveredChipIcon />} 
                label="Discovered" 
                size="small"
                sx={{ 
                  mr: 1,
                  backgroundColor: '#00c4b4',
                  color: 'white',
                  '& .MuiChip-icon': {
                    color: 'white'
                  }
                }} 
              />
            )}
            {job.parsedData?.experienceLevel && (
              <Chip 
                icon={<TrendingUpIcon />} 
                label={job.parsedData.experienceLevel.charAt(0).toUpperCase() + job.parsedData.experienceLevel.slice(1)} 
                size="small"
                color="secondary"
                sx={{ mr: 1 }} 
              />
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {job.sourceUrl && (
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={onOpenOriginal}
              sx={{ borderRadius: 2 }}
            >
              Open Original
            </Button>
          )}
          <AddToTrackerButton 
            job={job}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2 }}
          />
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SafeAutoJobLogo size="small" />}
            onClick={onTailorClick}
            sx={{ borderRadius: 2 }}
          >
            Get Tailored Resume
          </Button>
          <IconButton
            onClick={onMenuClick}
            size="large"
            sx={{ ml: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default JobHeader;
