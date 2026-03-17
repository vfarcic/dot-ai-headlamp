import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Button, Chip, Collapse, Link, List, ListItem, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { askKnowledge } from '../api/endpoints';
import type { KnowledgeResult } from '../api/types';
import { DotAiError } from '../api/types';
import MarkdownRenderer from '../components/renderers/MarkdownRenderer';

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

export default function KnowledgePage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DotAiError | null>(null);
  const [result, setResult] = useState<KnowledgeResult | null>(null);
  const [showChunks, setShowChunks] = useState(false);

  async function handleSubmit(searchQuery?: string) {
    const trimmed = (searchQuery ?? query).trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowChunks(false);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      handleSubmit(q);
    }
  }, []);

  return (
    <SectionBox title="Knowledge">
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search knowledge base..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          size="small"
        />
        <Button variant="contained" onClick={() => handleSubmit()} disabled={!query.trim() || loading}>
          Search
        </Button>
      </Box>

      {loading && <Loader title="Searching knowledge base..." />}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            error.isRetryable ? (
              <Button color="inherit" size="small" onClick={() => handleSubmit()}>
                Retry
              </Button>
            ) : undefined
          }
        >
          {getErrorMessage(error)}
        </Alert>
      )}

      {result && (
        <Box>
          <MarkdownRenderer>{result.answer}</MarkdownRenderer>

          {result.sources && result.sources.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Sources
              </Typography>
              <List dense>
                {result.sources.map((source, i) => (
                  <ListItem key={i}>
                    <Link href={source.uri} target="_blank" rel="noopener noreferrer">
                      {source.title || source.uri}
                    </Link>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {result.chunks && result.chunks.length > 0 && (
            <Box>
              <Button size="small" onClick={() => setShowChunks(!showChunks)}>
                {showChunks ? 'Hide chunks' : 'Show chunks'}
              </Button>
              <Collapse in={showChunks}>
                {[...result.chunks]
                  .sort((a, b) => b.score - a.score)
                  .map((chunk, i) => (
                    <Box key={i} sx={{ mt: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {chunk.uri}
                        </Typography>
                        <Chip label={`Score: ${chunk.score.toFixed(2)}`} size="small" />
                      </Box>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {chunk.content}
                      </Typography>
                    </Box>
                  ))}
              </Collapse>
            </Box>
          )}
        </Box>
      )}
    </SectionBox>
  );
}
