import { Box, Link, Typography } from '@mui/material';
import React from 'react';
import Markdown from 'react-markdown';

interface MarkdownRendererProps {
  children: string;
}

export default function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <Box
      sx={{
        '& h1': { typography: 'h5', mt: 2, mb: 1 },
        '& h2': { typography: 'h6', mt: 2, mb: 1 },
        '& h3': { typography: 'subtitle1', fontWeight: 'bold', mt: 1.5, mb: 0.5 },
        '& p': { typography: 'body2', mb: 1 },
        '& ul, & ol': { pl: 3, mb: 1 },
        '& li': { typography: 'body2', mb: 0.5 },
        '& code': {
          fontFamily: 'monospace',
          bgcolor: 'action.hover',
          px: 0.5,
          borderRadius: 0.5,
          fontSize: '0.85em',
        },
        '& pre': {
          bgcolor: 'action.hover',
          p: 1.5,
          borderRadius: 1,
          overflow: 'auto',
          mb: 1,
          '& code': { bgcolor: 'transparent', p: 0 },
        },
        '& hr': { my: 2, border: 'none', borderTop: '1px solid', borderColor: 'divider' },
        '& blockquote': {
          borderLeft: '3px solid',
          borderColor: 'divider',
          pl: 2,
          ml: 0,
          my: 1,
        },
        '& table': { borderCollapse: 'collapse', width: '100%', mb: 1 },
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          px: 1,
          py: 0.5,
          typography: 'body2',
        },
        '& th': { fontWeight: 'bold', bgcolor: 'action.hover' },
      }}
    >
      <Markdown
        components={{
          a: ({ href, children }) => (
            <Link href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </Link>
          ),
          p: ({ children }) => <Typography variant="body2" paragraph>{children}</Typography>,
        }}
      >
        {children}
      </Markdown>
    </Box>
  );
}
