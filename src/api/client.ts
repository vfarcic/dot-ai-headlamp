import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { pluginStore } from '../settings/pluginConfig';
import { DotAiError, McpResponse } from './types';

const DEFAULT_SERVICE_NAME = 'dot-ai';
const DEFAULT_NAMESPACE = 'dot-ai';
const DEFAULT_PORT = '3456';

export const DEFAULT_TIMEOUT = 30_000;
export const AI_TOOL_TIMEOUT = 30 * 60_000;

/**
 * Build the K8s API proxy path for the dot-ai Service.
 * Format: /api/v1/namespaces/{namespace}/services/{serviceName}/proxy{endpointPath}
 */
export function buildProxyPath(endpointPath: string): string {
  const config = pluginStore.get();
  const serviceName = config?.serviceName || DEFAULT_SERVICE_NAME;
  const namespace = config?.namespace || DEFAULT_NAMESPACE;
  const port = config?.port || DEFAULT_PORT;
  return `/api/v1/namespaces/${namespace}/services/${serviceName}:${port}/proxy${endpointPath}`;
}

/**
 * Make a request to the dot-ai service through the K8s API proxy.
 * Unwraps the MCP response envelope and classifies errors.
 */
export async function dotAiRequest<T>(
  endpointPath: string,
  options?: { method?: string; body?: unknown; timeout?: number }
): Promise<T> {
  const fullPath = buildProxyPath(endpointPath);
  const method = options?.method || 'GET';
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

  const params: RequestInit & { timeout?: number; isJSON?: boolean; autoLogoutOnAuthError?: boolean } = {
    method,
    timeout,
    isJSON: true,
    autoLogoutOnAuthError: false,
  };

  const config = pluginStore.get();
  const headers: Record<string, string> = {};

  if (config?.token) {
    headers['X-Dot-AI-Authorization'] = `Bearer ${config.token}`;
  }

  if (options?.body !== undefined) {
    params.body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  if (Object.keys(headers).length > 0) {
    params.headers = headers;
  }

  type ApiProxyRequestFn = (
    path: string,
    params: RequestInit & { timeout?: number; isJSON?: boolean; autoLogoutOnAuthError?: boolean },
    useClusterURL?: boolean
  ) => Promise<McpResponse<T>>;

  let raw: McpResponse<T>;
  try {
    raw = await (ApiProxy.request as unknown as ApiProxyRequestFn)(fullPath, params, false);
  } catch (err: unknown) {
    if (err instanceof DotAiError) {
      throw err;
    }
    // ApiProxy throws an object with status/statusText/message
    const apiErr = err as { status?: number; message?: string; statusText?: string };
    const status = apiErr.status ?? 0;
    const message = apiErr.message || apiErr.statusText || 'Network error';
    throw DotAiError.fromStatus(status, message);
  }

  // Unwrap MCP envelope
  if (raw.success === false && raw.error) {
    throw new DotAiError(
      raw.error.message,
      400,
      'server',
      raw.error.code
    );
  }

  // MCP tool responses are wrapped as { success, data: { tool, result } }
  const data = raw.data as Record<string, unknown> | undefined;
  if (data && 'result' in data) {
    return data.result as T;
  }

  return (raw.data ?? raw) as T;
}
