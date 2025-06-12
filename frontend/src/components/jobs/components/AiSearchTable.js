// src/components/jobs/components/AiSearchTable.js
import React from 'react';
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper
} from '@mui/material';
import AiSearchTableRow from './AiSearchTableRow';
import AiSearchExpandableRow from './AiSearchExpandableRow';

const AiSearchTable = ({ 
  searches, 
  expandedRows, 
  onToggleExpansion, 
  onPauseResume, 
  onDelete, 
  onViewDetails, 
  actionLoading 
}) => {
  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        borderRadius: 2, 
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'rgba(26, 115, 232, 0.08)' }}>
            <TableCell sx={{ fontWeight: 600, width: 50 }}>Details</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Resume</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Search Criteria</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Progress Today</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Total Found</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Last Update</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {searches.map((search) => (
            <React.Fragment key={search._id}>
              <AiSearchTableRow
                search={search}
                expanded={expandedRows[search._id]}
                onToggleExpansion={onToggleExpansion}
                onPauseResume={onPauseResume}
                onDelete={onDelete}
                onViewDetails={onViewDetails}
                actionLoading={actionLoading}
              />
              <AiSearchExpandableRow
                search={search}
                expanded={expandedRows[search._id]}
              />
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AiSearchTable;