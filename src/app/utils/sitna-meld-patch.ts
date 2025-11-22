/**
 * Meld-based patching for SITNA API methods
 * Uses meld library (version < 2.0.0) for AOP-style patching
 */

import type {
  Meld,
  MeldJoinPoint,
  MethodPatchDefinition,
  Logger,
  SitnaMethodPatches,
} from '../../types/meld.types';

// meld is a CommonJS module, so we use require with proper typing
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const meld = require('meld') as Meld;

// Re-export types for convenience
export type {
  Meld,
  MeldAdvice,
  MeldJoinPoint,
  MethodPatchDefinition,
  Logger,
  MethodPatch,
  SitnaMethodPatches,
} from '../../types/meld.types';
export type { SitnaPatchConfig } from '../../types/patch.types';

/**
 * Patch specific SITNA.Map methods with custom behavior using meld AOP library.
 *
 * This function allows you to intercept and modify SITNA.Map method calls using
 * Aspect-Oriented Programming (AOP) patterns. Patches are applied using meld's
 * `around` advice, which wraps the original method execution.
 *
 * **Important**: Always use `createMeldPatchManager()` to manage patches and ensure
 * they are properly restored when components are destroyed to prevent memory leaks
 * and unexpected behavior.
 *
 * @param methodPatches - An object mapping method names to patch functions.
 *   Each patch function receives:
 *   - `original`: A wrapper function that calls the original method
 *   - `...args`: The original method arguments
 *   The patch function should return the result of calling `original` (or a modified result).
 *
 * @returns An array of restore functions. Call each function to remove the corresponding patch.
 *
 * @example
 * ```typescript
 * // Define typed method signatures for better type safety
 * type LoadedMethod = (callback?: () => void) => Promise<void>;
 * type AddLayerMethod = (layer: string | LayerOptions | Layer, callback?: (layer: Layer) => void) => Promise<Layer>;
 *
 * const component = this;
 * const patchManager = createMeldPatchManager();
 *
 * const restores = patchSitnaMapMethods({
 *   loaded: function (this: SitnaMap, original: LoadedMethod, callback?: () => void): Promise<void> {
 *     component.logger.warn('Map loaded() called');
 *     // Call original method - required to maintain functionality
 *     return original.call(this, callback);
 *   },
 *   addLayer: function (this: SitnaMap, original: AddLayerMethod, layer: string | LayerOptions | Layer, callback?: (layer: Layer) => void): Promise<Layer> {
 *     component.logger.warn('addLayer() called with', layer);
 *     // Can modify arguments or return value before/after calling original
 *     return original.call(this, layer, callback);
 *   },
 * });
 *
 * // Register patches with manager for automatic cleanup
 * patchManager.add(restores);
 *
 * // In ngOnDestroy:
 * patchManager.restoreAll();
 * ```
 *
 * @remarks
 * - Patches are applied to `SITNA.Map.prototype`, affecting all map instances
 * - Use regular functions (not arrow functions) so `this` refers to the map instance
 * - The `original` parameter is a wrapper that prevents infinite recursion
 * - Always call `original` to maintain the original method's behavior
 * - Type safety: Define method types (e.g., `LoadedMethod`, `AddLayerMethod`) for better IntelliSense
 * - Patches run outside Angular's zone - use `ChangeDetectorRef.detectChanges()` if needed
 *
 * @see {@link createMeldPatchManager} For managing multiple patches and cleanup
 * @see {@link SitnaMethodPatches} For the type definition of method patches
 */
export function patchSitnaMapMethods(
  methodPatches: SitnaMethodPatches
): Array<() => void> {
  const SITNA = window.SITNA;

  if (SITNA?.Map?.prototype === undefined) {
    // Use console directly here as this is a utility function that may be called
    // before Angular services are available
    // eslint-disable-next-line no-console
    console.warn('SITNA.Map not available for patching');
    return [];
  }

  const restores: Array<() => void> = [];

  Object.entries(methodPatches).forEach(([methodName, patchFn]) => {
    const prototype = SITNA.Map.prototype as unknown as Record<string, unknown>;
    if (typeof prototype[methodName] === 'function') {
      const advice = meld.around(
        SITNA.Map.prototype,
        methodName,
        function (
          this: unknown,
          joinPoint: MeldJoinPoint
        ): unknown {
          // Use joinPoint.proceed() to call the original method
          // This is the correct way to invoke the original in meld's around advice
          // It prevents infinite recursion by using meld's internal mechanism
          const originalWrapper = (...args: unknown[]): unknown => {
            // If called with the same args as joinPoint, use proceed()
            // Otherwise use proceedApply with the new args
            if (args.length === 0 ||
                (args.length === joinPoint.args.length &&
                 args.every((arg, i) => arg === joinPoint.args[i]))) {
              return joinPoint.proceed();
            }
            return joinPoint.proceedApply(args);
          };
          return patchFn.call(this, originalWrapper, ...joinPoint.args);
        }
      );
      restores.push(() => meld.remove(advice));
    }
  });

  return restores;
}

/**
 * Create a patch manager for meld-based patches
 */
export function createMeldPatchManager(): {
  add: (restores: Array<() => void>) => void;
  restoreAll: () => void;
  clear: () => void;
} {
  const patches: Array<Array<() => void>> = [];

  return {
    add: (restores: Array<() => void>): void => {
      patches.push(restores);
    },
    restoreAll: (): void => {
      patches.forEach((restores) => {
        restores.forEach((restore) => {
          try {
            restore();
          } catch (error: unknown) {
            // Direct console usage is intentional: This utility may be called during cleanup
            // before Angular services are available or after they've been destroyed.
            // eslint-disable-next-line no-console
            console.error('Error restoring meld patch:', error);
          }
        });
      });
      patches.length = 0;
    },
    clear: (): void => {
      patches.length = 0;
    },
  };
}

/**
 * Patch multiple methods with logging, timing, and promise handling using meld AOP.
 *
 * This is a generic utility that can patch any target object's methods, not just SITNA.Map.
 * It provides automatic logging, performance timing, and promise handling for all patched methods.
 *
 * @param definitions - Array of method patch definitions (target, methodName, path)
 * @param logger - Logger instance compatible with LoggingService
 * @returns Array of restore functions to remove the patches
 *
 * @example
 * ```typescript
 * const methodsToPatch = [
 *   {
 *     target: TC.wrap.Map.prototype,
 *     methodName: 'insertLayer',
 *     path: 'TC.wrap.Map.prototype.insertLayer',
 *   },
 *   {
 *     target: TC.control.BasemapSelector.prototype,
 *     methodName: 'render',
 *     path: 'TC.control.BasemapSelector.prototype.render',
 *   },
 * ];
 *
 * const restores = patchMethodsWithLogging(methodsToPatch, this.logger);
 * this.patchManager.add(restores);
 * ```
 *
 * @remarks
 * - Validates that targets and methods exist before patching
 * - Logs method calls with arguments
 * - Measures and logs execution time
 * - Handles promises automatically (logs resolution/rejection)
 * - Logs errors with timing information
 * - Returns empty array if all patches fail validation
 */
export function patchMethodsWithLogging(
  definitions: MethodPatchDefinition[],
  logger: Logger
): Array<() => void> {
  const restores: Array<() => void> = [];

  definitions.forEach(({ target, methodName, path }) => {
    // Validate target exists
    if (!target) {
      logger.debug(`Target not available for ${path}, skipping patch`);
      return;
    }

    // Validate method exists
    const descriptor = Object.getOwnPropertyDescriptor(target, methodName);
    if (!descriptor || typeof descriptor.value !== 'function') {
      logger.debug(`Method ${methodName} not found on ${path}, skipping patch`);
      return;
    }

    try {
      const advice = meld.around(
        target,
        methodName,
        function (this: unknown, joinPoint: MeldJoinPoint): unknown {
          const startTime = performance.now();
          const methodArgs = joinPoint.args;

          logger.debug(`[${path}] Called with args:`, methodArgs);

          try {
            const result = joinPoint.proceed();
            const endTime = performance.now();
            const duration = endTime - startTime;

            logger.debug(
              `[${path}] Completed in ${duration.toFixed(2)}ms`,
              result
            );

            // Handle promises
            if (result instanceof Promise) {
              return result
                .then((resolved) => {
                  logger.debug(`[${path}] Promise resolved:`, resolved);
                  return resolved;
                })
                .catch((error) => {
                  logger.error(`[${path}] Promise rejected:`, error);
                  throw error;
                });
            }

            return result;
          } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;

            logger.error(
              `[${path}] Failed after ${duration.toFixed(2)}ms:`,
              error
            );
            throw error;
          }
        }
      );

      restores.push(() => meld.remove(advice));
      logger.debug(`Applied AOP patch to ${path}`);
    } catch (error) {
      logger.error(`Failed to patch ${path}:`, error);
    }
  });

  return restores;
}

