// src/components/jobs/components/SkillChip.js
import React from 'react';
import {
  Chip,
  Tooltip,
  Box,
  Typography,
  useTheme
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const SkillChip = ({ skill, isMatched, importance, matchQuality }) => {
  const theme = useTheme();
  
  // Extract skill name safely from different skill object structures
  const getSkillName = (skillObj) => {
    if (!skillObj) return 'Unknown Skill';
    if (typeof skillObj === 'string') return skillObj;
    if (typeof skillObj === 'object') {
      return skillObj.name || skillObj.skill || (skillObj.toString && typeof skillObj.toString === 'function' ? skillObj.toString() : 'Unknown Skill');
    }
    return 'Unknown Skill';
  };

  const skillName = getSkillName(skill);
  
  const getImportanceColor = (imp) => {
    if (!imp && imp !== 0) return theme.palette.info.main;
    if (imp >= 8) return theme.palette.error.main;
    if (imp >= 6) return theme.palette.warning.main;
    return theme.palette.info.main;
  };

  const getMatchQualityIcon = (quality) => {
    if (!quality) return null;
    switch (quality) {
      case 'exact': return <CheckCircleIcon fontSize="small" />;
      case 'partial': return <WarningIcon fontSize="small" />;
      case 'related': return <InfoIcon fontSize="small" />;
      default: return null;
    }
  };

  return (
    <Tooltip 
      title={
        <Box>
          <Typography variant="body2" fontWeight="bold">{skillName}</Typography>
          {importance && <Typography variant="caption">Importance: {importance}/10</Typography>}
          {matchQuality && <Typography variant="caption" display="block">Match: {matchQuality}</Typography>}
        </Box>
      }
    >
      <Chip 
        label={skillName}
        icon={isMatched ? getMatchQualityIcon(matchQuality) : null}
        variant={isMatched ? 'filled' : 'outlined'}
        color={isMatched ? 'success' : 'default'}
        size="medium"
        sx={{ 
          bgcolor: isMatched ? `${theme.palette.success.main}30` : 'transparent',
          color: isMatched ? theme.palette.success.dark : theme.palette.text.primary,
          fontWeight: 500,
          borderRadius: 2,
          border: isMatched 
            ? `2px solid ${theme.palette.success.main}` 
            : `1px solid ${getImportanceColor(importance || 5)}40`,
          borderLeftWidth: 4,
          borderLeftColor: getImportanceColor(importance || 5),
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: 2,
            bgcolor: isMatched ? `${theme.palette.success.main}40` : `${getImportanceColor(importance || 5)}10`,
          }
        }}
      />
    </Tooltip>
  );
};

export default SkillChip;