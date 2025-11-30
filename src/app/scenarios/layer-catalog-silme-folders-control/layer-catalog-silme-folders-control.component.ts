import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import scenarioConfigJson from './sitna-config.json';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { BaseScenarioComponent } from '../base-scenario.component';
import { SitnaHelper } from './sitmun-helpers';
import type { AppCfg, AppService } from '../../../types/api-sitmun';
import type { Meld, MeldJoinPoint } from '../../utils/sitna-meld-patch';
import { ServiceMatcherService } from '../../services/service-matcher.service';
import { CapabilitiesTransformService } from '../../services/capabilities-transform.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const meld = require('meld') as Meld;

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'Layer Catalog Silme Folders Control',
  description:
    'Map with LayerCatalogSilmeFolders control that extends TC.control.LayerCatalog with folder-based organization and custom templates.',
  tags: ['sitna-4.1', 'controls', 'layer-catalog', 'silme', 'folders'],
  route: 'layer-catalog-silme-folders-control',
};

@Component({
  selector: 'app-layer-catalog-silme-folders-control',
  templateUrl: './layer-catalog-silme-folders-control.component.html',
  styleUrls: ['./layer-catalog-silme-folders-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayerCatalogSilmeFoldersControlComponent extends BaseScenarioComponent {
  private layerCatalogsSilme: Array<{ title: string; catalog: unknown }> = [];
  private currentCatalogIdx = 0;
  private apiConfig: AppCfg | null = null;

  // UI properties for configuration override
  appConfigUrl = '';
  isLoadingConfig = false;

  // Inject services
  private readonly serviceMatcherService = inject(ServiceMatcherService);
  private readonly capabilitiesTransformService = inject(CapabilitiesTransformService);

  constructor() {
    super();
    this.metadata = SCENARIO_METADATA;
  }

  protected override initializeMap(): void {
    // Check if there's a stored configuration URL from a previous session
    const storedConfigUrl = sessionStorage.getItem('layer-catalog-config-url');
    if (storedConfigUrl) {
      this.appConfigUrl = storedConfigUrl;
      this.logger.warn(`Using stored configuration URL: ${storedConfigUrl}`);
    }



    const preloadSteps = [
      async () => {
        // FIRST: Patch Layer.getCapabilitiesOnline BEFORE loading any layers
        // This must happen before the catalog is configured
        // The patch always modifies titles from SITMUN config
        this.logger.info('🔧 Applying GetCapabilities patch - titles will be updated from SITMUN config');
        await this.patchLayerGetCapabilitiesOnline();
      },
      async () => {
        // Load SilmeTree.js first - it provides global functions and variables needed by LayerCatalogSilmeFolders
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./src/SilmeTree.js');

        // Verify that the functions are available globally
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const windowAny = window as any;
        if (typeof windowAny.cercaLayers === 'function') {
          this.logger.info('✅ Loaded SilmeTree.js - cercaLayers is available');
        } else {
          this.logger.error('❌ SilmeTree.js loaded but cercaLayers is not available globally');
          // Try to expose it manually as a fallback
          if (windowAny.window && typeof windowAny.window.cercaLayers === 'function') {
            windowAny.cercaLayers = windowAny.window.cercaLayers;
            this.logger.info('✅ Manually exposed cercaLayers to global scope');
          }
        }
      },
      async () => {
        // Load SilmeMap.js - it provides global variables (silmeMap, silmeLayerCatalog, etc.) needed by LayerCatalogSilmeFolders
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./src/SilmeMap.js');

        // Verify that the variables are available globally
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const windowAny = window as any;
        if (typeof windowAny.silmeAddLayer === 'function') {
          this.logger.info('✅ Loaded SilmeMap.js - silmeAddLayer is available');
        } else {
          this.logger.warn('⚠️ SilmeMap.js loaded but silmeAddLayer may not be available globally');
        }
      },
      async () => {
        // Load our custom control script
        await this.ensureControlLoaded({
          loadScript: () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('./src/controls/LayerCatalogSilmeFolders.js');
          },
          controlName: 'LayerCatalogSilmeFolders',
          dependencies: 'TC',
        });
      },
      async () => {
        // Patch template paths after control is loaded
        await this.patchTemplatePaths();
      },
      async () => {
        // Initialize treeLayers global variable that the control expects in the IIFE closure
        await this.initializeTreeLayers();
      },
      async () => {
        // Load AppCfg from stored URL or local file
        // If there's a stored config URL, use it; otherwise use default
        if (storedConfigUrl) {
          await this.fetchAndConfigureCatalogFromServer(storedConfigUrl);
        } else {
          await this.fetchAndConfigureCatalogFromServer();
        }
      },
    ];

    const mapOptions = {
      successMessage: 'Layer Catalog Silme Folders Control: Map loaded successfully',
    };

    this.initializeMapWithPreload({
      preloadSteps,
      scenarioConfig: scenarioConfigJson,
      mapOptions,
    });
  }

  /**
   * Patch template paths in LayerCatalogSilmeFolders after the control is loaded.
   * This overrides the template paths set in the synced file from GitHub,
   * ensuring they point to the correct location in the built application.
   */
  private async patchTemplatePaths(): Promise<void> {
    await this.patchControlTemplatePaths({
      controlName: 'LayerCatalogSilmeFolders',
      templatePaths: {
        '': 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogSilme.hbs',
        '-node': 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogNodeSilmeFolders.hbs',
        '-branch': 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogBranchSilmeFolders.hbs',
        '-info': 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogInfoSilme.hbs',
        '-results': 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogResultsSilme.hbs',
        '-proj': 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogProjSilme.hbs',
      },
      patchMethod: 'register',
      parentControlName: 'LayerCatalog',
    });
  }

  /**
   * Initialize treeLayers global variable that the control expects to exist.
   * The control code uses treeLayers in the IIFE closure but never declares it,
   * so we need to ensure it exists as a global before the control code runs.
   */
  private async initializeTreeLayers(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowAny = window as any;

    // Declare treeLayers as a global variable so it's accessible in the IIFE closure
    // The control code uses it at lines 1246 and 1455 but assigns it at line 1461
    if (typeof windowAny.treeLayers === 'undefined') {
      windowAny.treeLayers = [];
      this.logger.info('✅ Initialized window.treeLayers');
    }
  }

  /**
   * Patch Layer.getCapabilitiesOnline to log its calls for debugging.
   * This helps track when capabilities are being fetched online.
   */
  private async patchLayerGetCapabilitiesOnline(): Promise<void> {
    await this.waitForTCAndApply(async () => {
      // Wait for SITNA to be available
      await this.sitnaNamespaceService.waitForSITNA();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SITNA = (window as any).SITNA;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const TC = (window as any).TC;

      // Try to find Layer prototype - could be in SITNA.layer.Layer or TC.layer.Layer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LayerProto = (SITNA?.layer?.Layer?.prototype as any) ||
                         (TC?.layer?.Layer?.prototype as any) ||
                         (TC?.wrap?.layer?.Raster?.prototype as any);

      if (!LayerProto) {
        this.logger.warn('⚠️ Layer prototype not found, cannot patch getCapabilitiesOnline');
        return;
      }

      if (typeof LayerProto.getCapabilitiesOnline !== 'function') {
        this.logger.warn('⚠️ Layer.getCapabilitiesOnline not found, skipping patch');
        return;
      }

      const component = this;
      const advice = meld.around(
        LayerProto,
        'getCapabilitiesOnline',
        function (this: unknown, joinPoint: MeldJoinPoint): unknown {
          // Get the layer instance (this is the layer)
          const layer = this as { url?: string; getCapabilitiesUrl?: () => string; [key: string]: unknown };

          // Try to get the capabilities URL
          let capabilitiesUrl: string | undefined;
          if (typeof layer.getCapabilitiesUrl === 'function') {
            capabilitiesUrl = layer.getCapabilitiesUrl();
          } else if (layer.url) {
            capabilitiesUrl = layer.url;
          }

          const startTime = performance.now();
          const methodArgs = joinPoint.args;

          try {
            const result = joinPoint.proceed();
            const endTime = performance.now();
            const duration = endTime - startTime;

            // Handle promises (getCapabilitiesOnline likely returns a Promise)
            if (result instanceof Promise) {
              return result
                .then((resolved) => {
                  // Check if service exists in model after capabilities are fetched
                  const matchedService = capabilitiesUrl ? component.serviceMatcherService.findServiceInModel(capabilitiesUrl, component.apiConfig?.services || []) : null;

                  if (matchedService) {
                    component.logger.warn(
                      `[Layer.getCapabilitiesOnline] Promise resolved in ${duration.toFixed(2)}ms for service in model (${matchedService.id}):`,
                      resolved
                    );
                    // Transform response if service is in model
                    return component.capabilitiesTransformService.modifyCapabilitiesResponse(resolved, matchedService, component.apiConfig);
                  } else {
                    component.logger.warn(
                      `[Layer.getCapabilitiesOnline] Promise resolved in ${duration.toFixed(2)}ms for service NOT in model:`,
                      resolved
                    );
                    // Return original response if service not in model
                    return resolved;
                  }
                })
                .catch((error) => {
                  component.logger.error(`[Layer.getCapabilitiesOnline] Promise rejected after ${duration.toFixed(2)}ms for .cat service:`, error);
                  throw error;
                });
            }

            // Handle synchronous return
            const matchedService = capabilitiesUrl ? component.serviceMatcherService.findServiceInModel(capabilitiesUrl, component.apiConfig?.services || []) : null;

            if (matchedService) {
              component.logger.warn(
                `[Layer.getCapabilitiesOnline] Completed in ${duration.toFixed(2)}ms for .cat service in model (${matchedService.id}):`,
                result
              );
              // Transform response if service is in model
              return component.capabilitiesTransformService.modifyCapabilitiesResponse(result, matchedService, component.apiConfig);
            } else {
              component.logger.warn(
                `[Layer.getCapabilitiesOnline] Completed in ${duration.toFixed(2)}ms for .cat service NOT in model:`,
                result
              );
              // Return original response if service not in model
              return result;
            }
          } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            component.logger.error(`[Layer.getCapabilitiesOnline] Failed after ${duration.toFixed(2)}ms for .cat service:`, error);
            throw error;
          }
        }
      );

      this.patchManager.add(() => meld.remove(advice));

      this.logger.info('✅ Patched Layer.getCapabilitiesOnline for logging and response modification');
    });
  }

  /**
   * Load configuration from the URL provided in the input field.
   * This allows users to override the default app-config.json.
   */
  async loadConfigFromUrl(): Promise<void> {
    if (!this.appConfigUrl || this.appConfigUrl.trim() === '') {
      this.logger.warn('No URL provided');
      return;
    }

    this.isLoadingConfig = true;
    this.cdr.markForCheck(); // Trigger change detection for OnPush strategy

    try {
      const url = this.appConfigUrl.trim();
      this.logger.warn(`Loading configuration from URL: ${url}`);
      await this.fetchAndConfigureCatalogFromServer(url);
      this.logger.info('✅ Configuration loaded successfully from URL');

      // Store the URL in sessionStorage so we can use it after reload
      sessionStorage.setItem('layer-catalog-config-url', url);

      // Reload the page to ensure clean initialization with new configuration
      this.logger.warn('🔄 Reloading page to apply new configuration...');
      window.location.reload();
    } catch (error) {
      this.logger.error('Failed to load configuration from URL', error);
      // Show error to user
      this.errorHandler.handleError(error, 'Failed to load configuration from URL');
      this.isLoadingConfig = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Reset to the default configuration (from app-config.json or sitna-config.json).
   */
  async resetToDefaultConfig(): Promise<void> {
    this.appConfigUrl = '';
    this.isLoadingConfig = true;
    this.cdr.markForCheck(); // Trigger change detection for OnPush strategy

    try {
      this.logger.warn('Resetting to default configuration');

      // Clear the stored URL from sessionStorage
      sessionStorage.removeItem('layer-catalog-config-url');

      // Reload the page to use default configuration
      this.logger.warn('🔄 Reloading page to apply default configuration...');
      window.location.reload();
    } catch (error) {
      this.logger.error('Failed to reset configuration', error);
      // Show error to user
      this.errorHandler.handleError(error, 'Failed to reset configuration');
      this.isLoadingConfig = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Destroy the map instance and clear the container DOM element.
   * Override to add container clearing logic.
   * Note: This does NOT restore patches - patches are only restored in ngOnDestroy.
   */
  protected override destroyMap(): void {
    // Clear the container element before destroying the map
    const containerId = this.getContainerId();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      this.logger.warn(`Cleared map container: ${containerId}`);
    }

    // Call parent destroyMap to set map to null
    this.map = null;
  }

  /**
   * Load AppCfg from local file or server, build catalog using SitnaHelper.buildCatalogSilme,
   * configure window.layerCatalogsSilmeForModal, and set up SITNA.Cfg.controls.layerCatalogSilmeFolders.
   *
   * This method implements the steps described in the commented code:
   * 1. Obtain a sitmun JSON configuration object (from local file or server) of type AppCfg
   * 2. Call SitnaHelper.buildCatalogSilme to build the catalog
   * 3. Parse the catalogs and set up window.layerCatalogsSilmeForModal
   * 4. Configure SITNA.Cfg.controls.layerCatalogSilmeFolders with the catalog
   *
   * Priority order:
   * 1. Local file path from sitna-config.json (appConfigPath)
   * 2. Remote URL if provided as parameter
   * 3. Fallback to sitna-config.json controls configuration
   *
   * @param apiConfigUrl - Optional URL to fetch AppCfg from server (fallback if appConfigPath not found)
   */
  private async fetchAndConfigureCatalogFromServer(apiConfigUrl?: string): Promise<void> {
    this.logger.warn('🔧 Starting catalog configuration...');

    // Wait for SITNA namespace to be available
    await this.sitnaNamespaceService.waitForSITNA();
    this.logger.info('✓ SITNA namespace available');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SITNA = (window as any).SITNA;
    if (!SITNA || !SITNA.Cfg) {
      this.logger.warn('SITNA.Cfg not available, skipping catalog configuration');
      return;
    }

    // Initialize SITNA.Cfg.controls if it doesn't exist
    if (!SITNA.Cfg.controls) {
      SITNA.Cfg.controls = {};
    }

    // Step 1: Load AppCfg from local file or server
    let apiConfig: AppCfg | null = null;

    // If a URL is explicitly provided (e.g., from UI override), use it directly
    if (apiConfigUrl) {
      try {
        this.logger.warn(`Fetching AppCfg from remote URL: ${apiConfigUrl}`);
        apiConfig = await firstValueFrom(this.http.get<AppCfg>(apiConfigUrl));
        this.apiConfig = apiConfig;
        this.logger.info('✓ AppCfg fetched from remote URL successfully');
      } catch (error) {
        this.logger.error('Failed to fetch AppCfg from remote URL', error);
        throw error; // Re-throw to let caller handle the error
      }
    } else {
      // No explicit URL provided, try local file first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appConfigPath = (scenarioConfigJson as any).appConfigPath;
      if (appConfigPath) {
        try {
          this.logger.warn(`Loading AppCfg from local file: ${appConfigPath}`);
          apiConfig = await firstValueFrom(this.http.get<AppCfg>(appConfigPath));
          this.apiConfig = apiConfig;
          this.logger.info('✓ AppCfg loaded from local file successfully');
        } catch (error) {
          this.logger.error('Failed to load AppCfg from local file', error);
          this.logger.warn('Falling back to sitna-config.json configuration');
        }
      }
    }

    // Step 2: Build catalog using SitnaHelper.buildCatalogSilme
    if (apiConfig) {
      this.layerCatalogsSilme = SitnaHelper.buildCatalogSilme(apiConfig);
      this.logger.info(`✓ Built ${this.layerCatalogsSilme.length} catalogs from AppCfg`);
    } else {
      // Fallback: Use configuration from sitna-config.json
      const controlConfig = scenarioConfigJson.controls?.layerCatalogSilmeFolders;
      if (controlConfig) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        SITNA.Cfg.controls.LayerCatalogSilmeFolders = {
          div: controlConfig.div || 'tc-slot-toc',
          enableSearch: controlConfig.enableSearch ?? true,
          layers: controlConfig.layers || [],
        };
        this.logger.info('✅ Configured from sitna-config.json (fallback)');
      }
      return;
    }

    // Step 3: Parse the catalogs and set up window.layerCatalogsSilmeForModal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowAny = window as any;
    let idx = -1;
    windowAny.layerCatalogsSilmeForModal = {
      currentCatalog: this.currentCatalogIdx,
      catalogs: this.layerCatalogsSilme.map((catalog: any) => {
        return { id: ++idx, catalog: catalog.title };
      }),
    };
    this.logger.info('✅ Initialized window.layerCatalogsSilmeForModal', {
      currentCatalog: this.currentCatalogIdx,
      catalogsCount: windowAny.layerCatalogsSilmeForModal.catalogs.length,
    });

    // Step 4: Configure SITNA.Cfg.controls.layerCatalogSilmeFolders with the catalog
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SITNA.Cfg.controls.layerCatalogSilmeFolders =
      this.layerCatalogsSilme.length > 0
        ? this.layerCatalogsSilme[this.currentCatalogIdx].catalog
        : {};

    this.logger.info('✅ Configured SITNA.Cfg.controls.layerCatalogSilmeFolders', {
      hasCatalog: this.layerCatalogsSilme.length > 0,
      catalogTitle: this.layerCatalogsSilme.length > 0 ? this.layerCatalogsSilme[this.currentCatalogIdx].title : 'none',
    });
  }
}

