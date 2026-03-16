import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { recommend } from '../api/endpoints';
import type {
  DeploymentResult,
  ManifestFile,
  OrganizationalContext,
  Question,
  RecommendResult,
  Solution,
} from '../api/types';
import { DotAiError } from '../api/types';

// Type guards for the RecommendResult union

function isRefinement(r: RecommendResult): r is Extract<RecommendResult, { needsRefinement: true }> {
  return 'needsRefinement' in r && (r as { needsRefinement?: boolean }).needsRefinement === true;
}

function isSolutions(r: RecommendResult): r is Extract<RecommendResult, { solutions: Solution[] }> {
  return 'solutions' in r && Array.isArray((r as { solutions?: unknown }).solutions);
}

function isQuestions(
  r: RecommendResult
): r is Extract<RecommendResult, { status: 'stage_questions' }> {
  return (r as { status?: string }).status === 'stage_questions';
}

function isManifests(
  r: RecommendResult
): r is Extract<RecommendResult, { status: 'manifests_generated' }> {
  return (r as { status?: string }).status === 'manifests_generated';
}

function isDeploy(r: RecommendResult): r is Extract<RecommendResult, { results?: DeploymentResult[] }> {
  return !isRefinement(r) && !isSolutions(r) && !isQuestions(r) && !isManifests(r);
}

// State

type Step = 'intent' | 'refinement' | 'solutions' | 'questions' | 'manifests' | 'deploy' | 'complete';

interface RecommendState {
  step: Step;
  solutions: Solution[];
  selectedSolutionId: string;
  organizationalContext: OrganizationalContext | null;
  questions: Question[];
  answers: Record<string, string | number>;
  currentQuestionStage: string;
  manifests: ManifestFile[];
  outputFormat: string;
  deployResults: DeploymentResult[];
  deployMessage: string;
  guidance: string;
  nextAction: string;
}

const INITIAL_STATE: RecommendState = {
  step: 'intent',
  solutions: [],
  selectedSolutionId: '',
  organizationalContext: null,
  questions: [],
  answers: {},
  currentQuestionStage: '',
  manifests: [],
  outputFormat: '',
  deployResults: [],
  deployMessage: '',
  guidance: '',
  nextAction: '',
};

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'intent', label: 'Intent' },
  { key: 'solutions', label: 'Solutions' },
  { key: 'questions', label: 'Configure' },
  { key: 'manifests', label: 'Review' },
  { key: 'deploy', label: 'Deploy' },
];

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

// Sub-components

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIdx = STEP_LABELS.findIndex(s => s.key === currentStep);
  // Map refinement to intent index
  const effectiveIdx = currentStep === 'refinement' ? 0 : currentStep === 'complete' ? STEP_LABELS.length : currentIdx;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
      {STEP_LABELS.map((s, i) => (
        <Chip
          key={s.key}
          label={s.label}
          size="small"
          color={i === effectiveIdx ? 'primary' : i < effectiveIdx ? 'success' : 'default'}
          variant={i === effectiveIdx ? 'filled' : 'outlined'}
        />
      ))}
    </Box>
  );
}

function SolutionCard({
  solution,
  onSelect,
}: {
  solution: Solution;
  onSelect: (id: string) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2">{solution.type}</Typography>
        <Chip label={`Score: ${solution.score}`} size="small" color="primary" variant="outlined" />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress
          variant="determinate"
          value={solution.score * 10}
          sx={{ flex: 1, height: 6, borderRadius: 1 }}
        />
        <Typography variant="caption">{solution.score}/10</Typography>
      </Box>
      <Typography variant="body2">{solution.description}</Typography>
      {solution.primaryResources.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {solution.primaryResources.map((r, i) => (
            <Chip key={i} label={r} size="small" variant="outlined" />
          ))}
        </Box>
      )}
      {solution.reasons.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {solution.reasons.join('. ')}
        </Typography>
      )}
      {(solution.appliedPatterns.length > 0 || solution.relevantPolicies.length > 0) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {solution.appliedPatterns.map((p, i) => (
            <Chip key={`pat-${i}`} label={p} size="small" color="secondary" variant="outlined" />
          ))}
          {solution.relevantPolicies.map((p, i) => (
            <Chip key={`pol-${i}`} label={p} size="small" color="warning" variant="outlined" />
          ))}
        </Box>
      )}
      <Button variant="contained" size="small" onClick={() => onSelect(solution.solutionId)}>
        Select
      </Button>
    </Paper>
  );
}

const HIDDEN_QUESTIONS: Record<string, string | number> = {
  output_path: './manifests',
};

function isHiddenQuestion(q: Question): boolean {
  return q.id in HIDDEN_QUESTIONS || q.question.toLowerCase().includes('where would you like to save');
}

function QuestionForm({
  questions,
  answers,
  stage,
  onAnswersChange,
  onSubmit,
  onSkip,
  disabled,
}: {
  questions: Question[];
  answers: Record<string, string | number>;
  stage: string;
  onAnswersChange: (answers: Record<string, string | number>) => void;
  onSubmit: () => void;
  onSkip: () => void;
  disabled: boolean;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const visibleQuestions = questions.filter(q => !isHiddenQuestion(q));

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    for (const q of visibleQuestions) {
      const val = answers[q.id];
      const v = q.validation;
      if (v?.required && (val === undefined || val === '')) {
        newErrors[q.id] = 'Required';
      } else if (v?.pattern && typeof val === 'string' && !new RegExp(v.pattern).test(val)) {
        newErrors[q.id] = 'Invalid format';
      } else if (v?.min !== undefined && typeof val === 'number' && val < v.min) {
        newErrors[q.id] = `Minimum: ${v.min}`;
      } else if (v?.max !== undefined && typeof val === 'number' && val > v.max) {
        newErrors[q.id] = `Maximum: ${v.max}`;
      } else if (v?.minLength !== undefined && typeof val === 'string' && val.length < v.minLength) {
        newErrors[q.id] = `Minimum length: ${v.minLength}`;
      } else if (v?.maxLength !== undefined && typeof val === 'string' && val.length > v.maxLength) {
        newErrors[q.id] = `Maximum length: ${v.maxLength}`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (validate()) {
      onSubmit();
    }
  }

  function handleChange(id: string, value: string | number) {
    onAnswersChange({ ...answers, [id]: value });
    if (errors[id]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  const isRequired = stage === 'required';

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle1">Configuration</Typography>
        <Chip label={stage} size="small" color="info" />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visibleQuestions.map(q => {
          if (q.type === 'select' && q.options) {
            return (
              <FormControl key={q.id} size="small" fullWidth error={!!errors[q.id]}>
                <InputLabel>{q.question}</InputLabel>
                <Select
                  value={answers[q.id] ?? q.suggestedAnswer ?? ''}
                  label={q.question}
                  onChange={e => handleChange(q.id, e.target.value)}
                  disabled={disabled}
                >
                  {q.options.map(opt => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
                {errors[q.id] && (
                  <Typography variant="caption" color="error">
                    {errors[q.id]}
                  </Typography>
                )}
              </FormControl>
            );
          }
          return (
            <TextField
              key={q.id}
              label={q.question}
              type={q.type === 'number' ? 'number' : 'text'}
              placeholder={q.placeholder}
              value={answers[q.id] ?? q.suggestedAnswer ?? ''}
              onChange={e =>
                handleChange(q.id, q.type === 'number' ? Number(e.target.value) : e.target.value)
              }
              disabled={disabled}
              size="small"
              fullWidth
              error={!!errors[q.id]}
              helperText={errors[q.id]}
              inputProps={
                q.type === 'number'
                  ? { min: q.validation?.min, max: q.validation?.max }
                  : undefined
              }
            />
          );
        })}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={handleSubmit} disabled={disabled}>
            Submit
          </Button>
          {!isRequired && (
            <Button variant="outlined" onClick={onSkip} disabled={disabled}>
              Skip Stage
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

function ManifestCollapsible({
  file,
  defaultOpen,
}: {
  file: ManifestFile;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <Paper variant="outlined" sx={{ mb: 1 }}>
      <Box
        sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(!open)}
      >
        <Typography variant="body2" fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
          {file.relativePath}
        </Typography>
        <Button size="small">{open ? 'Hide' : 'Show'}</Button>
      </Box>
      <Collapse in={open}>
        <Typography
          variant="body2"
          component="pre"
          sx={{
            bgcolor: 'background.default',
            p: 1.5,
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            m: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {file.content}
        </Typography>
      </Collapse>
    </Paper>
  );
}

function DeployResults({
  results,
  kubectlOutput,
  message,
}: {
  results: DeploymentResult[];
  kubectlOutput?: string;
  message?: string;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {results.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Deployment Results
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {results.map((r, i) => (
              <Chip
                key={i}
                label={`${r.resource}: ${r.status}`}
                size="small"
                color={r.status === 'created' || r.status === 'configured' ? 'success' : 'warning'}
              />
            ))}
          </Box>
          {results.some(r => r.message) && (
            <Box>
              {results
                .filter(r => r.message)
                .map((r, i) => (
                  <Typography key={i} variant="caption" display="block" color="text.secondary">
                    {r.resource}: {r.message}
                  </Typography>
                ))}
            </Box>
          )}
        </Paper>
      )}
      {kubectlOutput && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            kubectl Output
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
            {kubectlOutput}
          </Typography>
        </Paper>
      )}
      {message && <Alert severity="info">{message}</Alert>}
    </Box>
  );
}

// Main component

export default function RecommendPage() {
  const [intent, setIntent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DotAiError | null>(null);
  const [state, setState] = useState<RecommendState>({ ...INITIAL_STATE });

  function handleResponse(result: RecommendResult) {
    if (isRefinement(result)) {
      setState(prev => ({
        ...prev,
        step: 'refinement',
        guidance: result.guidance,
      }));
      setIntent(result.intent);
    } else if (isSolutions(result)) {
      setState(prev => ({
        ...prev,
        step: 'solutions',
        solutions: result.solutions,
        organizationalContext: result.organizationalContext,
        guidance: result.guidance,
        nextAction: result.nextAction,
      }));
    } else if (isQuestions(result)) {
      // Pre-populate answers with suggested values (current stage only)
      const suggested: Record<string, string | number> = {};
      for (const q of result.questions) {
        if (q.answer !== undefined) {
          suggested[q.id] = q.answer;
        } else if (q.suggestedAnswer !== null && q.suggestedAnswer !== undefined) {
          suggested[q.id] = q.suggestedAnswer;
        }
      }
      setState(prev => ({
        ...prev,
        step: 'questions',
        questions: result.questions,
        currentQuestionStage: result.currentStage,
        answers: suggested,
        guidance: result.guidance,
        nextAction: result.nextAction,
      }));
    } else if (isManifests(result)) {
      setState(prev => ({
        ...prev,
        step: 'manifests',
        manifests: result.files,
        outputFormat: result.outputFormat,
        selectedSolutionId: result.solutionId,
      }));
    } else if (isDeploy(result)) {
      setState(prev => ({
        ...prev,
        step: result.success ? 'complete' : 'deploy',
        deployResults: result.results ?? [],
        deployMessage: result.message ?? '',
      }));
    }
  }

  async function callRecommend(body: Parameters<typeof recommend>[0]) {
    setLoading(true);
    setError(null);
    console.log('[dot-ai recommend] request:', JSON.stringify(body, null, 2));
    try {
      const result = await recommend(body);
      console.log('[dot-ai recommend] response:', JSON.stringify(result, null, 2));
      handleResponse(result);
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

  function handleSubmitIntent() {
    const trimmed = intent.trim();
    if (!trimmed || loading) return;
    callRecommend({ intent: trimmed, final: true });
  }

  function handleSelectSolution(solutionId: string) {
    setState(prev => ({ ...prev, selectedSolutionId: solutionId }));
    callRecommend({ stage: 'chooseSolution', solutionId });
  }

  function getAnswersWithHidden(): Record<string, string | number> {
    const allAnswers = { ...state.answers };
    for (const q of state.questions) {
      if (isHiddenQuestion(q) && !(q.id in allAnswers)) {
        allAnswers[q.id] = HIDDEN_QUESTIONS[q.id] ?? './manifests';
      }
    }
    return allAnswers;
  }

  function handleSubmitAnswers() {
    callRecommend({
      stage: `answerQuestion:${state.currentQuestionStage}` as Parameters<typeof recommend>[0]['stage'],
      solutionId: state.selectedSolutionId,
      answers: getAnswersWithHidden(),
    });
  }

  function handleSkipStage() {
    callRecommend({
      stage: 'generateManifests',
      solutionId: state.selectedSolutionId,
      answers: getAnswersWithHidden(),
      final: true,
    });
  }

  function handleDeploy() {
    callRecommend({
      stage: 'deployManifests',
      solutionId: state.selectedSolutionId,
    });
  }

  function handleStartOver() {
    setIntent('');
    setError(null);
    setState({ ...INITIAL_STATE });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitIntent();
    }
  }

  return (
    <SectionBox title="Recommend">
      {state.step !== 'intent' && <StepIndicator currentStep={state.step} />}

      {/* Intent input */}
      {(state.step === 'intent' || state.step === 'refinement') && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Describe what you want to deploy..."
              value={intent}
              onChange={e => setIntent(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleSubmitIntent}
              disabled={!intent.trim() || loading}
            >
              {state.step === 'refinement' ? 'Refine & Resubmit' : 'Recommend'}
            </Button>
          </Box>
          {state.step === 'refinement' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please provide more details about what you want to deploy. Include specifics like
              the application type, ports, resources, or services it depends on.
            </Alert>
          )}
        </>
      )}

      {loading && <Loader title="Processing..." />}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            error.isRetryable ? (
              <Button color="inherit" size="small" onClick={handleSubmitIntent}>
                Retry
              </Button>
            ) : undefined
          }
        >
          {getErrorMessage(error)}
        </Alert>
      )}

      {/* Solutions */}
      {state.step === 'solutions' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {state.organizationalContext && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label={`${state.organizationalContext.totalPatterns} patterns`}
                size="small"
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={`${state.organizationalContext.totalPolicies} policies`}
                size="small"
                color="warning"
                variant="outlined"
              />
              <Chip
                label={`${state.organizationalContext.solutionsUsingPatterns}/${state.organizationalContext.totalSolutions} using patterns`}
                size="small"
                variant="outlined"
              />
            </Box>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 2,
            }}
          >
            {state.solutions.map(sol => (
              <SolutionCard key={sol.solutionId} solution={sol} onSelect={handleSelectSolution} />
            ))}
          </Box>
        </Box>
      )}

      {/* Questions */}
      {state.step === 'questions' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <QuestionForm
            questions={state.questions}
            answers={state.answers}
            stage={state.currentQuestionStage}
            onAnswersChange={answers => setState(prev => ({ ...prev, answers }))}
            onSubmit={handleSubmitAnswers}
            onSkip={handleSkipStage}
            disabled={loading}
          />
        </Box>
      )}

      {/* Manifests */}
      {state.step === 'manifests' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="success">
            Manifests generated
            {state.outputFormat && (
              <>
                {' '}
                — <Chip label={state.outputFormat} size="small" sx={{ ml: 0.5 }} />
              </>
            )}
          </Alert>
          {state.manifests.map((file, i) => (
            <ManifestCollapsible key={file.relativePath} file={file} defaultOpen={i === 0} />
          ))}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleDeploy} disabled={loading}>
              Deploy
            </Button>
            <Button variant="outlined" onClick={handleStartOver}>
              Start Over
            </Button>
          </Box>
        </Box>
      )}

      {/* Deploy / Complete */}
      {(state.step === 'deploy' || state.step === 'complete') && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DeployResults
            results={state.deployResults}
            message={state.deployMessage}
          />
          <Button variant="outlined" onClick={handleStartOver}>
            Start Over
          </Button>
        </Box>
      )}
    </SectionBox>
  );
}
