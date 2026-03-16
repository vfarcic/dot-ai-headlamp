import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { analyzeIssue, executeRemediation } from '../api/endpoints';
import type { RemediateResult } from '../api/types';
import { DotAiError } from '../api/types';

function getErrorMessage(error: DotAiError): string {
  switch (error.errorType) {
    case 'service-not-found':
      return 'dot-ai service not found in cluster. Check plugin settings.';
    case 'auth':
      return 'Permission denied. Check your Kubernetes RBAC configuration.';
    case 'timeout':
      return 'Request timed out. The cluster may be under heavy load.';
    case 'network':
      return 'Network error. Check connectivity to the cluster.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

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

interface RemediatePageProps {
  prefillIssue?: string;
}

export default function RemediatePage({ prefillIssue }: RemediatePageProps) {
  const [issue, setIssue] = useState(prefillIssue || '');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<DotAiError | null>(null);
  const [result, setResult] = useState<RemediateResult | null>(null);

  async function handleAnalyze() {
    const trimmed = issue.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeIssue(trimmed);
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  }

  return (
    <SectionBox title="Remediate">
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Describe the issue to analyze..."
          value={issue}
          onChange={e => setIssue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || executing}
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleAnalyze}
          disabled={!issue.trim() || loading || executing}
        >
          Analyze
        </Button>
      </Box>

      {loading && <Loader title="Analyzing issue..." />}
      {executing && <Loader title="Executing remediation..." />}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            error.isRetryable ? (
              <Button color="inherit" size="small" onClick={handleAnalyze}>
                Retry
              </Button>
            ) : undefined
          }
        >
          {getErrorMessage(error)}
        </Alert>
      )}

      {result && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Analysis Section */}
          {result.analysis && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Root Cause Analysis
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {result.analysis.rootCause}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Confidence:
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={result.analysis.confidence * 100}
                  sx={{ flexGrow: 1, maxWidth: 200, height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption">
                  {Math.round(result.analysis.confidence * 100)}%
                </Typography>
              </Box>
              {result.analysis.factors.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Contributing factors:
                  </Typography>
                  <List dense disablePadding>
                    {result.analysis.factors.map((factor, i) => (
                      <ListItem key={i} disableGutters sx={{ py: 0 }}>
                        <ListItemText primary={factor} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Paper>
          )}

          {/* Remediation Plan */}
          {result.remediation && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1">Remediation Plan</Typography>
                <Chip
                  label={`Risk: ${result.remediation.risk}`}
                  color={getRiskColor(result.remediation.risk)}
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {result.remediation.summary}
              </Typography>
              {result.remediation.actions.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Actions:
                  </Typography>
                  {result.remediation.actions.map((action, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'action.hover' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {action.description}
                        </Typography>
                        <Chip
                          label={action.risk}
                          color={getRiskColor(action.risk)}
                          size="small"
                          variant="outlined"
                        />
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
                          fontSize: '0.8rem',
                          m: 0,
                        }}
                      >
                        {action.command}
                      </Typography>
                      {action.rationale && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {action.rationale}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}
            </Paper>
          )}

          {/* Execution Choices */}
          {result.executionChoices && result.executionChoices.length > 0 && result.status === 'awaiting_user_approval' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Choose Action
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {result.executionChoices.map(choice => (
                  <Button
                    key={choice.id}
                    variant={choice.risk === 'high' ? 'outlined' : 'contained'}
                    color={choice.risk ? getRiskColor(choice.risk) : 'primary'}
                    onClick={() => handleExecute(choice.id)}
                    disabled={executing}
                  >
                    {choice.label}
                  </Button>
                ))}
              </Box>
              {result.executionChoices.some(c => c.description) && (
                <List dense disablePadding sx={{ mt: 1 }}>
                  {result.executionChoices
                    .filter(c => c.description)
                    .map(choice => (
                      <ListItem key={choice.id} disableGutters sx={{ py: 0 }}>
                        <ListItemText
                          primary={`${choice.label}: ${choice.description}`}
                          primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                        />
                      </ListItem>
                    ))}
                </List>
              )}
            </Paper>
          )}

          {/* Execution Results */}
          {result.results && result.results.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Execution Results
              </Typography>
              {result.results.map((res, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
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
                      fontSize: '0.8rem',
                      m: 0,
                    }}
                  >
                    {res.output}
                  </Typography>
                </Paper>
              ))}
            </Paper>
          )}

          {/* Validation */}
          {result.validation && (
            <Alert severity={result.validation.success ? 'success' : 'warning'}>
              {result.validation.summary}
            </Alert>
          )}

          {/* Status Message */}
          {result.message && (
            <Alert severity="info">{result.message}</Alert>
          )}

          {/* Guidance */}
          {result.guidance && (
            <Typography variant="body2" color="text.secondary">
              {result.guidance}
            </Typography>
          )}
        </Box>
      )}
    </SectionBox>
  );
}
