import { Icon } from '@iconify/react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import React from 'react';

interface InsightsPanelProps {
  sessionId: string;
  insights: string[];
  toolsUsed?: string[];
}

export default function InsightsPanel({ sessionId, insights, toolsUsed }: InsightsPanelProps) {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<Icon icon="mdi:chevron-down" />}>
        <Typography variant="subtitle2">Insights</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Session: {sessionId}
        </Typography>
        <List dense disablePadding>
          {insights.map((insight, index) => (
            <ListItem key={index} disableGutters>
              <ListItemText primary={insight} />
            </ListItem>
          ))}
        </List>
        {toolsUsed && toolsUsed.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, alignSelf: 'center' }}>
              Tools:
            </Typography>
            {toolsUsed.map(tool => (
              <Chip key={tool} label={tool} size="small" variant="outlined" />
            ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
