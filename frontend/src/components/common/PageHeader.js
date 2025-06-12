// src/components/common/PageHeader.js
import React from 'react';
import { Typography, Box, Paper, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const PageHeader = ({ title, breadcrumbs }) => {
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        backgroundColor: 'background.default', 
        padding: 2, 
        marginBottom: 3,
        borderRadius: 1
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>
      
      {breadcrumbs && (
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" color="inherit">
            Dashboard
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index === breadcrumbs.length - 1 ? (
                <Typography color="text.primary">{crumb.label}</Typography>
              ) : (
                <Link component={RouterLink} to={crumb.link} color="inherit">
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </Breadcrumbs>
      )}
    </Paper>
  );
};

export default PageHeader;