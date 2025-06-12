// src/components/resumes/components/TabPanel.js
import React from 'react';
import { Box } from '@mui/material';

/**
 * Generic tab panel wrapper component
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Tab content
 * @param {number} props.value - Current tab value
 * @param {number} props.index - Tab index
 * @returns {JSX.Element} Tab panel component
 */
const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`resume-tabpanel-${index}`}
    aria-labelledby={`resume-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export default TabPanel;