import { Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { analyzeIssue, executeRemediation } from '../api/endpoints';
import type { RemediateResult } from '../api/types';
import { DotAiError } from '../api/types';

function getRiskColor(risk: string): 'error' | 'warning' | 'success' {
  switch (risk) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    default:
      return 'success';
  }
}

interface RemediateDetailSectionProps {
  resource: {
    kind: string;
    getName(): string;
    getNamespace(): string;
  };
}

export default function RemediateDetailSection({ resource }: RemediateDetailSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<DotAiError | null>(null);
  const [result, setResult] = useState<RemediateResult | null>(null);

  const resourceDesc = `${resource.kind} ${resource.getName()}${resource.getNamespace() ? ` in namespace ${resource.getNamespace()}` : ''}`;

  async function handleAnalyze() {
    setExpanded(true);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeIssue(`Analyze issues with ${resourceDesc}`);
      setResult(data);
    } catch (err) {
      if (err instanceof DotAiError) {
        setError(err);
      } else {
        setError(
          new DotAiError(err instanceof Error ? err.message : 'Unknown error', 0, 'network')
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExecute(choiceId: number) {
    if (!result?.sessionId || executing) return;

    setExecuting(true);
    setError(null);

    try {
      const data = await executeRemediation(result.sessionId, choiceId);
      setResult(data);
    } catch (err) {
      if (err instanceof DotAiError) {
        setError(err);
      } else {
        setError(
          new DotAiError(err instanceof Error ? err.message : 'Unknown error', 0, 'network')
        );
      }
    } finally {
      setExecuting(false);
    }
  }

  return (
    <Box>
      {!expanded && !result && (
        <Button variant="outlined" size="small" onClick={handleAnalyze} disabled={loading}>
          Analyze Issues
        </Button>
      )}

      {loading && <Loader title="Analyzing..." />}
      {executing && <Loader title="Executing remediation..." />}

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error.message}
        </Alert>
      )}

      <Collapse in={!!result}>
        {result && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {/* Analysis */}
            {result.analysis && (
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                  Root Cause
                </Typography>
                <Typography variant="body2">{result.analysis.rootCause}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Confidence:
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={result.analysis.confidence * 100}
                    sx={{ flexGrow: 1, maxWidth: 150, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption">
                    {Math.round(result.analysis.confidence * 100)}%
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Remediation Summary */}
            {result.remediation && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Remediation
                  </Typography>
                  <Chip
                    label={`Risk: ${result.remediation.risk}`}
                    color={getRiskColor(result.remediation.risk)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2">{result.remediation.summary}</Typography>
              </Box>
            )}

            {/* Execution Choices */}
            {result.executionChoices &&
              result.executionChoices.length > 0 &&
              result.status === 'awaiting_user_approval' && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {result.executionChoices.map(choice => (
                    <Button
                      key={choice.id}
                      variant={choice.risk === 'high' ? 'outlined' : 'contained'}
                      color={choice.risk ? getRiskColor(choice.risk) : 'primary'}
                      size="small"
                      onClick={() => handleExecute(choice.id)}
                      disabled={executing}
                    >
                      {choice.label}
                    </Button>
                  ))}
                </Box>
              )}

            {/* Execution Results */}
            {result.results &&
              result.results.length > 0 &&
              result.results.map((res, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label={res.success ? 'Success' : 'Failed'}
                      color={res.success ? 'success' : 'error'}
                      size="small"
                    />
                    <Typography variant="body2">{res.action}</Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      bgcolor: 'background.default',
                      p: 1,
                      borderRadius: 1,
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      m: 0,
                    }}
                  >
                    {res.output}
                  </Typography>
                </Paper>
              ))}

            {/* Validation */}
            {result.validation && (
              <Alert severity={result.validation.success ? 'success' : 'warning'} sx={{ py: 0 }}>
                {result.validation.summary}
              </Alert>
            )}

            {/* Message */}
            {result.message && (
              <Typography variant="body2" color="text.secondary">
                {result.message}
              </Typography>
            )}

            {/* Re-analyze button */}
            {result.status !== 'awaiting_user_approval' && (
              <Button variant="outlined" size="small" onClick={handleAnalyze} sx={{ alignSelf: 'flex-start' }}>
                Re-analyze
              </Button>
            )}
          </Box>
        )}
      </Collapse>
    </Box>
  );
}
