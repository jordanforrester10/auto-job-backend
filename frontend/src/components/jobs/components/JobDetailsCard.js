// src/components/jobs/components/JobDetailsCard.js
import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider
} from '@mui/material';
import {
  Work as WorkIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';

const JobDetailsCard = ({ job }) => {
  return (
    <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
      <CardHeader 
        title="Job Details" 
        avatar={<WorkIcon color="primary" />}
        sx={{ 
          pb: 1, 
          '& .MuiCardHeader-title': { fontWeight: 600 } 
        }}
      />
      <CardContent>
        <List sx={{ '& .MuiListItem-root': { py: 1.5 } }}>
          <ListItem>
            <ListItemIcon>
              <BusinessIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" color="text.secondary">Company</Typography>}
              secondary={<Typography variant="body1" fontWeight={500}>{job.company}</Typography>}
            />
          </ListItem>
          <Divider variant="inset" component="li" />
          
          <ListItem>
            <ListItemIcon>
              <LocationOnIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" color="text.secondary">Location</Typography>}
              secondary={
                <Typography variant="body1" fontWeight={500}>
                  {job.location?.city 
                    ? `${job.location.city}${job.location.state ? `, ${job.location.state}` : ''}`
                    : job.location?.remote ? 'Remote' : 'Location not specified'}
                </Typography>
              }
            />
          </ListItem>
          <Divider variant="inset" component="li" />
          
          <ListItem>
            <ListItemIcon>
              <ScheduleIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" color="text.secondary">Job Type</Typography>}
              secondary={<Typography variant="body1" fontWeight={500}>{job.jobType?.replace('_', ' ') || 'Full-time'}</Typography>}
            />
          </ListItem>
          
          {job.parsedData?.yearsOfExperience && (
            <>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemIcon>
                  <TrendingUpIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" color="text.secondary">Experience Required</Typography>}
                  secondary={
                    <Typography variant="body1" fontWeight={500}>
                      {job.parsedData.yearsOfExperience.minimum || 0}
                      {job.parsedData.yearsOfExperience.preferred && job.parsedData.yearsOfExperience.preferred !== job.parsedData.yearsOfExperience.minimum 
                        ? `-${job.parsedData.yearsOfExperience.preferred}` 
                        : '+'} years
                    </Typography>
                  }
                />
              </ListItem>
            </>
          )}
          
          {job.salary?.min && (
            <>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemIcon>
                  <AttachMoneyIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" color="text.secondary">Salary Range</Typography>}
                  secondary={
                    <Typography variant="body1" fontWeight={500}>
                      {`${job.salary.currency || '$'}${job.salary.min}${job.salary.max ? ` - ${job.salary.max}` : '+'}`}
                    </Typography>
                  }
                />
              </ListItem>
            </>
          )}
        </List>
      </CardContent>
    </Card>
  );
};

export default JobDetailsCard;