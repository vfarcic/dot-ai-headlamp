import { Icon } from '@iconify/react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { askKnowledge } from '../api/endpoints';
import type { KnowledgeResult } from '../api/types';
import { DotAiError } from '../api/types';

function getErrorMessage(error: DotAiError): string {
  switch (error.errorType) {
    case 'service-not-found':
      return 'dot-ai service not found in cluster. Check plugin settings.';
    case 'auth':
      return 'Permission denied. Check your Kubernetes RBAC configuration.';
    case 'timeout':
      return 'Query timed out. The cluster may be under heavy load.';
    case 'network':
      return 'Network error. Check connectivity to the cluster.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

export default function KnowledgeSearchAction() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DotAiError | null>(null);
  const [result, setResult] = useState<KnowledgeResult | null>(null);

  function handleOpen(e: React.MouseEvent<HTMLElement>) {
    setAnchorEl(e.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  async function handleSubmit() {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await askKnowledge(trimmed);
      setResult(data);
    } catch (err) {
      if (err instanceof DotAiError) {
        setError(err);
      } else {
        setError(
          new DotAiError(
            err instanceof Error ? err.message : 'Unknown error',
            0,
            'network'
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const truncatedAnswer =
    result?.answer && result.answer.length > 300
      ? result.answer.slice(0, 300) + '...'
      : result?.answer;

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Icon icon="mdi:magnify" />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, width: 400 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              fullWidth
              placeholder="Search knowledge base..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              size="small"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <Button variant="contained" onClick={handleSubmit} disabled={!query.trim() || loading}>
              Search
            </Button>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Searching knowledge base...</Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {getErrorMessage(error)}
            </Alert>
          )}

          {result && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {truncatedAnswer}
              </Typography>

              {result.sources && result.sources.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  {result.sources.map((source, i) => (
                    <Link
                      key={i}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      display="block"
                      variant="caption"
                    >
                      {source.title || source.uri}
                    </Link>
                  ))}
                </Box>
              )}

              <Button
                size="small"
                onClick={() => {
                  handleClose();
                  window.location.assign(
                    `/dot-ai/knowledge?q=${encodeURIComponent(query)}`
                  );
                }}
              >
                View Full Results
              </Button>
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}
