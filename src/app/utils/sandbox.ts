/**
 * Sandboxing utilities for isolated execution contexts
 */

/**
 * Create an isolated execution context using iframe
 */
export function createSandbox(): {
  execute: <T>(code: string | (() => T)) => Promise<T>;
  destroy: () => void;
} {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;
  if (!iframeWindow) {
    throw new Error('Failed to create sandbox iframe');
  }

  return {
    execute: async <T>(code: string | (() => T)): Promise<T> => {
      if (typeof code === 'function') {
        // Execute function in iframe context
        return new Promise((resolve, reject) => {
          try {
            const result = code.call(iframeWindow as ThisType<() => T>);
            resolve(result);
          } catch (error: unknown) {
            reject(error);
          }
        });
      } else {
        // Execute string code
        return new Promise<T>((resolve, reject) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            const result = (
              iframeWindow as unknown as { eval: (code: string) => unknown }
            ).eval(code) as T;
            resolve(result);
          } catch (error: unknown) {
            reject(error);
          }
        });
      }
    },
    destroy: (): void => {
      if (iframe.parentNode !== null) {
        iframe.parentNode.removeChild(iframe);
      }
    },
  };
}

/**
 * Execute code in a sandbox with automatic cleanup
 */
export async function withSandbox<T>(
  fn: (sandbox: ReturnType<typeof createSandbox>) => Promise<T>
): Promise<T> {
  const sandbox = createSandbox();
  try {
    return await fn(sandbox);
  } finally {
    sandbox.destroy();
  }
}

/**
 * Create a context switcher for isolated execution
 */
export function createContextSwitcher(): {
  switchTo: (context: unknown) => void;
  switchBack: () => void;
  execute: <T>(fn: () => T) => T;
} {
  const originalContext = globalThis;
  let currentContext: unknown = originalContext;

  return {
    switchTo: (context: unknown): void => {
      currentContext = context;
    },
    switchBack: (): void => {
      currentContext = originalContext;
    },
    execute: <T>(fn: () => T): T => {
      const savedContext = currentContext;
      try {
        return fn.call(currentContext as ThisType<() => T>);
      } finally {
        currentContext = savedContext;
      }
    },
  };
}

