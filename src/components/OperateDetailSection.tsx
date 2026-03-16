import { Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Paper,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { executeOperation, operateCluster } from '../api/endpoints';
import type { OperateResult } from '../api/types';
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

interface OperateDetailSectionProps {
  resource: {
    kind: string;
    getName(): string;
    getNamespace(): string;
  };
}

export default function OperateDetailSection({ resource }: OperateDetailSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<DotAiError | null>(null);
  const [result, setResult] = useState<OperateResult | null>(null);

  const resourceDesc = `${resource.kind} ${resource.getName()}${resource.getNamespace() ? ` in namespace ${resource.getNamespace()}` : ''}`;

  async function handlePlan() {
    setExpanded(true);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await operateCluster(`Operate on ${resourceDesc}`);
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

  const analysis = result?.analysis;
  const executionChoices = result?.executionChoices ??
    (result?.status === 'awaiting_user_approval'
      ? [{ id: 1, label: 'Execute automatically', description: 'Apply the proposed changes to the cluster' }]
      : undefined);
  const proposedChanges = analysis?.proposedChanges;
  const createCount = proposedChanges?.create?.length ?? 0;
  const updateCount = proposedChanges?.update?.length ?? 0;
  const deleteCount = proposedChanges?.delete?.length ?? 0;

  return (
    <Box>
      {!expanded && !result && (
        <Button variant="outlined" size="small" onClick={handlePlan} disabled={loading}>
          Plan Operation
        </Button>
      )}

      {loading && <Loader title="Planning..." />}
      {executing && <Loader title="Executing operation..." />}

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error.message}
        </Alert>
      )}

      <Collapse in={!!result}>
        {result && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {/* Summary */}
            {analysis?.summary && (
              <Typography variant="body2">{analysis.summary}</Typography>
            )}

            {/* Proposed Changes Count */}
            {(createCount > 0 || updateCount > 0 || deleteCount > 0) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  Proposed Changes:
                </Typography>
                {createCount > 0 && (
                  <Chip label={`${createCount} create`} color="success" size="small" />
                )}
                {updateCount > 0 && (
                  <Chip label={`${updateCount} update`} color="warning" size="small" />
                )}
                {deleteCount > 0 && (
                  <Chip label={`${deleteCount} delete`} color="error" size="small" />
                )}
              </Box>
            )}

            {/* Risk */}
            {analysis?.risks && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`Risk: ${analysis.risks.level}`}
                  color={getRiskColor(analysis.risks.level)}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {analysis.risks.description}
                </Typography>
              </Box>
            )}

            {/* Dry-Run Validation */}
            {analysis?.dryRunValidation && (
              <Alert
                severity={analysis.dryRunValidation.status === 'success' ? 'success' : 'error'}
                sx={{ py: 0 }}
              >
                {analysis.dryRunValidation.details}
              </Alert>
            )}

            {/* Execution Choices */}
            {executionChoices &&
              executionChoices.length > 0 &&
              result.status === 'awaiting_user_approval' && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {executionChoices.map(choice => (
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
            {result.execution?.results &&
              result.execution.results.length > 0 &&
              result.execution.results.map((res, i) => (
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

            {/* Execution Validation */}
            {result.execution?.validation && (
              <Alert severity="info" sx={{ py: 0 }}>
                {result.execution.validation}
              </Alert>
            )}

            {/* Message */}
            {result.message && (
              <Typography variant="body2" color="text.secondary">
                {result.message}
              </Typography>
            )}

            {/* Re-plan button */}
            {result.status !== 'awaiting_user_approval' && (
              <Button variant="outlined" size="small" onClick={handlePlan} sx={{ alignSelf: 'flex-start' }}>
                Re-plan
              </Button>
            )}
          </Box>
        )}
      </Collapse>
    </Box>
  );
}
