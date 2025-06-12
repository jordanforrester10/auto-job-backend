// src/components/jobs/components/AiSearchTableRow.js
import React from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  Chip,
  Badge,
  LinearProgress,
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  Description as DescriptionIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { getStatusColor, getStatusIcon, getProgressPercentage, formatDate } from '../utils/searchUtils';

const AiSearchTableRow = ({ 
  search, 
  expanded, 
  onToggleExpansion, 
  onPauseResume, 
  onDelete, 
  onViewDetails, 
  actionLoading 
}) => {
  const theme = useTheme();

  return (
    <TableRow 
      sx={{ 
        '&:hover': { 
          backgroundColor: 'rgba(0, 0, 0, 0.04)' 
        },
        transition: 'background-color 0.2s'
      }}
    >
      <TableCell>
        <Tooltip title={expanded ? 'Hide AI Reasoning' : 'Show AI Reasoning'}>
          <IconButton
            size="small"
            onClick={() => onToggleExpansion(search._id)}
            sx={{ 
              backgroundColor: 'rgba(26, 115, 232, 0.08)',
              '&:hover': { backgroundColor: 'rgba(26, 115, 232, 0.15)' }
            }}
          >
            {expanded ? 
              <VisibilityOffIcon fontSize="small" /> : 
              <VisibilityIcon fontSize="small" />
            }
          </IconButton>
        </Tooltip>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DescriptionIcon 
            color="primary" 
            fontSize="small" 
            sx={{ mr: 1, opacity: 0.7 }} 
          />
          <Typography variant="body2" fontWeight={500}>
            {search.resumeName}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {search.searchCriteria.jobTitle}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            <LocationIcon 
              fontSize="small" 
              sx={{ mr: 0.5, color: theme.palette.text.secondary, fontSize: '0.875rem' }} 
            />
            <Typography variant="caption" color="text.secondary">
              {search.searchCriteria.location}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          icon={getStatusIcon(search.status)}
          label={search.status}
          color={getStatusColor(search.status)}
          size="small"
          sx={{ 
            fontWeight: 500,
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.08)'
          }}
        />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={getProgressPercentage(search)}
              color={search.status === 'running' ? 'primary' : 'inherit'}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  backgroundImage: search.status === 'running' 
                    ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`
                    : undefined
                }
              }}
            />
          </Box>
          <Typography 
            variant="caption" 
            fontWeight={500}
            sx={{ 
              minWidth: '45px', 
              textAlign: 'right',
              color: search.jobsFoundToday >= search.dailyLimit 
                ? theme.palette.success.main 
                : 'inherit'
            }}
          >
            {search.jobsFoundToday}/{search.dailyLimit}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Badge 
          badgeContent={search.totalJobsFound} 
          color="primary"
          sx={{ 
            '& .MuiBadge-badge': { 
              fontWeight: 600,
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <WorkIcon color="action" />
        </Badge>
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="caption" fontWeight={500}>
            {formatDate(search.lastUpdated)}
          </Typography>
          {search.lastUpdateMessage && (
            <Typography 
              variant="caption" 
              display="block" 
              color="text.secondary"
              sx={{ 
                mt: 0.5,
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {search.lastUpdateMessage}
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell align="right">
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              color="primary"
              onClick={() => onViewDetails(search)}
              sx={{ 
                backgroundColor: 'rgba(26, 115, 232, 0.08)',
                '&:hover': { backgroundColor: 'rgba(26, 115, 232, 0.15)' }
              }}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {(search.status === 'running' || search.status === 'paused') && (
            <Tooltip title={search.status === 'running' ? 'Pause' : 'Resume'}>
              <IconButton
                size="small"
                color={search.status === 'running' ? 'warning' : 'success'}
                onClick={() => onPauseResume(search._id, search.status)}
                disabled={actionLoading[search._id]}
                sx={{ 
                  backgroundColor: search.status === 'running' 
                    ? 'rgba(251, 188, 4, 0.08)'
                    : 'rgba(52, 168, 83, 0.08)',
                  '&:hover': { 
                    backgroundColor: search.status === 'running' 
                      ? 'rgba(251, 188, 4, 0.15)'
                      : 'rgba(52, 168, 83, 0.15)'
                  }
                }}
              >
                {actionLoading[search._id] ? (
                  <CircularProgress size={20} />
                ) : search.status === 'running' ? (
                  <PauseIcon fontSize="small" />
                ) : (
                  <PlayIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Cancel Search">
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(search)}
              disabled={actionLoading[search._id]}
              sx={{ 
                backgroundColor: 'rgba(234, 67, 53, 0.08)',
                '&:hover': { backgroundColor: 'rgba(234, 67, 53, 0.15)' }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default AiSearchTableRow;