import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from '@mui/material';
import React from 'react';
import { TableContent } from '../../types';
import { getStatusBackground, getStatusColor } from './statusColors';

interface TableRendererProps {
  content: TableContent;
}

export default function TableRenderer({ content }: TableRendererProps) {
  const theme = useTheme();

  if (!content || !content.headers || content.headers.length === 0) {
    return null;
  }

  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {content.headers.map(header => (
              <TableCell
                key={header}
                sx={{ fontWeight: 'bold', position: 'sticky', top: 0, bgcolor: 'background.paper' }}
              >
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {content.rows.map((row, rowIndex) => {
            const status = content.rowStatuses?.[rowIndex] ?? null;
            return (
              <TableRow
                key={rowIndex}
                sx={{
                  borderLeft: `4px solid ${getStatusColor(theme, status)}`,
                  bgcolor: getStatusBackground(theme, status),
                }}
              >
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
