import { Box, Card, CardContent, Chip, Grid, Typography, useTheme } from '@mui/material';
import React from 'react';
import { Card as CardType } from '../../types';
import { getStatusColor } from './statusColors';

interface CardsRendererProps {
  cards: CardType[];
}

export default function CardsRenderer({ cards }: CardsRendererProps) {
  const theme = useTheme();

  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <Grid container spacing={2}>
      {cards.map(card => (
        <Grid item xs={12} md={6} lg={4} key={card.id}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              borderLeft: `4px solid ${getStatusColor(theme, card.status)}`,
            }}
          >
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {card.title}
              </Typography>
              {card.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {card.description}
                </Typography>
              )}
              {card.tags && card.tags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {card.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
