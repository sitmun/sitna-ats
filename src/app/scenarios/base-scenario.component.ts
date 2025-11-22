import {
  Component,
  type OnInit,
  type OnDestroy,
  afterNextRender,
  inject,
  ChangeDetectorRef,
  NgZone,
  ElementRef,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type SitnaMap from 'api-sitna';
import { SitnaConfigService } from '../services/sitna-config.service';
import { LoggingService } from '../services/logging.service';
import { ErrorHandlingService } from '../services/error-handling.service';
import { ScenarioMapService, type InitializeScenarioMapOptions } from '../services/scenario-map.service';
import { TCNamespaceService } from '../services/tc-namespace.service';
import { SitnaNamespaceService } from '../services/sitna-namespace.service';
import { runInZone } from '../utils/zone-helpers';
import type { SitnaConfig } from '../../types/sitna.types';
import type { ScenarioMetadata } from '../types/scenario.types';

/**
 * Unified patch manager interface that supports both single restore functions
 * (from createPatchManager) and arrays of restore functions (from meld patches).
 */
interface UnifiedPatchManager {
  add: (restore: (() => void) | Array<() => void>) => void;
  restoreAll: () => void;
  clear: () => void;
};

/**
 * Create a unified patch manager that supports both single restore functions
 * and arrays of restore functions.
 */
function createUnifiedPatchManager(): UnifiedPatchManager {
  const patches: Array<() => void> = [];

  return {
    add: (restore: (() => void) | Array<() => void>): void => {
      if (Array.isArray(restore)) {
        // Array of restore functions (from meld patches)
        patches.push(...restore);
      } else {
        // Single restore function (from monkey patches)
        patches.push(restore);
      }
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
 * Base class for scenario components that provides common functionality:
 * - Service injections (SitnaConfigService, LoggingService, ErrorHandlingService, ScenarioMapService)
 * - Optional service injections (TCNamespaceService, ChangeDetectorRef, NgZone)
 * - Standard lifecycle hooks pattern
 * - Common map destruction
 * - Helper methods for map initialization and zone operations
 *
 * Scenario components should extend this class and implement:
 * - `initializeMap()` method for scenario-specific map initialization
 * - Any scenario-specific logic
 */
@Component({
  template: '',
})
export abstract class BaseScenarioComponent implements OnInit, OnDestroy {
  metadata!: ScenarioMetadata;
  map: SitnaMap | null = null;

  protected readonly configService = inject(SitnaConfigService);
  protected readonly logger = inject(LoggingService);
  protected readonly errorHandler = inject(ErrorHandlingService);
  protected readonly scenarioMapService = inject(ScenarioMapService);
  protected readonly tcNamespaceService = inject(TCNamespaceService);
  protected readonly sitnaNamespaceService = inject(SitnaNamespaceService);
  protected readonly cdr = inject(ChangeDetectorRef);
  protected readonly ngZone = inject(NgZone);
  protected readonly elementRef = inject(ElementRef<HTMLElement>);
  protected readonly http = inject(HttpClient);

  /**
   * Patch manager for AOP patches applied to SITNA/TC methods.
   * Supports both single restore functions (from createPatchManager) and
   * arrays of restore functions (from meld patches).
   * Automatically restored in ngOnDestroy.
   */
  protected readonly patchManager = createUnifiedPatchManager();

  /**
   * Cache for control/script loading promises to prevent duplicate loads.
   * Keyed by control name.
   */
  private readonly controlLoadPromises = new Map<string, Promise<void>>();

  /**
   * Track injected style elements by scenario name for cleanup.
   * Keyed by scenario name (or CSS path if scenario name not provided).
   */
  private readonly injectedStyleElements = new Map<string, HTMLStyleElement>();

  constructor() {
    // Metadata must be set by subclass before calling super()
    // Subclasses should call super() and then set this.metadata in their constructor
    afterNextRender(() => {
      this.initializeMap();
    });
  }

  ngOnInit(): void {
    // Map initialization happens in afterNextRender callback
  }

  ngOnDestroy(): void {
    // Restore all AOP patches
    this.patchManager.restoreAll();

    // Remove all injected style elements
    for (const [key, styleElement] of this.injectedStyleElements.entries()) {
      try {
        styleElement.remove();
      } catch (error) {
        // Element may have already been removed
        this.logger.debug(`Style element ${key} already removed or not found`);
      }
    }
    this.injectedStyleElements.clear();

    this.destroyMap();
  }

  /**
   * Initialize the SITNA map with scenario-specific configuration.
   * Default no-op implementation. Override in subclasses to provide custom initialization.
   * Scenarios using `initializeMapWithPreload()` will have this method overridden at runtime.
   */
  protected initializeMap(): void {
    // Default no-op - override in subclasses or use initializeMapWithPreload()
  }

  /**
   * Destroy the map instance and clean up resources.
   * Can be overridden by subclasses for additional cleanup.
   */
  protected destroyMap(): void {
    this.map = null;
  }

  /**
   * Generate a container ID from the scenario metadata route.
   *
   * @returns Container ID (e.g., 'mapa-basic-map-initialization')
   */
  protected getContainerId(): string {
    return this.scenarioMapService.generateContainerId(this.metadata.route);
  }

  /**
   * Initialize a SITNA map with scenario-specific configuration.
   * This is a helper method that standardizes the common map initialization pattern.
   *
   * @param scenarioConfig - The scenario configuration object
   * @param options - Optional callbacks and configuration
   * @returns The initialized map instance, or null if initialization failed
   */
  protected initializeScenarioMapHelper(
    scenarioConfig: SitnaConfig,
    options?: InitializeScenarioMapOptions
  ): SitnaMap | null {
    const containerId = this.getContainerId();
    const componentName = options?.componentName || `${this.constructor.name}.initializeMap`;

    return this.scenarioMapService.initializeScenarioMap(
      scenarioConfig,
      containerId,
      {
        ...options,
        componentName,
      }
    );
  }

  /**
   * Run a callback function in Angular zone with change detection.
   * This is a helper method that wraps the common pattern of running code
   * in the Angular zone and triggering change detection.
   *
   * @param callback - Function to execute in Angular zone
   */
  protected runInZoneHelper(callback: () => void): void {
    runInZone(this.ngZone, this.cdr, callback);
  }


  /**
   * Check if a TC.control property exists.
   *
   * @param controlName - The name of the control (e.g., 'FeatureInfoSilme')
   * @returns True if the control exists in TC.control, false otherwise
   */
  protected isTCControlRegistered(controlName: string): boolean {
    const TC = this.tcNamespaceService.getTC();
    const control = TC?.control as { [key: string]: unknown } | undefined;
    return !!control?.[controlName];
  }

  /**
   * Check if a TC property exists.
   *
   * @param propertyName - The name of the property (e.g., 'apiLocation', 'wrap')
   * @returns True if the property exists in TC, false otherwise
   */
  protected isTCPropertyRegistered(propertyName: string): boolean {
    const TC = this.tcNamespaceService.getTC();
    return !!(TC && TC[propertyName]);
  }

  /**
   * Wait for TC namespace to be available and then apply a patch callback.
   * This helper standardizes the common pattern of waiting for TC before applying patches.
   *
   * @param callback - Function that receives TC namespace and applies patches
   * @returns Promise that resolves when the patch is applied
   */
  protected async waitForTCAndApply(
    callback: (TC: NonNullable<ReturnType<typeof this.tcNamespaceService.getTC>>) => Promise<void>
  ): Promise<void> {
    const TC = await this.tcNamespaceService.waitForTC();
    await callback(TC);
  }

  /**
   * Fix CSS class mismatch in Coordinates control dialog.
   * The ProjectionSelector uses 'tc-ctl-projs-cur-crs-name' but Coordinates dialog
   * template uses 'tc-ctl-coords-cur-crs-name'. This patch fixes the selector.
   */
  protected fixCoordinatesDialogCssClasses(): void {
    if (!this.map) {
      return;
    }

    if (!this.isTCControlRegistered('Coordinates')) {
      return;
    }

    // Get the Coordinates control instance
    const mapAny = this.map as { [key: string]: unknown };
    const getControlsByClass = mapAny['getControlsByClass'] as ((className: string) => unknown[]) | undefined;
    if (!getControlsByClass) {
      return;
    }

    const coordsControls = getControlsByClass('TC.control.Coordinates');
    if (!coordsControls || coordsControls.length === 0) {
      return;
    }

    const coordsControl = coordsControls[0] as {
      _cssClasses?: {
        CURRENT_CRS_NAME?: string;
        CURRENT_CRS_CODE?: string;
        [key: string]: string | undefined;
      };
      showProjectionChangeDialog?: (options?: unknown) => void;
    };

    // Patch _cssClasses to use correct class names for Coordinates dialog
    if (coordsControl._cssClasses) {
      const originalCssClasses = { ...coordsControl._cssClasses };

      // Update CSS classes to match Coordinates dialog template
      coordsControl._cssClasses.CURRENT_CRS_NAME = 'tc-ctl-coords-cur-crs-name';
      coordsControl._cssClasses.CURRENT_CRS_CODE = 'tc-ctl-coords-cur-crs-code';
      coordsControl._cssClasses['CRS_DIALOG'] = 'tc-ctl-coords-crs-dialog';
      coordsControl._cssClasses['CRS_LIST'] = 'tc-ctl-coords-crs-list';

      this.logger.warn('Fixed CSS classes for Coordinates control dialog', {
        original: originalCssClasses,
        patched: coordsControl._cssClasses
      });
    }
  }

  /**
   * Registry of dependency handlers keyed by identifier.
   * Supports exact matches (e.g., 'SITNA.control', 'TC').
   * Subclasses can extend this registry to add custom handlers.
   */
  private readonly dependencyHandlers: Record<string, (identifier: string) => Promise<void>> = {
    'SITNA.control': async () => {
      await this.sitnaNamespaceService.waitForSitnaControl();
    },
    'TC': async () => {
      await this.tcNamespaceService.waitForTC();
    }
  };

  /**
   * Get available dependency handler patterns for error messages.
   *
   * @returns Array of available pattern strings
   */
  private getAvailableDependencyPatterns(): string[] {
    return Object.keys(this.dependencyHandlers);
  }

  /**
   * Find a handler for the given identifier by matching against registry.
   *
   * @param identifier - The dependency identifier to find a handler for
   * @returns The handler function, or undefined if no match found
   */
  private findDependencyHandler(identifier: string): ((identifier: string) => Promise<void>) | undefined {
    return this.dependencyHandlers[identifier];
  }

  /**
   * Convert a dependencies string identifier or array to a Promise-returning function.
   * Uses a registry pattern for extensibility and maintainability.
   *
   * Supported patterns:
   * - 'SITNA.control' -> waits for SITNA.control.Control
   * - 'TC' -> waits for TC namespace (includes core properties like apiLocation and syncLoadJS)
   * - Array of strings -> waits for all in sequence
   * - Function -> returns as-is
   *
   * Subclasses can extend the dependencyHandlers registry to add custom handlers.
   *
   * @param dependencies - String identifier, array of strings, or function
   * @returns Function that returns a Promise<void>
   * @throws Error if identifier is not recognized and lists available patterns
   */
  private resolveDependencies(
    dependencies: string | string[] | (() => Promise<void>)
  ): () => Promise<void> {
    if (typeof dependencies === 'function') {
      return dependencies;
    }

    const identifiers = Array.isArray(dependencies) ? dependencies : [dependencies];

    return async () => {
      for (const identifier of identifiers) {
        const handler = this.findDependencyHandler(identifier);
        if (handler) {
          await handler(identifier);
        } else {
          const availablePatterns = this.getAvailableDependencyPatterns().join(', ');
          throw new Error(
            `Unknown dependency identifier: "${identifier}". Available patterns: ${availablePatterns}`
          );
        }
      }
    };
  }


  /**
   * Ensure a control script is loaded, with promise caching to prevent duplicate loads.
   * This method standardizes the common pattern of loading control scripts.
   *
   * @param options - Configuration options for loading the control
   * @param options.checkLoaded - Optional function to check if control is already loaded.
   *                              Defaults to checking TC.control[controlName] if not provided.
   * @param options.dependencies - Optional string identifier, array of strings, or function to wait for dependencies.
   *                               Uses a registry pattern for extensibility. Built-in patterns:
   *                               - 'SITNA.control': waits for SITNA.control.Control
   *                               - 'TC': waits for TC namespace (includes core properties like apiLocation, syncLoadJS)
   *                               Arrays wait for all identifiers in sequence.
   *                               Subclasses can extend dependencyHandlers registry to add custom patterns.
   * @param options.loadScript - Function that performs the require() call.
   *                            IMPORTANT: The require() call inside the function must use a static string literal for webpack to analyze it.
   * @param options.controlName - Name of the control (used for caching and logging)
   * @returns Promise that resolves when the control is loaded
   */
  protected async ensureControlLoaded(options: {
    checkLoaded?: () => boolean | Promise<boolean>;
    dependencies?: string | string[] | (() => Promise<void>);
    loadScript: () => void;
    controlName: string;
  }): Promise<void> {
    const { checkLoaded, dependencies, loadScript, controlName } = options;

    // Check if already loaded (use default check if not provided)
    const checkFunction = checkLoaded ?? (() => this.isTCControlRegistered(controlName));
    const isLoaded = await checkFunction();
    if (isLoaded) {
      return;
    }

    // Return cached promise if loading is in progress
    const cachedPromise = this.controlLoadPromises.get(controlName);
    if (cachedPromise) {
      return cachedPromise;
    }

    // Create and cache the loading promise
    const loadPromise = (async () => {
      try {
        // Wait for dependencies if provided
        if (dependencies) {
          await this.resolveDependencies(dependencies)();
        }

        // Load the script
        loadScript();
        this.logger.warn(`${controlName} script loaded`);
      } catch (error) {
        this.logger.error(`${controlName} script failed to load`, error);
        // Remove from cache on error so it can be retried
        this.controlLoadPromises.delete(controlName);
        throw error;
      }
    })();

    this.controlLoadPromises.set(controlName, loadPromise);
    return loadPromise;
  }

  /**
   * Initialize map with async preload steps that must complete before map initialization.
   * This helper standardizes the pattern of loading scripts/applying patches before map init.
   *
   * Usage: Call this from constructor after setting metadata.
   * The preload steps will run sequentially, then map will be initialized.
   * This prevents the default afterNextRender callback from initializing the map prematurely.
   *
   * @param options - Configuration options
   * @param options.preloadSteps - Array of async functions to execute sequentially before map init
   * @param options.scenarioConfig - The scenario configuration object
   * @param options.mapOptions - Optional map initialization options (onLoaded, successMessage, etc.)
   * @param options.continueOnError - If true (default), initialize map even if preload fails
   */
  protected initializeMapWithPreload(options: {
    preloadSteps: Array<() => Promise<void>>;
    scenarioConfig: SitnaConfig;
    mapOptions?: InitializeScenarioMapOptions;
    continueOnError?: boolean;
  }): void {
    const { preloadSteps, scenarioConfig, mapOptions, continueOnError = true } = options;

    // Override initializeMap to prevent premature initialization from afterNextRender
    // Store the actual initialization logic
    const doInitializeMap = () => {
      if (this.map === null) {
        this.map = this.initializeScenarioMapHelper(scenarioConfig, mapOptions);
      }
    };

    // Override initializeMap to be a no-op until preload completes
    this.initializeMap = () => {
      // Do nothing - wait for preload steps to complete
    };

    // Execute preload steps sequentially, then initialize map
    (async () => {
      try {
        for (const step of preloadSteps) {
          await step();
        }
        // All preload steps completed successfully
        doInitializeMap();
      } catch (error) {
        this.logger.error('Preload steps failed', error);
        if (continueOnError) {
          // Still initialize map even if preload failed
          doInitializeMap();
        } else {
          // Restore abstract initializeMap (will throw if called)
          this.initializeMap = () => {
            throw new Error('Map initialization prevented due to preload failure');
          };
          throw error;
        }
      }
    })();
  }

  /**
   * Set a global variable with the TC-wrapped map instance from the current map container.
   * This is useful for scenarios where patches or external scripts need access to the internal TC map instance.
   *
   * @param globalVarName - Name of the global variable to set (e.g., 'silmeMap')
   * @param errorMessage - Optional custom error message if setting fails
   * @returns True if the global variable was set successfully, false otherwise
   */
  protected setGlobalTCMapInstance(
    globalVarName: string,
    errorMessage?: string
  ): boolean {
    const TC = this.tcNamespaceService.getTC();
    const mapElement = document.querySelector(`#${this.getContainerId()}`);

    if (!TC || !mapElement) {
      this.runInZoneHelper(() => {});
      return false;
    }

    // Check if global variable is already set
    const windowWithVar = window as unknown as { [key: string]: unknown };
    if (windowWithVar[globalVarName] !== undefined) {
      this.runInZoneHelper(() => {});
      return false;
    }

    try {
      const mapInstance = TC.Map?.get?.(mapElement);
      if (mapInstance) {
        windowWithVar[globalVarName] = mapInstance;
        this.logger.warn(`Set global ${globalVarName} variable`);
        this.runInZoneHelper(() => {});
        return true;
      }
    } catch (error) {
      const message =
        errorMessage ||
        `Could not set ${globalVarName}, patches may not work correctly`;
      this.logger.warn(message, error);
    }

    this.runInZoneHelper(() => {});
    return false;
  }

  /**
   * Inject CSS styles from a string directly into the component's view container.
   * This method is useful when CSS content is imported/bundled at build time.
   *
   * @param cssContent - CSS content as a string
   * @param scenarioName - Optional scenario identifier for tracking. Defaults to this.metadata.route
   * @returns void (synchronous, no promise needed)
   *
   * @example
   * ```typescript
   * const cssContent = require('./styles.css?raw') as string;
   * this.injectStylesFromString(cssContent, 'my-scenario');
   * ```
   */
  protected injectStylesFromString(
    cssContent: string,
    scenarioName?: string
  ): void {
    const key = scenarioName || this.metadata.route;

    // Check if already injected
    if (this.injectedStyleElements.has(key)) {
      return; // Already injected
    }

    // Create style element
    const styleElement = document.createElement('style');
    styleElement.textContent = cssContent;
    styleElement.setAttribute('data-scenario', key);
    styleElement.setAttribute('data-injected-at', new Date().toISOString());

    // Append to component's native element (scoped to component view container)
    this.elementRef.nativeElement.appendChild(styleElement);
    this.injectedStyleElements.set(key, styleElement);

    // Log success with verification info
    this.logger.warn(`Injected CSS styles from string into component view container`, {
      styleElementId: styleElement.getAttribute('data-scenario'),
      cssLength: cssContent.length,
      parentElement: this.elementRef.nativeElement.tagName,
      parentId: this.elementRef.nativeElement.id || 'no-id',
      verification: `Check browser DevTools: Elements tab -> look for <style data-scenario="${key}">`,
    });

    // Verify injection by checking if style element is actually in the component's native element
    // Use setTimeout to allow DOM to update, then verify
    setTimeout(() => {
      const isInComponent = this.elementRef.nativeElement.contains(styleElement);
      const foundInDocument = document.querySelector(`style[data-scenario="${key}"]`);

      if (isInComponent && foundInDocument) {
        this.logger.warn('Style injection verified: <style> element found in component and document');
      } else if (isInComponent) {
        this.logger.warn('Style injection verified: <style> element found in component (may not be queryable via document.querySelector)');
      } else {
        this.logger.error('Style injection verification failed: <style> element not found in component', {
          isInComponent,
          foundInDocument: !!foundInDocument,
          styleElementParent: styleElement.parentElement?.tagName,
        });
      }
    }, 0);
  }

  /**
   * Initialize map with control loading pattern.
   * This helper standardizes the pattern of loading a control script before map initialization
   * so SITNA can auto-instantiate it from the standard "controls" configuration.
   *
   * Usage: Call this from initializeMap() method.
   *
   * The control must be registered in TC.control namespace (e.g., TC.control.HelloWorld)
   * and included in the scenario config as "controls": { "controlName": {...} }.
   *
   * @param options - Configuration options
   * @param options.scenarioConfig - The scenario configuration object
   * @param options.controlName - Name of the control (used for caching and logging)
   * @param options.checkLoaded - Optional function to check if control is already loaded.
   *                              Defaults to checking TC.control[controlName] if not provided.
   * @param options.dependencies - Optional string identifier, array of strings, or function to wait for dependencies.
   *                               Uses a registry pattern for extensibility. Built-in patterns:
   *                               - 'SITNA.control': waits for SITNA.control.Control
   *                               - 'TC': waits for TC namespace (includes core properties like apiLocation, syncLoadJS)
   *                               Arrays wait for all identifiers in sequence.
   *                               Subclasses can extend dependencyHandlers registry to add custom patterns.
   * @param options.loadScript - Function that performs the require() call.
   *                            IMPORTANT: The require() call inside the function must use a static string literal for webpack to analyze it.
   * @param options.addControl - Optional callback called after map is loaded (for logging or verification).
   *                            Controls are auto-instantiated by SITNA from config, so this is typically a no-op.
   * @param options.mapOptions - Optional map initialization options (merged with onLoaded callback)
   */
  protected initializeMapWithControl(options: {
    scenarioConfig: SitnaConfig;
    controlName: string;
    checkLoaded?: () => boolean | Promise<boolean>;
    dependencies?: string | string[] | (() => Promise<void>);
    loadScript: () => void;
    addControl?: (map: SitnaMap) => void | Promise<void>;
    mapOptions?: InitializeScenarioMapOptions;
  }): void {
    const {
      scenarioConfig,
      controlName,
      checkLoaded,
      dependencies,
      loadScript,
      addControl,
      mapOptions = {},
    } = options;

    // Load control before map initialization so SITNA can auto-instantiate it from config
    (async () => {
      try {
        await this.ensureControlLoaded({
          checkLoaded: checkLoaded ?? (() => this.isTCControlRegistered(controlName)),
          dependencies,
          loadScript,
          controlName,
        });
      } catch (error) {
        this.logger.error(
          `Failed to load ${controlName} before map initialization, initializing map anyway`,
          error
        );
      }
      // Initialize map after control is loaded (or if loading failed)
      this.map = this.initializeScenarioMapHelper(scenarioConfig, {
        ...mapOptions,
        onLoaded: async (map) => {
          // Call original onLoaded if provided
          if (mapOptions.onLoaded) {
            await mapOptions.onLoaded(map);
          }
          // Optional callback for logging or verification
          // Control is auto-instantiated by SITNA from config, so this is typically a no-op
          if (addControl) {
            try {
              await addControl(map);
            } catch (error) {
              this.errorHandler.handleError(
                error,
                `${this.constructor.name}.addControl`
              );
            }
          }
        },
      });
    })();
  }
}

