/**
 * Safe monkey patching utilities for HTTP requests and API methods
 */

import type { PatchRestore } from '../../types/patch.types';

// Re-export types for backward compatibility
export type { PatchRestore } from '../../types/patch.types';

// Re-export unified patch manager
export { createPatchManager, type PatchManager } from './patch-manager';

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

