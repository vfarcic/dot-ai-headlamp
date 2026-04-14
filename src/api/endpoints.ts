import { AI_TOOL_TIMEOUT, dotAiRequest } from './client';
import {
  KnowledgeResult,
  OperateResult,
  QueryResult,
  RecommendResult,
  RecommendStage,
  RemediateResult,
} from './types';

const KNOWLEDGE_TIMEOUT = 5 * 60_000;

export function queryCluster(intent: string): Promise<QueryResult> {
  return dotAiRequest<QueryResult>('/api/v1/tools/query', {
    method: 'POST',
    body: { intent: `[visualization] ${intent}` },
    timeout: AI_TOOL_TIMEOUT,
  });
}

export function analyzeIssue(issue: string): Promise<RemediateResult> {
  return dotAiRequest<RemediateResult>('/api/v1/tools/remediate', {
    method: 'POST',
    body: { issue },
    timeout: AI_TOOL_TIMEOUT,
  });
}

export function executeRemediation(
  sessionId: string,
  executeChoice: number
): Promise<RemediateResult> {
  return dotAiRequest<RemediateResult>('/api/v1/tools/remediate', {
    method: 'POST',
    body: { sessionId, executeChoice },
    timeout: AI_TOOL_TIMEOUT,
  });
}

export function operateCluster(intent: string): Promise<OperateResult> {
  return dotAiRequest<OperateResult>('/api/v1/tools/operate', {
    method: 'POST',
    body: { intent },
    timeout: AI_TOOL_TIMEOUT,
  });
}

export function executeOperation(
  sessionId: string,
  executeChoice: number
): Promise<OperateResult> {
  return dotAiRequest<OperateResult>('/api/v1/tools/operate', {
    method: 'POST',
    body: { sessionId, executeChoice },
    timeout: AI_TOOL_TIMEOUT,
  });
}

export function recommend(body: {
  intent?: string;
  final?: boolean;
  stage?: RecommendStage;
  solutionId?: string;
  answers?: Record<string, string | number>;
}): Promise<RecommendResult> {
  const { intent, final, stage, solutionId, answers } = body;
  return dotAiRequest<RecommendResult>('/api/v1/tools/recommend', {
    method: 'POST',
    body: { intent, final, stage, solutionId, answers },
    timeout: AI_TOOL_TIMEOUT,
  });
}

export function askKnowledge(query: string): Promise<KnowledgeResult> {
  return dotAiRequest<KnowledgeResult>('/api/v1/knowledge/ask', {
    method: 'POST',
    body: { query },
    timeout: KNOWLEDGE_TIMEOUT,
  });
}
