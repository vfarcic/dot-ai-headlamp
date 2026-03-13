import { Visualization } from '../types';

// Error classification

export type DotAiErrorType = 'network' | 'timeout' | 'auth' | 'server' | 'service-not-found';

export class DotAiError extends Error {
  readonly errorType: DotAiErrorType;
  readonly status: number;
  readonly errorCode?: string;

  constructor(message: string, status: number, errorType: DotAiErrorType, errorCode?: string) {
    super(message);
    this.name = 'DotAiError';
    this.status = status;
    this.errorType = errorType;
    this.errorCode = errorCode;
  }

  get isRetryable(): boolean {
    return (
      this.errorType === 'network' ||
      this.errorType === 'timeout' ||
      this.errorType === 'server'
    );
  }

  static fromStatus(status: number, message?: string, errorCode?: string): DotAiError {
    let errorType: DotAiErrorType;
    if (status === 0 || status === 502) {
      errorType = 'network';
    } else if (status === 408) {
      errorType = 'timeout';
    } else if (status === 401 || status === 403) {
      errorType = 'auth';
    } else if (status === 404) {
      errorType = 'service-not-found';
    } else {
      errorType = 'server';
    }
    return new DotAiError(
      message || `dot-ai request failed with status ${status}`,
      status,
      errorType,
      errorCode
    );
  }
}

// MCP response envelope

export interface McpResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

// Tool result types

export interface QueryResult {
  sessionId: string;
  title: string;
  visualizations: Visualization[];
  insights: string[];
  toolsUsed?: string[];
}

export interface RemediateAction {
  description: string;
  command: string;
  risk: 'low' | 'medium' | 'high';
  rationale?: string;
}

export interface ExecutionChoice {
  id: number;
  label: string;
  description: string;
  risk?: string;
}

export interface ExecutionResult {
  action: string;
  success: boolean;
  output: string;
  timestamp?: string;
}

export interface RemediateResult {
  sessionId: string;
  status: 'awaiting_user_approval' | 'success' | 'failed';
  analysis: {
    rootCause: string;
    confidence: number;
    factors: string[];
  };
  remediation: {
    summary: string;
    actions: RemediateAction[];
    risk: string;
  };
  executionChoices?: ExecutionChoice[];
  results?: ExecutionResult[];
  validation?: {
    success: boolean;
    summary: string;
  };
  message?: string;
  guidance?: string;
}

export interface CurrentResource {
  kind: string;
  name: string;
  namespace: string;
  summary: string;
}

export interface ProposedChange {
  kind: string;
  name: string;
  manifest?: string;
  rationale: string;
}

export interface OperateResult {
  sessionId: string;
  status: 'awaiting_user_approval' | 'success' | 'failed';
  analysis?: {
    summary: string;
    currentState: {
      resources: CurrentResource[];
    };
    proposedChanges: {
      create: ProposedChange[];
      update: ProposedChange[];
      delete: ProposedChange[];
    };
    commands: string[];
    dryRunValidation: {
      status: 'success' | 'failed';
      details: string;
    };
    patternsApplied: string[];
    capabilitiesUsed: string[];
    policiesChecked: string[];
    risks: {
      level: 'low' | 'medium' | 'high';
      description: string;
    };
    validationIntent: string;
  };
  execution?: {
    results: ExecutionResult[];
    validation: string;
  };
  executionChoices?: ExecutionChoice[];
  message?: string;
  nextAction?: string;
}

export type RecommendStage =
  | 'recommend'
  | 'chooseSolution'
  | 'answerQuestion:required'
  | 'answerQuestion:basic'
  | 'answerQuestion:advanced'
  | 'answerQuestion:open'
  | 'generateManifests'
  | 'deployManifests';

export interface Solution {
  solutionId: string;
  type: string;
  score: number;
  description: string;
  primaryResources: string[];
  resources: { kind: string; apiVersion: string; group: string; description: string }[];
  reasons: string[];
  appliedPatterns: string[];
  relevantPolicies: string[];
}

export interface OrganizationalContext {
  solutionsUsingPatterns: number;
  totalSolutions: number;
  totalPatterns: number;
  totalPolicies: number;
  patternsAvailable: string;
  policiesAvailable: string;
}

export interface Question {
  id: string;
  question: string;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  options?: string[];
  validation?: {
    required?: boolean;
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  suggestedAnswer?: string | number | null;
  answer?: string | number;
}

export interface ManifestFile {
  relativePath: string;
  content: string;
}

export interface DeploymentResult {
  resource: string;
  status: string;
  message: string;
}

export interface RecommendRefinementResponse {
  needsRefinement: true;
  intent: string;
  guidance: string;
}

export interface RecommendSolutionsResponse {
  intent: string;
  solutions: Solution[];
  organizationalContext: OrganizationalContext;
  nextAction: string;
  guidance: string;
  visualizationUrl: string;
}

export interface RecommendQuestionsResponse {
  status: 'stage_questions';
  solutionId: string;
  currentStage: 'required' | 'basic' | 'advanced' | 'open';
  questions: Question[];
  nextStage: string;
  message: string;
  nextAction: string;
  guidance: string;
  agentInstructions: string;
}

export interface RecommendManifestResponse {
  success: true;
  status: 'manifests_generated';
  solutionId: string;
  outputFormat: 'raw' | 'helm' | 'kustomize';
  outputPath: string;
  files: ManifestFile[];
  validationAttempts: number;
  agentInstructions: string;
  visualizationUrl: string;
}

export interface RecommendDeployResponse {
  success: boolean;
  solutionId: string;
  solutionType?: string;
  manifestPath?: string;
  readinessTimeout?: boolean;
  message?: string;
  kubectlOutput?: string;
  deploymentComplete?: boolean;
  requiresStatusCheck?: boolean;
  timestamp?: string;
  results?: DeploymentResult[];
}

export type RecommendResult =
  | RecommendRefinementResponse
  | RecommendSolutionsResponse
  | RecommendQuestionsResponse
  | RecommendManifestResponse
  | RecommendDeployResponse;

export interface KnowledgeSource {
  uri: string;
  title: string;
}

export interface KnowledgeChunk {
  content: string;
  uri: string;
  score: number;
  chunkIndex: number;
}

export interface KnowledgeResult {
  answer: string;
  sources: KnowledgeSource[];
  chunks: KnowledgeChunk[];
}

