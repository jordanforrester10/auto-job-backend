// src/components/jobs/utils/searchUtils.js
import React from 'react';
import { useTheme } from '@mui/material/styles';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Psychology as PsychologyIcon,
  Business as BusinessIcon,
  Search as SearchIcon,
  CloudDownload as CloudDownloadIcon,
  Save as SaveIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import AutoJobLogo from '../../common/AutoJobLogo';

export const getStatusColor = (status) => {
  switch (status) {
    case 'running': return 'success';
    case 'paused': return 'warning';
    case 'completed': return 'info';
    case 'failed': return 'error';
    case 'cancelled': return 'default';
    default: return 'default';
  }
};

export const getStatusIcon = (status) => {
  switch (status) {
    case 'running': return <PlayIcon fontSize="small" />;
    case 'paused': return <PauseIcon fontSize="small" />;
    case 'completed': return <CheckCircleIcon fontSize="small" />;
    case 'failed': return <ErrorIcon fontSize="small" />;
    case 'cancelled': return <DeleteIcon fontSize="small" />;
    default: return null;
  }
};

export const getReasoningIcon = (phase) => {
  switch (phase) {
    case 'initialization': 
      return <AutoJobLogo variant="icon-only" size="small" sx={{ width: 18, height: 18 }} />;
    case 'career_analysis': 
      return <PsychologyIcon sx={{ color: 'inherit', fontSize: 'inherit' }} />;
    case 'company_discovery': 
      return <BusinessIcon sx={{ color: 'inherit', fontSize: 'inherit' }} />;
    case 'job_search': 
      return <SearchIcon sx={{ color: 'inherit', fontSize: 'inherit' }} />;
    case 'content_extraction': 
      return <CloudDownloadIcon sx={{ color: 'inherit', fontSize: 'inherit' }} />;
    case 'job_saving': 
      return <SaveIcon sx={{ color: 'inherit', fontSize: 'inherit' }} />;
    case 'completion': 
      return <CheckCircleIcon sx={{ color: 'inherit', fontSize: 'inherit' }} />;
    case 'error': 
      return <ErrorIcon sx={{ color: 'inherit', fontSize: 'inherit' }} />;
    default: 
      return <InfoIcon sx={{ color: 'inherit', fontSize: 'inherit' }} />;
  }
};

export const getReasoningColor = (phase, success, theme) => {
  // Success/failure states take priority
  if (success === false) return theme.palette.error.main;
  if (success === true && phase === 'completion') return theme.palette.success.main;
  
  // Phase-specific colors using your theme
  switch (phase) {
    case 'initialization': 
      return theme.palette.primary.main; // #1a73e8
    case 'career_analysis': 
      return theme.palette.secondary.main; // #00c4b4
    case 'company_discovery': 
      return theme.palette.info.main; // #4285f4
    case 'job_search': 
      return theme.palette.warning.main; // #fbbc04
    case 'content_extraction': 
      return theme.palette.success.main; // #34a853
    case 'job_saving': 
      return theme.palette.primary.dark; // #0d47a1
    case 'completion': 
      return theme.palette.success.main; // #34a853
    case 'error': 
      return theme.palette.error.main; // #ea4335
    default: 
      return theme.palette.text.secondary; // #5f6368
  }
};

export const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDuration = (duration) => {
  if (!duration) return 'N/A';
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${Math.round(duration / 1000)}s`;
  return `${Math.round(duration / 60000)}m`;
};

export const getProgressPercentage = (search) => {
  if (search.dailyLimit === 0) return 0;
  return Math.round((search.jobsFoundToday / search.dailyLimit) * 100);
};