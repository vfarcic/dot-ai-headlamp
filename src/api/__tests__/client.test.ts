import { vi } from 'vitest';

// Mock ApiProxy.request
const mockRequest = vi.fn();
vi.mock('@kinvolk/headlamp-plugin/lib/ApiProxy', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

// Mock pluginStore
const mockGet = vi.fn();
vi.mock('../../settings/pluginConfig', () => ({
  pluginStore: {
    get: () => mockGet(),
  },
}));

import { AI_TOOL_TIMEOUT, buildProxyPath, DEFAULT_TIMEOUT, dotAiRequest } from '../client';
import { DotAiError } from '../types';

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockReturnValue(null);
});

describe('buildProxyPath', () => {
  it('uses defaults when config is null', () => {
    mockGet.mockReturnValue(null);
    expect(buildProxyPath('/api/v1/tools')).toBe(
      '/api/v1/namespaces/dot-ai/services/dot-ai:3456/proxy/api/v1/tools'
    );
  });

  it('uses defaults when config has empty values', () => {
    mockGet.mockReturnValue({ serviceName: '', namespace: '' });
    expect(buildProxyPath('/api/v1/tools')).toBe(
      '/api/v1/namespaces/dot-ai/services/dot-ai:3456/proxy/api/v1/tools'
    );
  });

  it('uses custom config values', () => {
    mockGet.mockReturnValue({ serviceName: 'my-svc', namespace: 'custom-ns' });
    expect(buildProxyPath('/api/v1/tools')).toBe(
      '/api/v1/namespaces/custom-ns/services/my-svc:3456/proxy/api/v1/tools'
    );
  });
});

describe('dotAiRequest', () => {
  it('makes a GET request by default', async () => {
    mockRequest.mockResolvedValue({ success: true, data: { items: [] } });

    const result = await dotAiRequest('/api/v1/resources');

    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/namespaces/dot-ai/services/dot-ai:3456/proxy/api/v1/resources',
      expect.objectContaining({
        method: 'GET',
        timeout: DEFAULT_TIMEOUT,
        isJSON: true,
        autoLogoutOnAuthError: false,
      }),
      false
    );
    expect(result).toEqual({ items: [] });
  });

  it('makes a POST request with body', async () => {
    mockRequest.mockResolvedValue({ success: true, data: { sessionId: '123' } });

    await dotAiRequest('/api/v1/tools/query', {
      method: 'POST',
      body: { intent: 'list pods' },
      timeout: AI_TOOL_TIMEOUT,
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: '{"intent":"list pods"}',
        headers: { 'Content-Type': 'application/json' },
        timeout: AI_TOOL_TIMEOUT,
      }),
      false
    );
  });

  it('unwraps MCP envelope on success', async () => {
    mockRequest.mockResolvedValue({ success: true, data: { title: 'Pods' } });
    const result = await dotAiRequest('/api/v1/tools/query');
    expect(result).toEqual({ title: 'Pods' });
  });

  it('returns raw response when no envelope wrapper', async () => {
    mockRequest.mockResolvedValue({ name: 'test' });
    const result = await dotAiRequest('/api/v1/tools');
    expect(result).toEqual({ name: 'test' });
  });

  it('throws DotAiError on MCP error envelope', async () => {
    mockRequest.mockResolvedValue({
      success: false,
      error: { code: 'SESSION_NOT_FOUND', message: 'Session expired' },
    });

    await expect(dotAiRequest('/api/v1/tools/query')).rejects.toThrow(DotAiError);

    mockRequest.mockResolvedValue({
      success: false,
      error: { code: 'SESSION_NOT_FOUND', message: 'Session expired' },
    });

    await expect(dotAiRequest('/api/v1/tools/query')).rejects.toMatchObject({
      message: 'Session expired',
      errorCode: 'SESSION_NOT_FOUND',
      errorType: 'server',
    });
  });

  it('classifies 404 ApiProxy error as service-not-found', async () => {
    mockRequest.mockRejectedValue({ status: 404, message: 'Not Found' });

    await expect(dotAiRequest('/api/v1/tools')).rejects.toMatchObject({
      errorType: 'service-not-found',
      status: 404,
    });
  });

  it('classifies 401 ApiProxy error as auth', async () => {
    mockRequest.mockRejectedValue({ status: 401, message: 'Unauthorized' });

    await expect(dotAiRequest('/api/v1/tools')).rejects.toMatchObject({
      errorType: 'auth',
      status: 401,
    });
  });

  it('classifies 403 ApiProxy error as auth', async () => {
    mockRequest.mockRejectedValue({ status: 403, message: 'Forbidden' });

    await expect(dotAiRequest('/api/v1/tools')).rejects.toMatchObject({
      errorType: 'auth',
      status: 403,
    });
  });

  it('classifies 502 as network error', async () => {
    mockRequest.mockRejectedValue({ status: 502, message: 'Bad Gateway' });

    await expect(dotAiRequest('/api/v1/tools')).rejects.toMatchObject({
      errorType: 'network',
      status: 502,
    });
  });

  it('classifies 408 as timeout', async () => {
    mockRequest.mockRejectedValue({ status: 408, message: 'Timeout' });

    await expect(dotAiRequest('/api/v1/tools')).rejects.toMatchObject({
      errorType: 'timeout',
      status: 408,
    });
  });

  it('classifies 500 as server error', async () => {
    mockRequest.mockRejectedValue({ status: 500, message: 'Internal Server Error' });

    await expect(dotAiRequest('/api/v1/tools')).rejects.toMatchObject({
      errorType: 'server',
      status: 500,
    });
  });

  it('classifies no-status errors as network', async () => {
    mockRequest.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(dotAiRequest('/api/v1/tools')).rejects.toMatchObject({
      errorType: 'network',
      status: 0,
    });
  });
});

describe('DotAiError', () => {
  it('isRetryable is true for network errors', () => {
    const err = DotAiError.fromStatus(502);
    expect(err.isRetryable).toBe(true);
  });

  it('isRetryable is true for timeout errors', () => {
    const err = DotAiError.fromStatus(408);
    expect(err.isRetryable).toBe(true);
  });

  it('isRetryable is true for server errors', () => {
    const err = DotAiError.fromStatus(500);
    expect(err.isRetryable).toBe(true);
  });

  it('isRetryable is false for auth errors', () => {
    const err = DotAiError.fromStatus(403);
    expect(err.isRetryable).toBe(false);
  });

  it('isRetryable is false for service-not-found errors', () => {
    const err = DotAiError.fromStatus(404);
    expect(err.isRetryable).toBe(false);
  });
});

describe('timeout constants', () => {
  it('DEFAULT_TIMEOUT is 30 seconds', () => {
    expect(DEFAULT_TIMEOUT).toBe(30_000);
  });

  it('AI_TOOL_TIMEOUT is 30 minutes', () => {
    expect(AI_TOOL_TIMEOUT).toBe(30 * 60_000);
  });
});
