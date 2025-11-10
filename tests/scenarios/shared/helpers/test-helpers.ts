/**
 * Wait for Angular change detection to complete
 */
export function waitForAsync(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Create a mock window.fetch for testing
 */
export function createMockFetch(
  response: Partial<Response> = {}
): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
    ...response,
  } as Response);
}

/**
 * Restore original fetch after test
 */
export function restoreFetch(originalFetch: typeof fetch): void {
  window.fetch = originalFetch;
}

