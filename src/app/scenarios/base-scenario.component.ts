import {
  Component,
  type OnInit,
  type OnDestroy,
  afterNextRender,
  inject,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import type SitnaMap from 'api-sitna';
import { SitnaConfigService } from '../services/sitna-config.service';
import { LoggingService } from '../services/logging.service';
import { ErrorHandlingService } from '../services/error-handling.service';
import { ScenarioMapService, type InitializeScenarioMapOptions } from '../services/scenario-map.service';
import { TCNamespaceService } from '../services/tc-namespace.service';
import { SitnaNamespaceService } from '../services/sitna-namespace.service';
import { runInZone } from '../utils/zone-helpers';
import type { SitnaConfig } from '../types/sitna.types';
import type { ScenarioMetadata } from '../types/scenario.types';

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

  /**
   * Cache for control/script loading promises to prevent duplicate loads.
   * Keyed by control name.
   */
  private readonly controlLoadPromises = new Map<string, Promise<void>>();

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
    this.destroyMap();
  }

  /**
   * Initialize the SITNA map with scenario-specific configuration.
   * Must be implemented by subclasses.
   */
  protected abstract initializeMap(): void;

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
   * Check if a custom element is registered.
   *
   * @param elementName - The name of the custom element (e.g., 'hello-world-control')
   * @returns True if the custom element is registered, false otherwise
   */
  protected isCustomElementRegistered(elementName: string): boolean {
    return typeof customElements.get(elementName) === 'function';
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

