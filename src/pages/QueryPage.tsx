import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';
import { queryCluster } from '../api/endpoints';
import type { QueryResult } from '../api/types';
import { DotAiError } from '../api/types';
import InsightsPanel from '../components/InsightsPanel';
import TabContainer from '../components/TabContainer';

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

export default function QueryPage() {
  const [intent, setIntent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DotAiError | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);

  async function handleSubmit() {
    const trimmed = intent.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await queryCluster(trimmed);
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

  return (
    <SectionBox title="Query">
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Ask about your cluster..."
          value={intent}
          onChange={e => setIntent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          size="small"
        />
        <Button variant="contained" onClick={handleSubmit} disabled={!intent.trim() || loading}>
          Query
        </Button>
      </Box>

      {loading && <Loader title="Querying cluster..." />}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            error.isRetryable ? (
              <Button color="inherit" size="small" onClick={handleSubmit}>
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
          {result.title && (
            <Typography variant="h6" sx={{ mb: 2 }}>
              {result.title}
            </Typography>
          )}
          <TabContainer visualizations={result.visualizations} />
          {(!result.visualizations || result.visualizations.length === 0) &&
            (!result.insights || result.insights.length === 0) && (
              <Alert severity="info">Query completed but returned no visualizations.</Alert>
            )}
          <Box sx={{ mt: 2 }}>
            <InsightsPanel
              sessionId={result.sessionId}
              insights={result.insights}
              toolsUsed={result.toolsUsed}
            />
          </Box>
        </Box>
      )}
    </SectionBox>
  );
}
