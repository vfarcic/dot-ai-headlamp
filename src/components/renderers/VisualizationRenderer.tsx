import { Typography } from '@mui/material';
import React from 'react';
import { Visualization } from '../../types';
import CardsRenderer from './CardsRenderer';
import CodeRenderer from './CodeRenderer';
import MermaidRenderer from './MermaidRenderer';
import TableRenderer from './TableRenderer';

interface VisualizationRendererProps {
  visualization: Visualization;
}

export default function VisualizationRenderer({ visualization }: VisualizationRendererProps) {
  switch (visualization.type) {
    case 'cards':
      return <CardsRenderer cards={visualization.content} />;
    case 'table':
      return <TableRenderer content={visualization.content} />;
    case 'code':
      return <CodeRenderer content={visualization.content} />;
    case 'mermaid':
      return <MermaidRenderer content={visualization.content} />;
    case 'bar-chart':
      return (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          {visualization.type} visualization is not yet supported.
        </Typography>
      );
    default:
      return (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          Unknown visualization type.
        </Typography>
      );
  }
}
