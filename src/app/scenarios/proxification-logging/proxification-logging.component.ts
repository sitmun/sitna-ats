import {
  Component,
  type OnInit,
  type OnDestroy,
  afterNextRender,
  inject,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import type SitnaMap from 'api-sitna';
import { SitnaConfigService } from '../../services/sitna-config.service';
import scenarioConfigJson from './sitna-config.json';
import type { SitnaConfig } from '../../types/sitna.types';
import { LoggingService } from '../../services/logging.service';
import { ErrorHandlingService } from '../../services/error-handling.service';
import type { ScenarioMetadata } from '../../types/scenario.types';
import {
  patchFunction,
  createPatchManager,
  type PatchManager,
} from '../../utils/monkey-patch';

export interface CallerInfo {
  functionName?: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  stackTrace?: string;
  stackDepth?: number;
}

export interface ProxificationLogEntry {
  id: string; // Unique ID for removal
  timestamp: number;
  method: string;
  type: 'constructor' | 'method' | 'error' | 'result';
  args?: unknown[];
  result?: unknown;
  error?: unknown;
  instanceId?: string;
  requestId?: string; // Links method calls with their results/errors
  callerInfo?: CallerInfo; // Information about where the call originated
  duration?: number; // Duration in milliseconds for async operations
}

/**
 * Type definition for TC.tool.Proxification constructor
 */
type ProxificationConstructor = new (
  proxy: unknown,
  options?: unknown
) => object;

/**
 * Type definition for TC.tool namespace
 */
interface TCToolNamespace {
  Proxification?: ProxificationConstructor;
  [key: string]: unknown;
}

/**
 * Type definition for TC namespace
 */
interface TCNamespace {
  tool?: TCToolNamespace;
  loadProjDefAsync?: (...args: unknown[]) => Promise<unknown>;
  [key: string]: unknown;
}

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'Proxification Logging',
  description: 'Log all TC.tool.Proxification calls and behavior',
  tags: ['proxification', 'logging', 'debugging', 'network'],
  route: 'proxification-logging',
};

@Component({
  selector: 'app-proxification-logging',
  templateUrl: './proxification-logging.component.html',
  styleUrls: ['./proxification-logging.component.scss'],
})
export class ProxificationLoggingComponent
  implements OnInit, OnDestroy
{
  readonly metadata = SCENARIO_METADATA;

  // ============================================================================
  // Constants
  // ============================================================================

  /** Interval between patching state checks in milliseconds */
  private static readonly PATCHING_CHECK_INTERVAL_MS = 100;

  /** Maximum number of patching checks before timeout (10 seconds total) */
  private static readonly MAX_PATCHING_CHECKS = 100;

  /** Interval between patching retry attempts in milliseconds */
  private static readonly PATCHING_RETRY_INTERVAL_MS = 100;

  /** Maximum number of patching retry attempts (5 seconds total) */
  private static readonly MAX_PATCHING_RETRIES = 50;

  /** Delay before attempting to patch after Proxification is loaded */
  private static readonly PATCHING_DELAY_MS = 50;

  /** Delay before attempting to patch after TC.tool.Proxification is assigned */
  private static readonly TOOL_NAMESPACE_DELAY_MS = 10;

  /** Methods to patch on Proxification prototype */
  private static readonly PROXIFICATION_PROTOTYPE_METHODS = [
    'fetchImage',
    'fetch',
    'fetchJSON',
    'fetchXML',
    'fetchBlob',
    'fetchImageAsBlob',
    'fetchFile',
    'fetchRetry',
    'fetchSync',
    '_isSameOrigin',
    '_isSecureURL',
    '_actionDirect',
    '_actionProxy',
    '_actionHTTP',
    '_actionHTTPS',
    '_isServiceWorker',
  ] as const;

  /** Methods to patch on Proxification instances */
  private static readonly PROXIFICATION_INSTANCE_METHODS = [
    'fetch',
    'fetchImage',
    'fetchJSON',
    'fetchXML',
    'fetchBlob',
  ] as const;

  // ============================================================================
  // Public Properties
  // ============================================================================

  map: SitnaMap | null = null;
  logs: ProxificationLogEntry[] = [];
  filteredLogs: ProxificationLogEntry[] = [];
  filterMethod: string = 'all';
  filterType: string = 'all';
  filterInstanceId: string = 'all';
  filterSearchText: string = '';
  sortOrder: 'newest' | 'oldest' = 'newest';
  isMapLoading: boolean = true;
  statistics = {
    totalCalls: 0,
    methodCounts: new Map<string, number>(),
    errorCount: 0,
    instanceCount: 0,
  };

  // Debug maps for easy inspection
  public readonly debugMaps = {
    // Map of instance IDs to their proxy functions
    instanceProxies: new Map<string, unknown>(),
    // Map of instance IDs to their options
    instanceOptions: new Map<string, unknown>(),
    // Map of instances to their call counts
    instanceCallCounts: new Map<string, Map<string, number>>(),
  };

  // ============================================================================
  // Private Properties
  // ============================================================================

  private readonly configService = inject(SitnaConfigService);
  private readonly logger = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlingService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly snackBar = inject(MatSnackBar);
  private patchManager: PatchManager = createPatchManager();
  private instanceCounter = 0;
  private instanceMap = new WeakMap<object, string>();
  private patchingState: 'idle' | 'patching' | 'patched' = 'idle';
  private requestIdCounter = 0;
  private pendingRequests = new Map<string, ProxificationLogEntry>(); // Maps requestId to method call log
  private activeIntervals: Set<NodeJS.Timeout> = new Set(); // Track intervals for cleanup

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Helper method to safely access TC from window or globalThis.
   * TC is exposed as globalThis.TC in sitna.js
   *
   * @returns TC namespace if available, undefined otherwise
   */
  private getTC(): TCNamespace | undefined {
    return (window as { TC?: TCNamespace }).TC || (globalThis as { TC?: TCNamespace }).TC;
  }

  /**
   * Capture and parse stack trace to extract caller information.
   * Filters out frames from our patching code to show the actual caller.
   *
   * @returns Caller information object or undefined if stack trace is unavailable
   */
  private captureCallerInfo(): CallerInfo | undefined {
    try {
      const error = new Error();
      if (!error.stack) {
        return undefined;
      }

      const stackLines = error.stack.split('\n');
      // Skip the first line (Error message) and the second line (this function)
      // Look for the first frame that's not from our patching code
      let callerLine: string | undefined;
      let stackDepth = 0;

      for (let i = 2; i < stackLines.length; i++) {
        const line = stackLines[i].trim();
        // Skip lines from our patching code
        if (
          line.includes('proxification-logging.component') ||
          line.includes('ProxificationLoggingComponent') ||
          line.includes('patchFunction') ||
          line.includes('monkey-patch')
        ) {
          continue;
        }
        callerLine = line;
        stackDepth = i - 2;
        break;
      }

      if (!callerLine) {
        return {
          stackTrace: error.stack,
          stackDepth: 0,
        };
      }

      // Parse stack trace line
      // Format examples:
      // "at functionName (file:///path/to/file.js:123:45)"
      // "at Object.functionName (file:///path/to/file.js:123:45)"
      // "at file:///path/to/file.js:123:45"
      const match = callerLine.match(
        /at\s+(?:([^\s(]+)\s+)?(?:\((.+?):(\d+):(\d+)\)|(.+?):(\d+):(\d+))/
      );

      if (match) {
        const functionName = match[1] || undefined;
        const fileName = match[2] || match[5] || undefined;
        const lineNumber = match[3] ? parseInt(match[3], 10) : match[6] ? parseInt(match[6], 10) : undefined;
        const columnNumber = match[4] ? parseInt(match[4], 10) : match[7] ? parseInt(match[7], 10) : undefined;

        return {
          functionName,
          fileName: fileName ? this.truncateFilePath(fileName) : undefined,
          lineNumber,
          columnNumber,
          stackTrace: error.stack,
          stackDepth,
        };
      }

      return {
        stackTrace: error.stack,
        stackDepth,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Truncate file path for display, showing only the last parts if too long.
   *
   * @param filePath - Full file path to truncate
   * @param maxLength - Maximum length before truncation (default: 80)
   * @returns Truncated file path
   */
  private truncateFilePath(filePath: string, maxLength: number = 80): string {
    if (filePath.length <= maxLength) {
      return filePath;
    }
    // Show last part of path
    const parts = filePath.split('/');
    if (parts.length > 1) {
      return `.../${  parts.slice(-2).join('/')}`;
    }
    return `...${  filePath.slice(-maxLength + 3)}`;
  }

  /**
   * Generate a unique request ID for linking method calls with results.
   *
   * @returns Unique request ID string
   */
  private generateRequestId(): string {
    return `req-${++this.requestIdCounter}-${Date.now()}`;
  }

  // ============================================================================
  // Log Entry Creation Methods
  // ============================================================================

  /**
   * Create a method call log entry.
   *
   * @param methodName - Name of the method being called
   * @param instanceId - ID of the Proxification instance
   * @param args - Arguments passed to the method
   * @param requestId - Unique request ID for linking with results
   * @param callerInfo - Optional caller information from stack trace
   * @returns Log entry object (without id, which is added by addLog)
   */
  private createMethodLogEntry(
    methodName: string,
    instanceId: string,
    args: unknown[],
    requestId: string,
    callerInfo?: CallerInfo
  ): ProxificationLogEntry {
    return {
      id: '', // Will be set by addLog
      timestamp: Date.now(),
      method: methodName,
      type: 'method',
      args: [...args],
      instanceId,
      requestId,
      callerInfo,
    };
  }

  /**
   * Create a result log entry for a completed method call.
   *
   * @param methodName - Name of the method that completed
   * @param instanceId - ID of the Proxification instance
   * @param requestId - Unique request ID linking to the method call
   * @param result - Result value returned by the method
   * @param duration - Duration of the method call in milliseconds
   * @param callerInfo - Optional caller information
   * @returns Log entry object (without id, which is added by addLog)
   */
  private createResultLogEntry(
    methodName: string,
    instanceId: string,
    requestId: string,
    result: unknown,
    duration: number,
    callerInfo?: CallerInfo
  ): Omit<ProxificationLogEntry, 'id'> {
    return {
      timestamp: Date.now(),
      method: methodName,
      type: 'result',
      result,
      instanceId,
      requestId,
      duration,
      callerInfo,
    };
  }

  /**
   * Create an error log entry for a failed method call.
   *
   * @param methodName - Name of the method that failed
   * @param instanceId - ID of the Proxification instance
   * @param requestId - Unique request ID linking to the method call
   * @param error - Error that occurred
   * @param duration - Optional duration before error occurred
   * @param callerInfo - Optional caller information
   * @returns Log entry object (without id, which is added by addLog)
   */
  private createErrorLogEntry(
    methodName: string,
    instanceId: string,
    requestId: string,
    error: unknown,
    duration?: number,
    callerInfo?: CallerInfo
  ): Omit<ProxificationLogEntry, 'id'> {
    return {
      timestamp: Date.now(),
      method: methodName,
      type: 'error',
      error,
      instanceId,
      requestId,
      duration,
      callerInfo,
    };
  }

  // ============================================================================
  // Patching and Logging Methods
  // ============================================================================

  /**
   * Wrap a promise with logging for result/error handling.
   *
   * @param promise - Promise to wrap
   * @param methodName - Name of the method that returned the promise
   * @param instanceId - ID of the Proxification instance
   * @param requestId - Unique request ID for linking
   * @param startTime - Timestamp when the method was called
   * @param logLevel - Log level to use (default: 'warn')
   * @returns Wrapped promise that logs results and errors
   */
  private wrapPromiseWithLogging<T>(
    promise: Promise<T>,
    methodName: string,
    instanceId: string,
    requestId: string,
    startTime: number,
    logLevel: 'debug' | 'warn' | 'error' = 'warn'
  ): Promise<T> {
    return promise
      .then((resolved: T) => {
        const duration = Date.now() - startTime;
        const methodCall = this.pendingRequests.get(requestId);
        this.addLog(
          this.createResultLogEntry(
            methodName,
            instanceId,
            requestId,
            resolved,
            duration,
            methodCall?.callerInfo
          )
        );
        this.pendingRequests.delete(requestId);
        this.logger[logLevel](
          `[Proxification.${methodName}] Resolved (${duration}ms) - ${instanceId}`,
          resolved
        );
        return resolved;
      })
      .catch((error: unknown) => {
        const duration = Date.now() - startTime;
        this.statistics.errorCount++;
        const methodCall = this.pendingRequests.get(requestId);
        this.addLog(
          this.createErrorLogEntry(
            methodName,
            instanceId,
            requestId,
            error,
            duration,
            methodCall?.callerInfo
          )
        );
        this.pendingRequests.delete(requestId);
        this.logger.error(
          `[Proxification.${methodName}] Rejected (${duration}ms) - ${instanceId}`,
          error
        );
        throw error;
      });
  }

  /**
   * Create a patched method wrapper that logs calls, results, and errors.
   *
   * @param methodName - Name of the method to patch
   * @param original - Original method function
   * @param getInstanceId - Function to get instance ID from 'this' context
   * @param logLevel - Log level to use (default: 'warn')
   * @returns Patched method function
   */
  private createPatchedMethod(
    methodName: string,
    original: (this: unknown, ...args: unknown[]) => unknown,
    getInstanceId: (thisArg: unknown) => string,
    logLevel: 'debug' | 'warn' | 'error' = 'warn'
  ): (this: unknown, ...args: unknown[]) => unknown {
    const self = this;
    return function (this: unknown, ...args: unknown[]): unknown {
      const instanceId = getInstanceId(this);
      const startTime = Date.now();
      const requestId = self.generateRequestId();
      const callerInfo = self.captureCallerInfo();

      const methodLog = self.createMethodLogEntry(
        methodName,
        instanceId,
        args,
        requestId,
        callerInfo
      );

      self.addLog(methodLog);
      self.pendingRequests.set(requestId, methodLog);

      self.logger[logLevel](
        `[Proxification.${methodName}] Called - ${instanceId}`,
        args
      );

      try {
        const result = original.apply(this, args);

        // Handle promises
        if (result && typeof result === 'object' && 'then' in result && typeof (result as { then: unknown }).then === 'function') {
          return self.wrapPromiseWithLogging(
            result as Promise<unknown>,
            methodName,
            instanceId,
            requestId,
            startTime,
            logLevel
          ) as unknown;
        }

        // Synchronous result
        const duration = Date.now() - startTime;
        const methodCall = self.pendingRequests.get(requestId);
        self.addLog(
          self.createResultLogEntry(
            methodName,
            instanceId,
            requestId,
            result,
            duration,
            methodCall?.callerInfo
          )
        );
        self.pendingRequests.delete(requestId);

        self.logger[logLevel](
          `[Proxification.${methodName}] Returned (${duration}ms) - ${instanceId}`,
          result
        );

        return result;
      } catch (error: unknown) {
        self.statistics.errorCount++;
        const methodCall = self.pendingRequests.get(requestId);
        self.addLog(
          self.createErrorLogEntry(
            methodName,
            instanceId,
            requestId,
            error,
            undefined,
            methodCall?.callerInfo
          )
        );
        self.pendingRequests.delete(requestId);

        self.logger.error(
          `[Proxification.${methodName}] Threw - ${instanceId}`,
          error
        );

        throw error;
      }
    };
  }

  // ============================================================================
  // Lifecycle Hooks
  // ============================================================================

  constructor() {
    afterNextRender(() => {
      // Setup patching first, then initialize map after patching is confirmed
      this.setupProxificationPatching().then(() => {
        this.initializeMap();
      }).catch((error) => {
        this.logger.error('Failed to setup proxification patching', error);
        // Still try to initialize map even if patching fails
        this.initializeMap();
      });
    });
  }

  ngOnInit(): void {
    // Patching and map initialization happen in afterNextRender callback
  }

  ngOnDestroy(): void {
    // Clean up all active intervals
    this.activeIntervals.forEach((interval) => clearInterval(interval));
    this.activeIntervals.clear();

    // Restore all patches
    this.patchManager.restoreAll();

    // Destroy map
    this.destroyMap();
  }

  /**
   * Setup proxification patching by ensuring Proxification is loaded and applying patches.
   * Waits for patching to complete before resolving to ensure all calls are intercepted.
   */
  private async setupProxificationPatching(): Promise<void> {
    this.logger.debug('[Proxification Patching] Starting setup...');

    try {
      // First, ensure Proxification is loaded before attempting to patch
      await this.ensureProxificationLoaded();

      // Patch TC.loadProjDefAsync (which also loads Proxification lazily)
      // This ensures we catch any future lazy loads
      this.patchLoadProjDefAsync();

      // Try to patch - Proxification should be available
      const patched = this.attemptPatching();

      if (patched) {
        // Patching succeeded immediately
        this.logger.debug('[Proxification Patching] Patching completed successfully');
        return;
      }

      // Patching will happen asynchronously, wait for it
      // CRITICAL: Only resolve when patchingState is 'patched', don't proceed with map initialization
      // until patching is confirmed, otherwise capabilities calls will happen before interception
      await this.waitForPatching();
    } catch (error: unknown) {
      this.logger.error('[Proxification Patching] Setup failed', error);
      throw error;
    }
  }

  /**
   * Wait for patching to complete by polling the patching state.
   * Times out after MAX_PATCHING_CHECKS intervals.
   */
  private waitForPatching(): Promise<void> {
    return new Promise((resolve) => {
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        if (this.patchingState === 'patched') {
          clearInterval(checkInterval);
          this.activeIntervals.delete(checkInterval);
          // Verify the patch is actually in place before proceeding
          const TC = this.getTC();
          const tool = TC?.tool;
          const isPatched = tool?.Proxification && typeof tool.Proxification === 'function';
          this.logger.debug('[Proxification Patching] Patch verified:', isPatched);
          if (!isPatched) {
            this.logger.error('Proxification patch verification failed');
          }
          resolve();
        } else if (checkCount >= ProxificationLoggingComponent.MAX_PATCHING_CHECKS) {
          clearInterval(checkInterval);
          this.activeIntervals.delete(checkInterval);
          this.logger.error(
            `Proxification patching timed out after ${ProxificationLoggingComponent.MAX_PATCHING_CHECKS * ProxificationLoggingComponent.PATCHING_CHECK_INTERVAL_MS / 1000} seconds`
          );
          resolve(); // Still resolve to allow map initialization
        } else if (checkCount % 10 === 0) {
          // Log progress every second
          this.logger.debug(
            `[Proxification Patching] Waiting... (${checkCount}/${ProxificationLoggingComponent.MAX_PATCHING_CHECKS})`
          );
        }
      }, ProxificationLoggingComponent.PATCHING_CHECK_INTERVAL_MS);
      this.activeIntervals.add(checkInterval);
    });
  }

  /**
   * Ensure TC.tool.Proxification is loaded before patching.
   * This forces the dynamic import if it hasn't been loaded yet.
   * Uses the same pattern as TC.js line 431: TC.tool.Proxification = (await import(...)).default
   */
  private async ensureProxificationLoaded(): Promise<void> {
    this.logger.debug('[Proxification Patching] ensureProxificationLoaded called');
    const TC = this.getTC();
    this.logger.debug('[Proxification Patching] TC available:', !!TC);
    if (!TC) {
      this.logger.error('[Proxification Patching] TC not available!');
      return;
    }

    // Ensure TC.tool exists (it should, but be safe)
    if (!TC.tool) {
      TC.tool = {};
      this.logger.debug('[Proxification Patching] Created TC.tool');
    }

    // Check if Proxification is already loaded
    const tool = TC.tool;
    this.logger.debug('[Proxification Patching] Checking if Proxification exists:', !!tool.Proxification);
    if (tool.Proxification) {
      this.logger.debug('[Proxification Patching] Proxification already loaded:', typeof tool.Proxification);
      return;
    }

    // Proxification not loaded yet, force load it using the same pattern as TC.js
    this.logger.info('[Proxification Patching] Proxification not loaded, forcing import...');
    try {
      // Use the same dynamic import pattern as TC.js line 431:
      // TC.tool.Proxification = (await import('./TC/tool/Proxification')).default;
      const proxificationModule = await import('api-sitna/TC/tool/Proxification');
      this.logger.debug('[Proxification Patching] Module imported:', !!proxificationModule);
      const Proxification = proxificationModule.default;
      this.logger.debug('[Proxification Patching] Default export:', typeof Proxification, !!Proxification);

      if (Proxification) {
        // Set it directly on TC.tool.Proxification (exactly as TC.js does)
        // TC.tool.Proxification = (await import(...)).default;
        if (TC.tool) {
          TC.tool.Proxification = Proxification as ProxificationConstructor;
          this.logger.info('Proxification loaded and set on TC.tool.Proxification successfully');
          this.logger.debug('[Proxification Patching] Proxification set on TC.tool.Proxification:', !!TC.tool.Proxification);
          this.logger.debug('[Proxification Patching] Verification - TC.tool.Proxification:', !!TC.tool?.Proxification);
        }
      } else {
        this.logger.error('[Proxification Patching] Default export is missing!');
      }
    } catch (error: unknown) {
      this.logger.error('[Proxification Patching] Failed to load module:', error);
      // Continue anyway - maybe it will be loaded later
    }
  }

  /**
   * Attempt to patch TC.tool.Proxification constructor and prototype methods.
   * Returns true if patching succeeded immediately, false if it will retry asynchronously.
   */
  private attemptPatching(): boolean {
    this.logger.debug('[Proxification Patching] attemptPatching called, patchingState:', this.patchingState);
    if (this.patchingState === 'patching' || this.patchingState === 'patched') {
      return this.patchingState === 'patched';
    }

    const TC = this.getTC();
    this.logger.debug('[Proxification Patching] TC available:', !!TC);
    const tool = TC?.tool;
    this.logger.debug('[Proxification Patching] tool available:', !!tool);
    this.logger.debug('[Proxification Patching] Proxification available:', !!tool?.Proxification);

    if (!tool?.Proxification) {
      this.logger.warn('[Proxification Patching] Proxification not available, will retry...');
      // Retry after a short delay
      this.schedulePatchingRetry();
      return false; // Not patched yet, will retry
    }

    this.patchingState = 'patching';
    this.logger.info('[Proxification Patching] Proxification found! Applying patches...');
    this.logger.debug('[Proxification Patching] Proxification type:', typeof tool.Proxification);
    this.logger.debug('[Proxification Patching] Proxification constructor:', tool.Proxification);

    // Patch constructor to track instances
    const OriginalConstructor = tool.Proxification;
    const self = this;

    this.logger.debug('[Proxification Patching] Patching constructor...');
    const constructorPatch = patchFunction(
      tool as Record<string, unknown>,
      'Proxification',
      function (
        this: unknown,
        proxy: unknown,
        options?: unknown
      ): unknown {
        self.logger.debug('[Proxification Patching] PATCHED CONSTRUCTOR CALLED!');
        const instance = new OriginalConstructor(proxy, options);
        const instanceId = `instance-${++self.instanceCounter}`;
        self.instanceMap.set(instance, instanceId);
        self.statistics.instanceCount++;

        // Store in debug maps
        self.debugMaps.instanceProxies.set(instanceId, proxy);
        self.debugMaps.instanceOptions.set(instanceId, options);
        self.debugMaps.instanceCallCounts.set(instanceId, new Map<string, number>());

        // Expose to window for easy console debugging
        (window as { proxificationDebug?: typeof self.debugMaps }).proxificationDebug = self.debugMaps;

        const callerInfo = self.captureCallerInfo();
        self.addLog({
          timestamp: Date.now(),
          method: 'Proxification',
          type: 'constructor',
          args: [proxy, options],
          instanceId,
          callerInfo,
        });

        self.logger.info(
          `[Proxification] Constructor called - ${instanceId}`,
          { proxy, options }
        );

        return instance;
      }
    );

    this.patchManager.add(constructorPatch.restore);
    this.logger.debug('[Proxification Patching] Constructor patch added to manager');

    // Patch prototype methods (applies to all instances)
    this.logger.debug('[Proxification Patching] Patching prototype methods...');
    this.patchPrototypeMethods();

    // CRITICAL: Patch Layer constructor to intercept proxificationTool creation
    // Layer.js imports Proxification at module load time, so we need to intercept
    // when it creates instances in the constructor (line 131: self.proxificationTool = new Proxification(TC.proxify))
    this.logger.debug('[Proxification Patching] Patching Layer constructor to intercept proxificationTool creation...');
    this.patchLayerConstructor();

    this.patchingState = 'patched';
    this.logger.info('Proxification patching completed');
    this.logger.debug('[Proxification Patching] Patching completed! patchingState:', this.patchingState);
    this.logger.debug('[Proxification Patching] Final verification - TC.tool.Proxification:', !!TC?.tool?.Proxification);
    return true; // Successfully patched
  }

  /**
   * Schedule a retry attempt for patching when Proxification becomes available.
   */
  private schedulePatchingRetry(): void {
    let retries = 0;
    const self = this;
    const retryInterval = setInterval(() => {
      retries++;
      if (retries >= ProxificationLoggingComponent.MAX_PATCHING_RETRIES) {
        clearInterval(retryInterval);
        self.activeIntervals.delete(retryInterval);
        self.logger.warn(
          'TC.tool.Proxification not available after retries'
        );
        return;
      }
      const currentTC = self.getTC();
      const currentTool = currentTC?.tool;
      if (currentTool?.Proxification && self.patchingState !== 'patched') {
        clearInterval(retryInterval);
        self.activeIntervals.delete(retryInterval);
        self.attemptPatching();
      }
    }, ProxificationLoggingComponent.PATCHING_RETRY_INTERVAL_MS);
    this.activeIntervals.add(retryInterval);
  }

  /**
   * Patch SITNA.layer.Layer to intercept proxificationTool creation and usage.
   * Layer.js imports Proxification at module load time (line 5), so it uses the imported reference.
   * In the constructor (line 131), it creates: self.proxificationTool = new Proxification(TC.proxify)
   *
   * Since the import is cached, we need to:
   * 1. Patch getCapabilitiesOnline to intercept when proxificationTool is used
   * 2. Ensure proxificationTool methods are patched even if the instance wasn't created through our patched constructor
   */
  private patchLayerConstructor(): void {
    const SITNA = window.SITNA;
    const layer = SITNA?.['layer'] as { Layer?: { prototype?: Record<string, unknown> } } | undefined;

    if (!layer?.Layer?.prototype) {
      this.logger.warn('[Proxification Patching] SITNA.layer.Layer not found, cannot patch Layer methods');
      return;
    }

    const LayerProto = layer.Layer.prototype;
    const self = this;

    // Patch getCapabilitiesOnline to intercept proxificationTool.fetch calls
    const getCapabilitiesOnline = LayerProto['getCapabilitiesOnline'] as (() => Promise<unknown>) | undefined;
    if (getCapabilitiesOnline && typeof getCapabilitiesOnline === 'function') {
      const original = getCapabilitiesOnline;
      LayerProto['getCapabilitiesOnline'] = function (this: { proxificationTool?: { fetch?: unknown } }): Promise<unknown> {
        self.logger.debug('[Proxification Patching] getCapabilitiesOnline called');

        // Ensure proxificationTool methods are patched
        const proxificationTool = this.proxificationTool;
        if (proxificationTool && typeof proxificationTool === 'object') {
          const instanceId = self.instanceMap.get(proxificationTool as object);
          if (!instanceId) {
            // This instance wasn't created through our patched constructor
            // Track it and ensure its methods are patched
            const newInstanceId = `instance-${++self.instanceCounter}`;
            self.instanceMap.set(proxificationTool as object, newInstanceId);
            self.statistics.instanceCount++;
            self.logger.warn(`[Proxification Patching] Found untracked Proxification instance in Layer, tracking as ${newInstanceId}`);

            // Ensure methods are patched on this instance
            self.ensureProxificationInstancePatched(proxificationTool as Record<string, unknown>, newInstanceId);
          }
        }

        // Call original method
        return original.apply(this, []);
      };

      this.patchManager.add(() => {
        LayerProto['getCapabilitiesOnline'] = original;
      });

      this.logger.debug('[Proxification Patching] getCapabilitiesOnline patched to intercept proxificationTool usage');
    } else {
      this.logger.warn('[Proxification Patching] getCapabilitiesOnline method not found');
    }
  }

  /**
   * Ensure a Proxification instance's methods are patched, even if it wasn't created through our patched constructor.
   * This is needed for instances created by Layer.js using the imported Proxification reference.
   */
  private ensureProxificationInstancePatched(instance: Record<string, unknown>, instanceId: string): void {
    const methodsToPatch = ProxificationLoggingComponent.PROXIFICATION_INSTANCE_METHODS;

    methodsToPatch.forEach((methodName) => {
      if (typeof instance[methodName] === 'function' && !instance[`__${methodName}_patched`]) {
        const original = instance[methodName] as (...args: unknown[]) => unknown;
        const logLevel = methodName.startsWith('_') ? 'debug' : 'warn';

        // Special handling for fetch (same as prototype)
        if (methodName === 'fetch') {
          const originalFetch = original as (
            this: unknown,
            url: unknown,
            options?: unknown
          ) => Promise<unknown>;
          const self = this;

          instance[methodName] = function (this: unknown, url: unknown, options?: unknown): Promise<unknown> {
            const fetchStartTime = Date.now();
            const requestId = self.generateRequestId();
            const callerInfo = self.captureCallerInfo();

            const methodLog = self.createMethodLogEntry(
              'fetch',
              instanceId,
              [url, options],
              requestId,
              callerInfo
            );

            self.addLog(methodLog);
            self.pendingRequests.set(requestId, methodLog);

            const result = originalFetch.apply(this, [url, options]);
            return self.wrapPromiseWithLogging(
              result,
              'fetch',
              instanceId,
              requestId,
              fetchStartTime,
              'warn'
            );
          };
        } else {
          // Use common patching helper for other methods
          instance[methodName] = this.createPatchedMethod(
            methodName,
            original,
            () => instanceId, // Fixed instanceId for instance methods
            logLevel
          );
        }

        instance[`__${methodName}_patched`] = true;
      }
    });
  }

  // ============================================================================
  // Patching Setup Methods
  // ============================================================================

  /**
   * Patch TC.loadProjDefAsync to intercept when Proxification is loaded lazily.
   * This ensures we catch any future lazy loads of Proxification.
   *
   * Note: patchModuleExports removed - not needed because:
   * - Proxification.js exports: export default TC.tool.Proxification
   * - This means the default export is just a reference to TC.tool.Proxification
   * - Patching TC.tool.Proxification constructor intercepts ALL instances
   * - No separate patching of module exports is required
   */
  private patchLoadProjDefAsync(): void {
    const TC = this.getTC();
    const loadProjDefAsync = TC?.loadProjDefAsync;

    if (!loadProjDefAsync) {
      // Also try to patch TC.tool directly if it exists
      this.patchToolNamespace();
      return;
    }

    const original = loadProjDefAsync;
    const self = this;

    // Patch the function that loads Proxification
    if (TC) {
      TC.loadProjDefAsync = function (
        ...args: unknown[]
      ): Promise<unknown> {
        self.logger.info('[TC.loadProjDefAsync] Called, will load Proxification');

        // Call original and then attempt patching after it loads
        const result = original.apply(this, args);

      // After Proxification is loaded, ensure we patch it
      result.finally(() => {
        setTimeout(() => self.attemptPatching(), ProxificationLoggingComponent.PATCHING_DELAY_MS);
      });

        return result;
      };

      this.patchManager.add(() => {
        if (TC) {
          TC.loadProjDefAsync = original;
        }
      });
    }

    // Also patch TC.tool namespace to intercept when Proxification is assigned
    this.patchToolNamespace();
  }

  /**
   * Patch TC.tool namespace to intercept when Proxification is assigned.
   * Uses Object.defineProperty to create a setter that triggers patching.
   */
  private patchToolNamespace(): void {
    const TC = this.getTC();
    if (!TC?.tool) {
      return;
    }

    const tool = TC.tool;
    const self = this;

    // Use Object.defineProperty to intercept when Proxification is set
    let proxificationValue: ProxificationConstructor | undefined = tool.Proxification;

    Object.defineProperty(tool, 'Proxification', {
      get: function () {
        return proxificationValue;
      },
      set: function (value: ProxificationConstructor | undefined) {
        proxificationValue = value;
        if (value && self.patchingState !== 'patched') {
          self.logger.info(
            'TC.tool.Proxification was assigned, attempting to patch...'
          );
          setTimeout(() => self.attemptPatching(), ProxificationLoggingComponent.TOOL_NAMESPACE_DELAY_MS);
        }
      },
      configurable: true,
      enumerable: true,
    });

    this.patchManager.add(() => {
      // Restore original if it was a property
      if (proxificationValue && TC.tool) {
        TC.tool.Proxification = proxificationValue;
      }
    });
  }

  /**
   * Patch all prototype methods on TC.tool.Proxification.
   * These patches apply to all instances created after patching.
   */
  private patchPrototypeMethods(): void {
    this.logger.debug('[Proxification Patching] patchPrototypeMethods called');
    const TC = this.getTC();
    const Proxification = TC?.tool?.Proxification;
    this.logger.debug('[Proxification Patching] tool.Proxification:', !!Proxification);
    this.logger.debug('[Proxification Patching] tool.Proxification.prototype:', !!Proxification?.prototype);
    if (!Proxification?.prototype) {
      this.logger.error('[Proxification Patching] No prototype found! Cannot patch methods.');
      return;
    }

    const proto = Proxification.prototype as Record<string, unknown>;
    const methodsToPatch = ProxificationLoggingComponent.PROXIFICATION_PROTOTYPE_METHODS;
    this.logger.debug('[Proxification Patching] Prototype found, methods to patch:', methodsToPatch.length);

    methodsToPatch.forEach((methodName) => {
      if (typeof proto[methodName] === 'function') {
        const original = proto[methodName] as (
          this: unknown,
          ...args: unknown[]
        ) => unknown;
        const self = this;

        // Special handling for fetch method to intercept _makeRequest
        // _makeRequest is a closure inside fetch, so we need to replace fetch entirely
        // and wrap _makeRequest within our replacement
        if (methodName === 'fetch') {
          const originalFetch = original as (
            this: unknown,
            url: unknown,
            options?: unknown
          ) => Promise<unknown>;

          // Store original to restore later
          const originalFetchForRestore = originalFetch;

          // Replace fetch with a version that intercepts _makeRequest
          // Special handling for fetch since _makeRequest is a closure inside it
          proto['fetch'] = function (this: unknown, url: unknown, options?: unknown): Promise<unknown> {
            const instanceId = self.instanceMap.get(this as object) || 'unknown-instance';
            const fetchStartTime = Date.now();
            const requestId = self.generateRequestId();
            const callerInfo = self.captureCallerInfo();

            const methodLog = self.createMethodLogEntry(
              'fetch',
              instanceId,
              [url, options],
              requestId,
              callerInfo
            );

            self.addLog(methodLog);
            self.pendingRequests.set(requestId, methodLog);

            self.logger.warn(
              `[Proxification.fetch] Called - ${instanceId}`,
              { url, options }
            );

            // Call original fetch - it will internally call _makeRequest
            // We can't intercept _makeRequest directly since it's a closure,
            // but we can wrap the original fetch and add logging
            const result = originalFetch.apply(this, [url, options]);

            // Wrap promise with logging
            return self.wrapPromiseWithLogging(
              result,
              'fetch',
              instanceId,
              requestId,
              fetchStartTime,
              'warn'
            );
          };

          this.patchManager.add(() => {
            proto['fetch'] = originalFetchForRestore;
          });

          // Note: _makeRequest is a closure inside fetch and cannot be directly intercepted
          // All _makeRequest calls happen within fetch, so logging fetch captures the behavior
          this.logger.debug(
            '[Proxification Debug] _makeRequest is a closure inside fetch and cannot be directly intercepted. ' +
            'All _makeRequest calls are logged through fetch method calls.'
          );
          return;
        }

        const logLevel = methodName.startsWith('_') ? 'debug' : 'warn';
        const patchedMethod = self.createPatchedMethod(
          methodName,
          original,
          (thisArg: unknown) => self.instanceMap.get(thisArg as object) || 'unknown-instance',
          logLevel
        );

        const patch = patchFunction(proto, methodName, patchedMethod);

        this.patchManager.add(patch.restore);
      }
    });
  }

  // ============================================================================
  // Log Management Methods
  // ============================================================================

  /**
   * Add a log entry to the logs array and update statistics.
   * Runs in Angular zone to trigger change detection.
   *
   * @param entry - Log entry to add (without id)
   */
  private addLog(entry: Omit<ProxificationLogEntry, 'id'>): void {
    // Ensure we're in Angular zone to trigger change detection
    this.ngZone.run(() => {
      const logEntry: ProxificationLogEntry = {
        ...entry,
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      };
      this.logs.push(logEntry);
      this.statistics.totalCalls++;
      const count = this.statistics.methodCounts.get(entry.method) || 0;
      this.statistics.methodCounts.set(entry.method, count + 1);
      this.applyFilters();
      // Trigger change detection to update the UI
      this.cdr.markForCheck();
    });
  }

  // ============================================================================
  // Map Lifecycle Methods
  // ============================================================================

  /**
   * Initialize the SITNA map with scenario-specific configuration.
   */
  private initializeMap(): void {
    // Load scenario-specific config directly
    const scenarioConfig: SitnaConfig = scenarioConfigJson as SitnaConfig;

    // Convert config to map options (doesn't modify global state)
    const scenarioOptions =
      this.configService.applyConfigToMapOptions(scenarioConfig);

    // Initialize map - this should trigger proxification calls
    this.map = this.configService.initializeMap(
      'mapa-proxification-logging',
      scenarioOptions
    );

    if (this.map !== null && this.map !== undefined) {
      this.map
        .loaded()
        .then(() => {
          this.ngZone.run(() => {
            this.isMapLoading = false;
            this.cdr.markForCheck();
          });
          this.logger.warn(
            'Proxification Logging: Map loaded successfully',
            this.map
          );
        })
        .catch((error: unknown) => {
          this.ngZone.run(() => {
            this.isMapLoading = false;
            this.cdr.markForCheck();
          });
          this.errorHandler.handleError(
            error,
            'ProxificationLoggingComponent.initializeMap'
          );
        });
    } else {
      this.ngZone.run(() => {
        this.isMapLoading = false;
        this.cdr.markForCheck();
      });
    }
  }

  /**
   * Destroy the map instance and clean up resources.
   */
  private destroyMap(): void {
    this.map = null;
  }

  // ============================================================================
  // Public UI Methods
  // ============================================================================

  /**
   * Clear all log entries and reset statistics.
   */
  clearLogs(): void {
    const logCount = this.logs.length;
    this.ngZone.run(() => {
      this.logs = [];
      this.statistics = {
        totalCalls: 0,
        methodCounts: new Map(),
        errorCount: 0,
        instanceCount: this.statistics.instanceCount,
      };
      this.applyFilters();
      this.cdr.markForCheck();
    });

    // Show feedback
    if (logCount > 0) {
      this.snackBar.open(`Cleared ${logCount} log entries`, 'Close', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
      });
    }
  }

  /**
   * Export all log entries to a JSON file for download.
   */
  exportLogs(): void {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proxification-logs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Apply filters to logs based on current filter settings and update filteredLogs.
   */
  applyFilters(): void {
    let filtered = this.logs.filter((log) => {
      // Filter by method
      if (this.filterMethod !== 'all' && log.method !== this.filterMethod) {
        return false;
      }
      // Filter by type
      if (this.filterType !== 'all' && log.type !== this.filterType) {
        return false;
      }
      // Filter by instance ID
      if (this.filterInstanceId !== 'all' && log.instanceId !== this.filterInstanceId) {
        return false;
      }
      // Filter by search text
      if (this.filterSearchText.trim()) {
        const searchLower = this.filterSearchText.toLowerCase();
        const methodMatch = log.method.toLowerCase().includes(searchLower);
        const instanceMatch = log.instanceId?.toLowerCase().includes(searchLower) || false;
        const argsMatch = JSON.stringify(log.args || []).toLowerCase().includes(searchLower);
        const resultMatch = JSON.stringify(log.result || '').toLowerCase().includes(searchLower);
        const errorMatch = JSON.stringify(log.error || '').toLowerCase().includes(searchLower);

        if (!methodMatch && !instanceMatch && !argsMatch && !resultMatch && !errorMatch) {
          return false;
        }
      }
      return true;
    });

    // Sort by timestamp
    filtered = [...filtered].sort((a, b) => {
      if (this.sortOrder === 'newest') {
        return b.timestamp - a.timestamp; // Most recent first
      } else {
        return a.timestamp - b.timestamp; // Oldest first
      }
    });

    this.filteredLogs = filtered;
  }

  /**
   * Remove a log entry by ID with undo functionality.
   *
   * @param logId - ID of the log entry to remove
   */
  removeLog(logId: string): void {
    const logIndex = this.logs.findIndex((log) => log.id === logId);
    if (logIndex !== -1) {
      const log = this.logs[logIndex];
      const logCopy = { ...log }; // Create a copy for undo

      this.ngZone.run(() => {
        // Update statistics
        this.statistics.totalCalls--;
        const count = this.statistics.methodCounts.get(log.method) || 0;
        if (count > 0) {
          this.statistics.methodCounts.set(log.method, count - 1);
        }
        if (log.type === 'error') {
          this.statistics.errorCount--;
        }
        // Remove the log
        this.logs.splice(logIndex, 1);
        this.applyFilters();
        this.cdr.markForCheck();
      });

      // Show feedback with undo option
      this.snackBar.open('Log entry removed', 'Undo', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
      }).onAction().subscribe(() => {
        // Restore the log entry
        this.logs.splice(logIndex, 0, logCopy);
        this.statistics.totalCalls++;
        const restoredCount = this.statistics.methodCounts.get(logCopy.method) || 0;
        this.statistics.methodCounts.set(logCopy.method, restoredCount + 1);
        if (logCopy.type === 'error') {
          this.statistics.errorCount++;
        }
        this.applyFilters();
        this.ngZone.run(() => {
          this.cdr.markForCheck();
        });
      });
    }
  }

  /**
   * Get a sorted list of all unique instance IDs from logs.
   *
   * @returns Array of unique instance IDs
   */
  getInstanceIdList(): string[] {
    const instances = new Set<string>();
    this.logs.forEach((log) => {
      if (log.instanceId) {
        instances.add(log.instanceId);
      }
    });
    return Array.from(instances).sort();
  }

  /**
   * Get a sorted list of all unique method names from logs.
   *
   * @returns Array of unique method names
   */
  getMethodList(): string[] {
    const methods = new Set<string>();
    this.logs.forEach((log) => methods.add(log.method));
    return Array.from(methods).sort();
  }

  /**
   * Get the corresponding request (method call) for a result or error log entry
   */
  getRequestContext(log: ProxificationLogEntry): ProxificationLogEntry | undefined {
    if (!log.requestId || (log.type !== 'result' && log.type !== 'error')) {
      return undefined;
    }
    return this.logs.find((l) => l.requestId === log.requestId && l.type === 'method');
  }

  /**
   * Format caller information for display
   */
  formatCallerInfo(callerInfo?: CallerInfo): string {
    if (!callerInfo) {
      return 'Unknown caller';
    }
    const parts: string[] = [];
    if (callerInfo.functionName) {
      parts.push(callerInfo.functionName);
    }
    if (callerInfo.fileName) {
      parts.push(callerInfo.fileName);
      if (callerInfo.lineNumber) {
        parts.push(`:${callerInfo.lineNumber}`);
      }
    }
    return parts.length > 0 ? parts.join(' ') : 'Unknown caller';
  }

  /**
   * Copy log entry to clipboard
   */
  copyToClipboard(log: ProxificationLogEntry): void {
    const logData = {
      ...log,
      callerInfo: log.callerInfo,
      requestContext: this.getRequestContext(log),
    };
    const text = JSON.stringify(logData, null, 2);

    // Modern Clipboard API (supported in all modern browsers)
    // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.snackBar.open('Log entry copied to clipboard', 'Close', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
        });
      }).catch((error: unknown) => {
        this.logger.error('Failed to copy to clipboard', error);
        this.snackBar.open('Failed to copy to clipboard', 'Close', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
        });
      });
    } else {
      // Fallback for browsers without Clipboard API support
      // This should rarely be needed as Clipboard API is supported in:
      // Chrome 66+, Firefox 63+, Safari 13.1+, Edge 79+
      this.logger.warn('Clipboard API not available, clipboard copy may not work');
      this.snackBar.open('Clipboard API not supported in this browser', 'Close', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
      });
    }
  }

  // ============================================================================
  // Formatting Methods
  // ============================================================================

  /**
   * Format a timestamp for display.
   *
   * @param timestamp - Timestamp in milliseconds
   * @returns Formatted time string
   */
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  /**
   * Format a value for display, truncating long strings and objects.
   *
   * @param value - Value to format
   * @returns Formatted string representation
   */
  formatValue(value: unknown): string {
    if (value === null) {return 'null';}
    if (value === undefined) {return 'undefined';}
    if (typeof value === 'string') {
      return value.length > 100 ? `${value.substring(0, 100)  }...` : value;
    }
    if (typeof value === 'object') {
      try {
        const str = JSON.stringify(value);
        return str.length > 200 ? `${str.substring(0, 200)  }...` : str;
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  /**
   * TrackBy function for ngFor to optimize rendering performance.
   *
   * @param index - Index in the array
   * @param log - Log entry
   * @returns Unique identifier for the log entry
   */
  trackByLogId(index: number, log: ProxificationLogEntry): string {
    return log.id;
  }
}

