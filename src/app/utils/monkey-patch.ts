/**
 * Safe monkey patching utilities for HTTP requests and API methods
 */

export interface PatchRestore {
  restore: () => void;
}

export interface PatchManager {
  add: (restore: () => void) => void;
  restoreAll: () => void;
  clear: () => void;
}

/**
 * Patch window.fetch with restore capability
 */
export function patchFetch(
  mockFetch: typeof fetch
): PatchRestore {
  const originalFetch = window.fetch;
  window.fetch = mockFetch;

  return {
    restore: (): void => {
      window.fetch = originalFetch;
    },
  };
}

/**
 * Patch XMLHttpRequest if needed
 */
export function patchXHR(
  mockXHR: typeof XMLHttpRequest
): PatchRestore {
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = mockXHR;

  return {
    restore: (): void => {
      window.XMLHttpRequest = originalXHR;
    },
  };
}

/**
 * Patch any function with restore capability
 */
export function patchFunction<T extends (...args: unknown[]) => unknown>(
  target: Record<string, unknown>,
  methodName: string,
  replacement: T
): PatchRestore {
  const original = target[methodName];
  target[methodName] = replacement;

  return {
    restore: (): void => {
      target[methodName] = original;
    },
  };
}

/**
 * Patch object property with restore capability
 */
export function patchProperty<T>(
  target: Record<string, unknown>,
  propertyName: string,
  value: T
): PatchRestore {
  const descriptor = Object.getOwnPropertyDescriptor(target, propertyName);
  const originalValue = target[propertyName];

  Object.defineProperty(target, propertyName, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  return {
    restore: (): void => {
      if (descriptor !== undefined) {
        Object.defineProperty(target, propertyName, descriptor);
      } else {
        target[propertyName] = originalValue;
      }
    },
  };
}

/**
 * Create a patch manager to handle multiple patches
 */
export function createPatchManager(): PatchManager {
  const patches: Array<() => void> = [];

  return {
    add: (restore: () => void): void => {
      patches.push(restore);
    },
    restoreAll: (): void => {
      patches.forEach((restore) => {
        try {
          restore();
        } catch (error: unknown) {
          // Direct console usage is intentional: This utility may be called during cleanup
          // before Angular services are available or after they've been destroyed.
          // eslint-disable-next-line no-console
          console.error('Error restoring patch:', error);
        }
      });
      patches.length = 0;
    },
    clear: (): void => {
      patches.length = 0;
    },
  };
}

/**
 * Execute code with automatic patch restoration
 */
export function withPatches<T>(
  patches: Array<() => PatchRestore>,
  fn: () => T
): T {
  const restores = patches.map((patch) => patch());
  try {
    return fn();
  } finally {
    restores.forEach((restore) => restore.restore());
  }
}

