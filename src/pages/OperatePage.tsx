import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { executeOperation, operateCluster } from '../api/endpoints';
import type { OperateResult } from '../api/types';
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

interface OperatePageProps {
  prefillIntent?: string;
}

export default function OperatePage({ prefillIntent }: OperatePageProps) {
  const [intent, setIntent] = useState(prefillIntent || '');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<DotAiError | null>(null);
  const [result, setResult] = useState<OperateResult | null>(null);

  async function handlePlan() {
    const trimmed = intent.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await operateCluster(trimmed);
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
      const data = await executeOperation(result.sessionId, choiceId);
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
      handlePlan();
    }
  }

  const analysis = result?.analysis;
  const executionChoices = result?.executionChoices ??
    (result?.status === 'awaiting_user_approval'
      ? [{ id: 1, label: 'Execute automatically', description: 'Apply the proposed changes to the cluster' }]
      : undefined);
  const proposedChanges = analysis?.proposedChanges;
  const creates = proposedChanges?.create ?? [];
  const updates = proposedChanges?.update ?? [];
  const deletes = proposedChanges?.delete ?? [];

  return (
    <SectionBox title="Operate">
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Describe the operation to perform..."
          value={intent}
          onChange={e => setIntent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || executing}
          size="small"
        />
        <Button
          variant="contained"
          onClick={handlePlan}
          disabled={!intent.trim() || loading || executing}
        >
          Plan
        </Button>
      </Box>

      {loading && <Loader title="Planning operation..." />}
      {executing && <Loader title="Executing operation..." />}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            error.isRetryable ? (
              <Button color="inherit" size="small" onClick={handlePlan}>
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
          {/* Summary */}
          {analysis?.summary && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Summary
              </Typography>
              <Typography variant="body2">{analysis.summary}</Typography>
            </Paper>
          )}

          {/* Current State */}
          {analysis?.currentState?.resources && analysis.currentState.resources.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Current State
              </Typography>
              <List dense disablePadding>
                {analysis.currentState.resources.map((res, i) => (
                  <ListItem key={i} disableGutters sx={{ py: 0 }}>
                    <ListItemText
                      primary={`${res.kind} ${res.name}${res.namespace ? ` (${res.namespace})` : ''}`}
                      secondary={res.summary}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* Proposed Changes */}
          {(creates.length > 0 || updates.length > 0 || deletes.length > 0) && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Proposed Changes
              </Typography>
              {[
                { label: 'Create', items: creates, color: 'success' as const },
                { label: 'Update', items: updates, color: 'warning' as const },
                { label: 'Delete', items: deletes, color: 'error' as const },
              ]
                .filter(group => group.items.length > 0)
                .map(group => (
                  <Box key={group.label} sx={{ mb: 1.5 }}>
                    <Chip label={group.label} color={group.color} size="small" sx={{ mb: 0.5 }} />
                    {group.items.map((change, i) => (
                      <Paper
                        key={i}
                        variant="outlined"
                        sx={{ p: 1.5, mb: 1, bgcolor: 'action.hover' }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {change.kind} {change.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {change.rationale}
                        </Typography>
                        {change.manifest && (
                          <ManifestCollapsible manifest={change.manifest} />
                        )}
                      </Paper>
                    ))}
                  </Box>
                ))}
            </Paper>
          )}

          {/* Commands */}
          {analysis?.commands && analysis.commands.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Commands
              </Typography>
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
                {analysis.commands.join('\n')}
              </Typography>
            </Paper>
          )}

          {/* Dry-Run Validation */}
          {analysis?.dryRunValidation && (
            <Alert severity={analysis.dryRunValidation.status === 'success' ? 'success' : 'error'}>
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                Dry-Run Validation
              </Typography>
              {analysis.dryRunValidation.details}
            </Alert>
          )}

          {/* Risks */}
          {analysis?.risks && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle1">Risks</Typography>
                <Chip
                  label={analysis.risks.level}
                  color={getRiskColor(analysis.risks.level)}
                  size="small"
                />
              </Box>
              <Typography variant="body2">{analysis.risks.description}</Typography>
            </Paper>
          )}

          {/* Metadata */}
          {analysis &&
            (analysis.patternsApplied.length > 0 ||
              analysis.capabilitiesUsed.length > 0 ||
              analysis.policiesChecked.length > 0) && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Metadata
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {analysis.patternsApplied.map((p, i) => (
                    <Chip key={`pattern-${i}`} label={p} size="small" variant="outlined" />
                  ))}
                  {analysis.capabilitiesUsed.map((c, i) => (
                    <Chip
                      key={`cap-${i}`}
                      label={c}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                  {analysis.policiesChecked.map((p, i) => (
                    <Chip
                      key={`policy-${i}`}
                      label={p}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  ))}
                </Box>
              </Paper>
            )}

          {/* Execution Choices */}
          {executionChoices &&
            executionChoices.length > 0 &&
            result.status === 'awaiting_user_approval' && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Choose Action
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {executionChoices.map(choice => (
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
                {executionChoices.some(c => c.description) && (
                  <List dense disablePadding sx={{ mt: 1 }}>
                    {executionChoices
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
          {result.execution?.results && result.execution.results.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Execution Results
              </Typography>
              {result.execution.results.map((res, i) => (
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

          {/* Execution Validation */}
          {result.execution?.validation && (
            <Alert severity="info">{result.execution.validation}</Alert>
          )}

          {/* Message */}
          {result.message && <Alert severity="info">{result.message}</Alert>}

          {/* Next Action */}
          {result.nextAction && (
            <Typography variant="body2" color="text.secondary">
              {result.nextAction}
            </Typography>
          )}
        </Box>
      )}
    </SectionBox>
  );
}

function ManifestCollapsible({ manifest }: { manifest: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ mt: 0.5 }}>
      <Button size="small" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} Manifest
      </Button>
      <Collapse in={open}>
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
            mt: 0.5,
          }}
        >
          {manifest}
        </Typography>
      </Collapse>
    </Box>
  );
}
