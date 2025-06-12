// src/components/jobs/components/AiSearchExpandableRow.js
import React from 'react';
import {
  TableRow,
  TableCell,
  Collapse,
  Box,
  Typography,
  Chip,
  useTheme
} from '@mui/material';
import AutoJobLogo from '../../common/AutoJobLogo';
import AiReasoningLogs from './AiReasoningLogs';

const AiSearchExpandableRow = ({ search, expanded }) => {
  const theme = useTheme();

  return (
    <TableRow>
      <TableCell 
        style={{ paddingBottom: 0, paddingTop: 0 }} 
        colSpan={8}
      >
        <Collapse 
          in={expanded} 
          timeout="auto" 
          unmountOnExit
        >
          <Box sx={{ 
            margin: 2, 
            backgroundColor: 'rgba(26, 115, 232, 0.02)',
            borderRadius: 2,
            border: '1px solid rgba(26, 115, 232, 0.1)'
          }}>
            <Box sx={{ 
              p: 2.5, 
              borderBottom: '1px solid rgba(26, 115, 232, 0.1)',
              backgroundColor: 'rgba(26, 115, 232, 0.05)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AutoJobLogo 
                  variant="icon-only" 
                  size="small" 
                  sx={{ width: 28, height: 28 }}
                />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    AI Search Reasoning & Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Detailed step-by-step AI reasoning and decision-making process
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Chip 
                    label={`${search.reasoningLogs?.length || 0} logs`}
                    size="small" 
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 500 }}
                  />
                </Box>
              </Box>
            </Box>
            
            <AiReasoningLogs search={search} />
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
};

export default AiSearchExpandableRow;