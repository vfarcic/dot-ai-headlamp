import { Box, Typography, useTheme } from '@mui/material';
import React from 'react';
import { BarChartContent } from '../../types';
import { getStatusBackground, getStatusColor } from './statusColors';

interface BarChartRendererProps {
  content: BarChartContent;
}

export default function BarChartRenderer({ content }: BarChartRendererProps) {
  const theme = useTheme();
  const { data, title, unit, orientation = 'horizontal' } = content;

  if (!data || data.length === 0) {
    return null;
  }

  const maxValue = Math.max(...data.map(bar => bar.value));

  const getPercentage = (bar: { value: number; max?: number }) => {
    const max = bar.max ?? maxValue;
    if (max === 0) return 0;
    return Math.min((bar.value / max) * 100, 100);
  };

  const formatValue = (value: number, max?: number) => {
    const parts = [String(value)];
    if (max !== undefined) parts.push(`/ ${max}`);
    if (unit) parts.push(unit);
    return parts.join(' ');
  };

  if (orientation === 'vertical') {
    return (
      <Box>
        {title && (
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 200 }}>
          {data.map(bar => {
            const pct = getPercentage(bar);
            const color = getStatusColor(theme, bar.status);
            const bg = getStatusBackground(theme, bar.status);
            return (
              <Box
                key={bar.label}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <Typography variant="caption" sx={{ mb: 0.5 }}>
                  {formatValue(bar.value, bar.max)}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 60,
                    height: `${pct}%`,
                    minHeight: pct > 0 ? 4 : 0,
                    backgroundColor: bg,
                    borderRadius: 1,
                    border: `1px solid ${color}`,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {bar.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {title && (
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {data.map(bar => {
          const pct = getPercentage(bar);
          const color = getStatusColor(theme, bar.status);
          return (
            <Box key={bar.label}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{bar.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatValue(bar.value, bar.max)}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: '100%',
                  height: 8,
                  backgroundColor: theme.palette.action.hover,
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: 1,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
