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
import { firstValueFrom } from 'rxjs';
import type SitnaMap from 'api-sitna';
import { SitnaConfigService } from '../services/sitna-config.service';
import { LoggingService } from '../services/logging.service';
import { ErrorHandlingService } from '../services/error-handling.service';
import { ScenarioMapService, type InitializeScenarioMapOptions } from '../services/scenario-map.service';
import { TCNamespaceService } from '../services/tc-namespace.service';
import { SitnaNamespaceService } from '../services/sitna-namespace.service';
import type { TCNamespace } from '../../types/api-sitna';
import { runInZone } from '../utils/zone-helpers';
import type { SitnaConfig } from '../../types/sitna.types';
import type { ScenarioMetadata } from '../types/scenario.types';
import { createMeldPatchManager } from '../utils/sitna-meld-patch';

/**
 * Unified patch manager interface that supports both single restore functions
 * (from createPatchManager) and arrays of restore functions (from createMeldPatchManager).
 */
type UnifiedPatchManager = {
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
   * arrays of restore functions (from createMeldPatchManager).
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
   * Convert a preLoad string identifier or array to a Promise-returning function.
   * Supports common patterns:
   * - 'sitna-control' -> waits for SITNA.control.Control
   * - 'tc' -> waits for TC namespace
   * - 'tc:propertyPath' -> waits for TC property (e.g., 'tc:apiLocation', 'tc:control.FeatureInfoSilme')
   * - Array of strings -> waits for all in sequence
   * - Function -> returns as-is
   *
   * @param preLoad - String identifier, array of strings, or function
   * @returns Function that returns a Promise<void>
   */
  private resolvePreLoad(
    preLoad: string | string[] | (() => Promise<void>)
  ): () => Promise<void> {
    if (typeof preLoad === 'function') {
      return preLoad;
    }

    const identifiers = Array.isArray(preLoad) ? preLoad : [preLoad];

    return async () => {
      for (const identifier of identifiers) {
        if (identifier === 'sitna-control') {
          await this.sitnaNamespaceService.waitForSitnaControl();
        } else if (identifier === 'tc') {
          await this.tcNamespaceService.waitForTC();
        } else if (identifier.startsWith('tc:')) {
          const propertyPath = identifier.slice(3); // Remove 'tc:' prefix
          await this.tcNamespaceService.waitForTCProperty(propertyPath);
        } else {
          throw new Error(`Unknown preLoad identifier: ${identifier}`);
        }
      }
    };
  }


  /**
   * Ensure a control script is loaded, with promise caching to prevent duplicate loads.
   * This method standardizes the common pattern of loading control scripts.
   *
   * @param options - Configuration options for loading the control
   * @param options.checkLoaded - Function to check if control is already loaded
   * @param options.preLoad - Optional string identifier, array of strings, or function to wait for dependencies.
   *                          String identifiers: 'sitna-control', 'tc', 'tc:propertyPath'
   *                          Arrays wait for all identifiers in sequence.
   * @param options.loadScript - Function that performs the require() call.
   *                            IMPORTANT: The require() call inside the function must use a static string literal for webpack to analyze it.
   * @param options.controlName - Name of the control (used for caching and logging)
   * @returns Promise that resolves when the control is loaded
   */
  protected async ensureControlLoaded(options: {
    checkLoaded: () => boolean | Promise<boolean>;
    preLoad?: string | string[] | (() => Promise<void>);
    loadScript: () => void;
    controlName: string;
  }): Promise<void> {
    const { checkLoaded, preLoad, loadScript, controlName } = options;

    // Check if already loaded
    const isLoaded = await checkLoaded();
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
        // Wait for pre-load dependencies if provided
        if (preLoad) {
          await this.resolvePreLoad(preLoad)();
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
   * Ensure multiple scripts are loaded sequentially, with promise caching to prevent duplicate loads.
   * This method standardizes the common pattern of loading multiple related scripts.
   *
   * @param options - Configuration options for loading the scripts
   * @param options.checkLoaded - Optional function to check if scripts are already loaded
   * @param options.preLoad - Optional string identifier, array of strings, or function to wait for dependencies.
   *                          String identifiers: 'sitna-control', 'tc', 'tc:propertyPath'
   *                          Arrays wait for all identifiers in sequence.
   * @param options.loadScripts - Array of functions that perform require() calls.
   *                              IMPORTANT: The require() calls inside the functions must use static string literals for webpack to analyze them.
   * @param options.controlName - Name of the control/feature (used for caching and logging)
   * @returns Promise that resolves when all scripts are loaded
   */
  protected async ensureScriptsLoaded(options: {
    checkLoaded?: () => boolean | Promise<boolean>;
    preLoad?: string | string[] | (() => Promise<void>);
    loadScripts: Array<() => void>;
    controlName: string;
  }): Promise<void> {
    const { checkLoaded, preLoad, loadScripts, controlName } = options;

    // Check if already loaded (if check function provided)
    if (checkLoaded) {
      const isLoaded = await checkLoaded();
      if (isLoaded) {
        return;
      }
    }

    // Return cached promise if loading is in progress
    const cachedPromise = this.controlLoadPromises.get(controlName);
    if (cachedPromise) {
      return cachedPromise;
    }

    // Create and cache the loading promise
    const loadPromise = (async () => {
      try {
        // Wait for pre-load dependencies if provided
        if (preLoad) {
          await this.resolvePreLoad(preLoad)();
        }

        // Load scripts sequentially
        for (const loadScript of loadScripts) {
          loadScript();
        }

        this.logger.warn(`${controlName} scripts loaded successfully`);
      } catch (error) {
        this.logger.error(`${controlName} scripts failed to load`, error);
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
   * Wait for TC namespace and optionally wait for specific properties to become available.
   * This helper standardizes the common pattern of waiting for TC and its properties.
   *
   * @param propertyPaths - Optional array of property paths to wait for (e.g., ['apiLocation', 'syncLoadJS'])
   * @param maxRetries - Maximum number of retry attempts for each wait operation (default: 50)
   * @param delayMs - Delay between retries in milliseconds (default: 100)
   * @returns Promise that resolves with the TC namespace
   * @throws Error if TC or any property is not available after retries
   */
  protected async waitForTCWithProperties(
    propertyPaths?: string[],
    maxRetries: number = 50,
    delayMs: number = 100
  ): Promise<TCNamespace> {
    const TC = await this.tcNamespaceService.waitForTC(maxRetries, delayMs);

    if (propertyPaths) {
      for (const propertyPath of propertyPaths) {
        await this.tcNamespaceService.waitForTCProperty(
          propertyPath,
          maxRetries,
          delayMs
        );
      }
    }

    return TC;
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
   * Inject CSS styles from assets into the component's view container.
   * This method loads CSS content from the assets directory and injects it as a <style> element
   * scoped to the component. Useful for scenarios that need to inject CSS dynamically instead of
   * using ::ng-deep in component stylesheets.
   *
   * The injected style element is tracked and automatically removed in ngOnDestroy.
   *
   * @param cssPath - Path to the CSS file in assets (e.g., '/assets/scenarios/my-scenario/css/styles.css')
   * @param scenarioName - Optional scenario identifier for tracking. Defaults to this.metadata.route
   * @returns Promise that resolves when styles are injected
   * @throws Error if CSS file cannot be loaded
   *
   * @example
   * ```typescript
   * await this.injectStylesFromAssets(
   *   '/assets/scenarios/my-scenario/css/custom.css',
   *   'my-scenario'
   * );
   * ```
   */
  protected async injectStylesFromAssets(
    cssPath: string,
    scenarioName?: string
  ): Promise<void> {
    const key = scenarioName || this.metadata.route;

    // Check if already injected
    if (this.injectedStyleElements.has(key)) {
      return; // Already injected
    }

    try {
      // Load CSS content from assets
      const cssContent = await firstValueFrom(
        this.http.get(cssPath, { responseType: 'text' })
      );

      // Create style element
      const styleElement = document.createElement('style');
      styleElement.textContent = cssContent;
      styleElement.setAttribute('data-scenario', key);
      styleElement.setAttribute('data-injected-at', new Date().toISOString());

      // Append to component's native element (scoped to component view container)
      this.elementRef.nativeElement.appendChild(styleElement);
      this.injectedStyleElements.set(key, styleElement);

      // Log success with verification info
      this.logger.warn(`Injected CSS styles from ${cssPath} into component view container`, {
        styleElementId: styleElement.getAttribute('data-scenario'),
        cssLength: cssContent.length,
        cssPath,
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to inject CSS styles from ${cssPath}`, {
        error: errorMessage,
        cssPath,
      });
      throw error;
    }
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
   * @param options.checkLoaded - Function to check if control is already loaded
   * @param options.preLoad - Optional string identifier, array of strings, or function to wait for dependencies.
   *                          String identifiers: 'sitna-control', 'tc', 'tc:propertyPath'
   *                          Arrays wait for all identifiers in sequence.
   * @param options.loadScript - Function that performs the require() call.
   *                            IMPORTANT: The require() call inside the function must use a static string literal for webpack to analyze it.
   * @param options.addControl - Optional callback called after map is loaded (for logging or verification).
   *                            Controls are auto-instantiated by SITNA from config, so this is typically a no-op.
   * @param options.mapOptions - Optional map initialization options (merged with onLoaded callback)
   */
  protected initializeMapWithControl(options: {
    scenarioConfig: SitnaConfig;
    controlName: string;
    checkLoaded: () => boolean | Promise<boolean>;
    preLoad?: string | string[] | (() => Promise<void>);
    loadScript: () => void;
    addControl?: (map: SitnaMap) => void | Promise<void>;
    mapOptions?: InitializeScenarioMapOptions;
  }): void {
    const {
      scenarioConfig,
      controlName,
      checkLoaded,
      preLoad,
      loadScript,
      addControl,
      mapOptions = {},
    } = options;

    // Load control before map initialization so SITNA can auto-instantiate it from config
    (async () => {
      try {
        await this.ensureControlLoaded({
          checkLoaded,
          preLoad,
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

