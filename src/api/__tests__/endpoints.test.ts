import { vi } from 'vitest';

// Mock dotAiRequest
const mockDotAiRequest = vi.fn();
vi.mock('../client', () => ({
  DEFAULT_TIMEOUT: 30_000,
  AI_TOOL_TIMEOUT: 30 * 60_000,
  dotAiRequest: (...args: unknown[]) => mockDotAiRequest(...args),
  buildProxyPath: vi.fn(),
}));

import { AI_TOOL_TIMEOUT } from '../client';
import {
  analyzeIssue,
  askKnowledge,
  executeOperation,
  executeRemediation,
  operateCluster,
  queryCluster,
  recommend,
} from '../endpoints';

beforeEach(() => {
  mockDotAiRequest.mockReset();
  mockDotAiRequest.mockResolvedValue({});
});

describe('AI tool endpoints', () => {
  it('queryCluster sends POST with visualization prefix', async () => {
    await queryCluster('list pods');
    expect(mockDotAiRequest).toHaveBeenCalledWith('/api/v1/tools/query', {
      method: 'POST',
      body: { intent: '[visualization] list pods' },
      timeout: AI_TOOL_TIMEOUT,
    });
  });

  it('analyzeIssue sends POST to remediate', async () => {
    await analyzeIssue('pod crashing');
    expect(mockDotAiRequest).toHaveBeenCalledWith('/api/v1/tools/remediate', {
      method: 'POST',
      body: { issue: 'pod crashing' },
      timeout: AI_TOOL_TIMEOUT,
    });
  });

  it('executeRemediation sends sessionId and choice', async () => {
    await executeRemediation('sess-1', 2);
    expect(mockDotAiRequest).toHaveBeenCalledWith('/api/v1/tools/remediate', {
      method: 'POST',
      body: { sessionId: 'sess-1', executeChoice: 2 },
      timeout: AI_TOOL_TIMEOUT,
    });
  });

  it('operateCluster sends POST with intent', async () => {
    await operateCluster('scale nginx to 3');
    expect(mockDotAiRequest).toHaveBeenCalledWith('/api/v1/tools/operate', {
      method: 'POST',
      body: { intent: 'scale nginx to 3' },
      timeout: AI_TOOL_TIMEOUT,
    });
  });

  it('executeOperation sends sessionId and choice', async () => {
    await executeOperation('sess-2', 1);
    expect(mockDotAiRequest).toHaveBeenCalledWith('/api/v1/tools/operate', {
      method: 'POST',
      body: { sessionId: 'sess-2', executeChoice: 1 },
      timeout: AI_TOOL_TIMEOUT,
    });
  });

  it('recommend forwards full body', async () => {
    const body = { intent: 'deploy postgres', final: true };
    await recommend(body);
    expect(mockDotAiRequest).toHaveBeenCalledWith('/api/v1/tools/recommend', {
      method: 'POST',
      body,
      timeout: AI_TOOL_TIMEOUT,
    });
  });

  it('recommend body does not include timeout field', async () => {
    const body = { intent: 'deploy postgres' };
    await recommend(body);
    const calledBody = mockDotAiRequest.mock.calls[0][1].body;
    expect(calledBody).not.toHaveProperty('timeout');
  });

  it('askKnowledge sends POST to knowledge/ask', async () => {
    await askKnowledge('how to scale?');
    expect(mockDotAiRequest).toHaveBeenCalledWith('/api/v1/knowledge/ask', {
      method: 'POST',
      body: { query: 'how to scale?' },
      timeout: 5 * 60_000,
    });
  });
});
