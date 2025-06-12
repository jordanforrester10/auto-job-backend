// src/components/jobs/components/AiReasoningLogs.js
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
  Speed as SpeedIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import AutoJobLogo from '../../common/AutoJobLogo';
import { getReasoningIcon, getReasoningColor, formatDate, formatDuration } from '../utils/searchUtils';

const AiReasoningLogs = ({ search }) => {
  const theme = useTheme();

  if (!search.reasoningLogs || search.reasoningLogs.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No reasoning logs available for this search yet.
        </Typography>
      </Box>
    );
  }

  // Sort logs by timestamp, most recent first
  const sortedLogs = [...search.reasoningLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return (
    <Box sx={{ maxHeight: 400, overflow: 'auto', p: 2 }}>
      <Stack spacing={2}>
        {sortedLogs.slice(0, 10).map((log, index) => (
          <Paper 
            key={index}
            elevation={1} 
            sx={{ 
              p: 2.5, 
              backgroundColor: log.success === false ? 'rgba(234, 67, 53, 0.04)' : 
                             log.success === true ? 'rgba(52, 168, 83, 0.04)' : 
                             'rgba(0, 0, 0, 0.02)',
              border: `1px solid ${log.success === false ? 'rgba(234, 67, 53, 0.2)' : 
                                  log.success === true ? 'rgba(52, 168, 83, 0.2)' : 
                                  theme.palette.divider}`,
              borderRadius: 2,
              position: 'relative',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: log.success === false ? 'rgba(234, 67, 53, 0.06)' : 
                               log.success === true ? 'rgba(52, 168, 83, 0.06)' : 
                               'rgba(26, 115, 232, 0.02)',
                borderColor: log.success === false ? 'rgba(234, 67, 53, 0.3)' : 
                            log.success === true ? 'rgba(52, 168, 83, 0.3)' : 
                            'rgba(26, 115, 232, 0.2)',
                transform: 'translateY(-1px)',
                boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.08)'
              }
            }}
          >
            {/* Custom Timeline Connection Line */}
            {index < sortedLogs.slice(0, 10).length - 1 && (
              <Box sx={{
                position: 'absolute',
                left: 18,
                top: 50,
                bottom: -16,
                width: 2,
                backgroundColor: theme.palette.divider,
                zIndex: 0
              }} />
            )}

            <Box sx={{ display: 'flex', gap: 2, position: 'relative', zIndex: 1 }}>
              {/* Custom Avatar Timeline Dot */}
              <Avatar sx={{ 
                width: 36, 
                height: 36,
                backgroundColor: getReasoningColor(log.phase, log.success, theme),
                border: `2px solid ${theme.palette.background.paper}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                '& .MuiSvgIcon-root': {
                  color: theme.palette.background.paper,
                  fontSize: '18px'
                }
              }}>
                {getReasoningIcon(log.phase)}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Header with phase, success indicator, and timestamp */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 600,
                      color: log.success === false ? theme.palette.error.main : 
                             log.success === true ? theme.palette.success.main : 
                             theme.palette.text.primary
                    }}>
                      {log.phase ? log.phase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown Phase'}
                    </Typography>
                    {log.success === true && (
                      <CheckCircleIcon sx={{ fontSize: '16px', color: theme.palette.success.main }} />
                    )}
                    {log.success === false && (
                      <ErrorIcon sx={{ fontSize: '16px', color: theme.palette.error.main }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimeIcon sx={{ fontSize: '12px', color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(log.timestamp)}
                      </Typography>
                    </Box>
                    {log.duration && log.duration > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <SpeedIcon sx={{ fontSize: '12px', color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatDuration(log.duration)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Message */}
                <Typography variant="body2" sx={{ 
                  mb: 1.5, 
                  lineHeight: 1.5,
                  color: log.success === false ? theme.palette.error.dark : theme.palette.text.primary
                }}>
                  {log.message}
                </Typography>
                
                {/* Details/Metadata Accordion */}
                {((log.details && Object.keys(log.details).length > 0) || 
                  (log.metadata && Object.keys(log.metadata).length > 0)) && (
                  <Accordion 
                    elevation={0} 
                    sx={{ 
                      backgroundColor: 'transparent',
                      '&:before': { display: 'none' },
                      '& .MuiAccordionSummary-root': {
                        minHeight: 'auto',
                        padding: 0,
                        '& .MuiAccordionSummary-content': { 
                          margin: '8px 0',
                          '&.Mui-expanded': { margin: '8px 0' }
                        }
                      }
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ fontSize: '18px', color: theme.palette.primary.main }} />}
                    >
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
                        View Technical Details
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" fontWeight={600} color="primary.main">
                            Details:
                          </Typography>
                          <Box component="pre" sx={{ 
                            fontSize: '0.75rem', 
                            backgroundColor: theme.palette.background.default, 
                            p: 1.5, 
                            borderRadius: 1,
                            overflow: 'auto',
                            maxHeight: 150,
                            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.4,
                            border: `1px solid ${theme.palette.divider}`,
                            mt: 1
                          }}>
                            {JSON.stringify(log.details, null, 2)}
                          </Box>
                        </Box>
                      )}
                      
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <Box>
                          <Typography variant="caption" fontWeight={600} color="secondary.main">
                            Metadata:
                          </Typography>
                          <Box component="pre" sx={{ 
                            fontSize: '0.75rem', 
                            backgroundColor: theme.palette.background.default, 
                            p: 1.5, 
                            borderRadius: 1,
                            overflow: 'auto',
                            maxHeight: 150,
                            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.4,
                            border: `1px solid ${theme.palette.divider}`,
                            mt: 1
                          }}>
                            {JSON.stringify(log.metadata, null, 2)}
                          </Box>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>
      
      {sortedLogs.length > 10 && (
        <Box sx={{ textAlign: 'center', mt: 3, p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ 
            fontStyle: 'italic',
            backgroundColor: theme.palette.background.default,
            px: 2,
            py: 1,
            borderRadius: 1,
            border: `1px dashed ${theme.palette.divider}`
          }}>
            Showing latest 10 of {sortedLogs.length} reasoning logs
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AiReasoningLogs;