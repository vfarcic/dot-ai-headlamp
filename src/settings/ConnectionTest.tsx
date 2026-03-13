export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export async function testConnection(
  mcpServerUrl: string,
  bearerToken: string
): Promise<ConnectionTestResult> {
  const url = mcpServerUrl.replace(/\/+$/, '');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${url}/api/v1/tools`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Authentication failed.' };
    }

    if (!response.ok) {
      return { success: false, message: `Server returned status ${response.status}.` };
    }

    const data = await response.json();
    const toolCount = Array.isArray(data) ? data.length : 0;
    return { success: true, message: `Connected successfully. ${toolCount} tools available.` };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, message: 'Connection timed out.' };
    }
    return { success: false, message: 'Cannot reach server.' };
  } finally {
    clearTimeout(timeoutId);
  }
}
