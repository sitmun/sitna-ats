import { Component, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import scenarioConfigJson from './sitna-config.json';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { BaseScenarioComponent } from '../base-scenario.component';
import { SitnaHelper } from './sitmun-helpers';
import type { AppCfg, AppService } from '../../../types/api-sitmun';
import type { Meld, MeldJoinPoint } from '../../utils/sitna-meld-patch';
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

  // Store initialization options for reinitialization
  private initializationOptions: {
    preloadSteps: Array<() => Promise<void>>;
    scenarioConfig: typeof scenarioConfigJson;
    mapOptions: { successMessage: string };
  } | null = null;

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
        // Load SilmeTree.js first - it provides global functions and variables needed by LayerCatalogSilmeFolders
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./src/SilmeTree.js');

        // Verify that the functions are available globally
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const windowAny = window as any;
        if (typeof windowAny.cercaLayers === 'function') {
          this.logger.warn('✅ Loaded SilmeTree.js - cercaLayers is available');
        } else {
          this.logger.error('❌ SilmeTree.js loaded but cercaLayers is not available globally');
          // Try to expose it manually as a fallback
          if (windowAny.window && typeof windowAny.window.cercaLayers === 'function') {
            windowAny.cercaLayers = windowAny.window.cercaLayers;
            this.logger.warn('✅ Manually exposed cercaLayers to global scope');
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
          this.logger.warn('✅ Loaded SilmeMap.js - silmeAddLayer is available');
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
        // Patch Layer.getCapabilitiesOnline to log its calls
        await this.patchLayerGetCapabilitiesOnline();
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

    // Store initialization options for reference (though we now use page reload)
    this.initializationOptions = {
      preloadSteps,
      scenarioConfig: scenarioConfigJson,
      mapOptions,
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
    await this.waitForTCAndApply(async (TC) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LayerCatalogSilmeFolders = (TC.control as any)['LayerCatalogSilmeFolders'];
      if (!LayerCatalogSilmeFolders) {
        this.logger.warn('LayerCatalogSilmeFolders not found, skipping template path patch');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctlProto = LayerCatalogSilmeFolders.prototype as any;
      const originalRegister = ctlProto.register;
      const originalRender = ctlProto.render;

      // Patch the register method to set correct template paths
      // We need to ensure template object exists and set correct paths
      ctlProto.register = function(map: unknown) {
        const _ctl = this;

        // Initialize template object if it doesn't exist
        if (!_ctl.template) {
          _ctl.template = {};
        }

        // Set correct template paths BEFORE calling original register
        _ctl.template[_ctl.CLASS] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogSilme.hbs';
        _ctl.template[_ctl.CLASS + '-node'] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogNodeSilmeFolders.hbs';
        _ctl.template[_ctl.CLASS + '-branch'] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogBranchSilmeFolders.hbs';
        _ctl.template[_ctl.CLASS + '-info'] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogInfoSilme.hbs';
        _ctl.template[_ctl.CLASS + '-results'] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogResultsSilme.hbs';
        _ctl.template[_ctl.CLASS + '-proj'] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogProjSilme.hbs';

        // Now call the original register with our patched templates
        // The original register will overwrite these, so we call the parent's register instead
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (TC.control as any)['LayerCatalog'].prototype.register.call(_ctl, map);

        // Re-apply our template paths after parent register (in case it initialized template)
        _ctl.template[_ctl.CLASS] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogSilme.hbs';
        _ctl.template[_ctl.CLASS + '-node'] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogNodeSilmeFolders.hbs';
        _ctl.template[_ctl.CLASS + '-branch'] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogBranchSilmeFolders.hbs';
        _ctl.template[_ctl.CLASS + '-info'] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogInfoSilme.hbs';
        _ctl.template[_ctl.CLASS + '-results'] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogResultsSilme.hbs';
        _ctl.template[_ctl.CLASS + '-proj'] = 'assets/js/patch/templates/layer-catalog-silme-folders-control/LayerCatalogProjSilme.hbs';

        return result;
      };


      // Store restore function for cleanup
      this.patchManager.add(() => {
        ctlProto.register = originalRegister;
        ctlProto.render = originalRender;
      });

      this.logger.warn('✅ Patched LayerCatalogSilmeFolders template paths and render method');
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
      this.logger.warn('✅ Initialized window.treeLayers');
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

      // Patch getCapabilitiesOnline with custom logic to check TLD and log only for .cat services
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

          // Check if URL has .cat TLD
          const hasCatTld = capabilitiesUrl ? component.isUrlWithCatTld(capabilitiesUrl) : false;

          // Only log if TLD is .cat
          if (!hasCatTld) {
            // Skip logging, just proceed with original method
            return joinPoint.proceed();
          }

          const startTime = performance.now();
          const methodArgs = joinPoint.args;

          component.logger.warn(`[Layer.getCapabilitiesOnline] Called for .cat service (${capabilitiesUrl}) with args:`, methodArgs);

          try {
            const result = joinPoint.proceed();
            const endTime = performance.now();
            const duration = endTime - startTime;

            // Handle promises (getCapabilitiesOnline likely returns a Promise)
            if (result instanceof Promise) {
              return result
                .then((resolved) => {
                  // Check if service exists in model after capabilities are fetched
                  const matchedService = capabilitiesUrl ? component.findServiceInModel(capabilitiesUrl) : null;

                  if (matchedService) {
                    component.logger.warn(
                      `[Layer.getCapabilitiesOnline] Promise resolved in ${duration.toFixed(2)}ms for .cat service in model (${matchedService.id}):`,
                      resolved
                    );
                    // Transform response if service is in model
                    return component.modifyCapabilitiesResponse(resolved, matchedService);
                  } else {
                    component.logger.warn(
                      `[Layer.getCapabilitiesOnline] Promise resolved in ${duration.toFixed(2)}ms for .cat service NOT in model:`,
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
            const matchedService = capabilitiesUrl ? component.findServiceInModel(capabilitiesUrl) : null;

            if (matchedService) {
              component.logger.warn(
                `[Layer.getCapabilitiesOnline] Completed in ${duration.toFixed(2)}ms for .cat service in model (${matchedService.id}):`,
                result
              );
              // Transform response if service is in model
              return component.modifyCapabilitiesResponse(result, matchedService);
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

      this.logger.warn('✅ Patched Layer.getCapabilitiesOnline for logging and response modification');
    });
  }

  /**
   * Find a service in the AppCfg model by matching the service URL prefix.
   * The layer's service URL must start with the model service URL.
   *
   * @param serviceUrl - The service URL from the layer to match
   * @returns The matching AppService from the model, or null if not found
   */
  private findServiceInModel(serviceUrl: string): AppService | null {
    if (!this.apiConfig || !this.apiConfig.services) {
      return null;
    }

    // Normalize the layer's service URL
    const normalizedLayerUrl = this.normalizeUrl(serviceUrl);

    // Search through model services
    for (const service of this.apiConfig.services) {
      const normalizedModelUrl = this.normalizeUrl(service.url);

      // Check if layer URL starts with model service URL (prefix matching)
      if (normalizedLayerUrl.startsWith(normalizedModelUrl)) {
        return service;
      }
    }

    return null;
  }

  /**
   * Normalize a URL for comparison by:
   * - Converting protocol-relative URLs to https://
   * - Removing trailing slashes
   * - Converting to lowercase
   *
   * @param url - The URL to normalize
   * @returns The normalized URL
   */
  private normalizeUrl(url: string): string {
    let normalized = url;

    // Handle protocol-relative URLs (starting with //)
    if (normalized.startsWith('//')) {
      normalized = 'https:' + normalized;
    } else if (!normalized.includes('://')) {
      // If no protocol at all, add https://
      normalized = 'https://' + normalized;
    }

    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');

    // Convert to lowercase for case-insensitive comparison
    normalized = normalized.toLowerCase();

    return normalized;
  }

  /**
   * Check if a URL string has TLD "cat"
   *
   * @param url - The URL string to check
   * @returns True if URL has TLD "cat"
   */
  private isUrlWithCatTld(url: string): boolean {
    try {
      // Handle protocol-relative URLs (starting with //)
      let urlToParse = url;
      if (url.startsWith('//')) {
        urlToParse = 'https:' + url;
      } else if (!url.includes('://')) {
        // If no protocol at all, add https://
        urlToParse = 'https://' + url;
      }

      const urlObj = new URL(urlToParse);
      const hostname = urlObj.hostname;
      // Check if hostname ends with .cat TLD
      if (hostname.endsWith('.cat') || hostname === 'cat') {
        return true;
      }
    } catch {
      // If URL parsing fails, check if string contains .cat
      if (url.includes('.cat')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Modify the capabilities response from getCapabilitiesOnline.
   * Replaces layer titles with node titles from AppCfg for layers defined in the model.
   *
   * @param response - The original response from getCapabilitiesOnline
   * @param matchedService - The AppService from the model that matches the layer's service URL, or null if not found
   * @returns The modified response with patched layer titles
   */
  private modifyCapabilitiesResponse(response: unknown, matchedService: AppService | null): unknown {
    this.logger.warn('[modifyCapabilitiesResponse] Called', {
      matchedService: matchedService ? { id: matchedService.id, url: matchedService.url, type: matchedService.type } : null,
      responseType: typeof response,
      hasResponse: response !== null && response !== undefined,
    });

    if (!response || typeof response !== 'object') {
      return response;
    }

    // Type guard for capabilities response structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capabilities = response as any;

    // Check if response has the expected WMS capabilities structure
    if (capabilities.Capability && capabilities.Capability.Layer) {
      // Get layer name to title mapping for the matched service
      const layerNameToTitleMap = matchedService
        ? this.getLayerNameToTitleMapForService(matchedService.id)
        : new Map<string, string>();

      if (layerNameToTitleMap.size > 0) {
        this.logger.warn('[modifyCapabilitiesResponse] Layer name to title map:', Array.from(layerNameToTitleMap.entries()));
        // Recursively modify layer titles for matching layers
        this.patchLayerTitles(capabilities.Capability.Layer, layerNameToTitleMap);
        this.logger.warn('[modifyCapabilitiesResponse] Patched layer titles in capabilities response');
      } else {
        this.logger.warn('[modifyCapabilitiesResponse] No layer mappings found for service, skipping patch');
      }
    } else {
      this.logger.warn('[modifyCapabilitiesResponse] Capabilities response does not have expected structure (Capability.Layer)');
    }

    return response;
  }

  /**
   * Recursively patch layer titles by replacing them with node titles from AppCfg.
   * Only patches layers whose Name property matches a key in the layerNameToTitleMap.
   *
   * @param layers - A single layer object or array of layer objects
   * @param layerNameToTitleMap - Map of layer names to node titles from AppCfg
   */
  private patchLayerTitles(layers: unknown, layerNameToTitleMap?: Map<string, string>): void {
    if (!layers) {
      return;
    }

    // Handle array of layers
    if (Array.isArray(layers)) {
      for (const layer of layers) {
        this.patchLayerTitles(layer, layerNameToTitleMap);
      }
      return;
    }

    // Handle single layer object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = layers as any;

    // Only patch if we have a mapping and the layer Name matches
    if (layerNameToTitleMap && layerNameToTitleMap.size > 0 && layer.Name && typeof layer.Name === 'string') {
      const nodeTitle = layerNameToTitleMap.get(layer.Name);
      if (nodeTitle) {
        // Replace the Title with the node title from AppCfg
        layer.Title = nodeTitle;
      }
    }

    // Recursively process nested layers
    if (layer.Layer) {
      this.patchLayerTitles(layer.Layer, layerNameToTitleMap);
    }
  }

  /**
   * Get a mapping of layer names to node titles for a given service.
   * The mapping is built from AppCfg: finds layers that use the service,
   * extracts their layer names, and finds corresponding nodes in trees.
   *
   * @param serviceId - The service ID (e.g., "service/166")
   * @returns Map where key is layer name and value is node title
   */
  private getLayerNameToTitleMapForService(serviceId: string): Map<string, string> {
    const layerNameToTitleMap = new Map<string, string>();

    if (!this.apiConfig || !this.apiConfig.layers || !this.apiConfig.trees) {
      return layerNameToTitleMap;
    }

    // Find all layers that use this service
    const serviceLayers = this.apiConfig.layers.filter((layer) => layer.service === serviceId);

    // For each layer, find the corresponding node and build the mapping
    for (const layer of serviceLayers) {
      // Get the first element of the layers array (the layer name)
      if (layer.layers && layer.layers.length > 0) {
        const layerName = layer.layers[0];

        // Search through all trees to find a node where node.resource === layer.id
        let nodeFound = false;
        for (const tree of this.apiConfig.trees) {
          if (nodeFound) {
            break; // Already found the node, no need to search other trees
          }
          if (tree.nodes && typeof tree.nodes === 'object') {
            // Iterate through the nodes object (key-value map)
            for (const nodeKey in tree.nodes) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const node = (tree.nodes as any)[nodeKey];
              if (node && node.resource === layer.id && node.title) {
                // Map layer name to node title
                layerNameToTitleMap.set(layerName, node.title);
                nodeFound = true;
                break; // Found the node, no need to continue searching this tree
              }
            }
          }
        }
      }
    }

    return layerNameToTitleMap;
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
      this.logger.warn('✅ Configuration loaded successfully from URL');

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
    // Note: We don't restore patches here - they should remain active for reinitialization
    this.map = null;
  }

  /**
   * Reinitialize the map with stored initialization options.
   * This destroys the existing map, clears the container, and creates a new map instance.
   * Global variables are cleared and state is reset before reinitialization.
   */
  private async reinitializeMap(): Promise<void> {
    if (!this.initializationOptions) {
      this.logger.error('Cannot reinitialize map: initialization options not stored');
      return;
    }

    this.logger.warn('🔄 Reinitializing map...');

    // Clear SITNA.Cfg.controls to reset control configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SITNA = (window as any).SITNA;
    if (SITNA && SITNA.Cfg && SITNA.Cfg.controls) {
      // Clear the specific control configuration
      if (SITNA.Cfg.controls.layerCatalogSilmeFolders) {
        delete SITNA.Cfg.controls.layerCatalogSilmeFolders;
      }
      if (SITNA.Cfg.controls.LayerCatalogSilmeFolders) {
        delete SITNA.Cfg.controls.LayerCatalogSilmeFolders;
      }
      this.logger.warn('✓ SITNA.Cfg.controls cleared');
    }

    // Clear global variables that might reference the old map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowAny = window as any;
    if (windowAny.silmeLayerCatalog) {
      windowAny.silmeLayerCatalog = null;
    }
    if (windowAny.silmeMap) {
      windowAny.silmeMap = null;
    }
    if (windowAny.silmeSearch) {
      windowAny.silmeSearch = null;
    }
    if (windowAny.pendingLayer) {
      windowAny.pendingLayer = null;
    }
    // Reset treeLayers to empty array (not null, as the control expects an array)
    if (windowAny.treeLayers) {
      windowAny.treeLayers = [];
    }
    if (windowAny.initLayers) {
      windowAny.initLayers = [];
    }
    if (windowAny.layerCatalogsSilmeForModal) {
      windowAny.layerCatalogsSilmeForModal = null;
    }
    this.logger.warn('✓ Global variables cleared');

    // Destroy the existing map and clear the container
    this.destroyMap();

    // Restore all patches to ensure a clean state
    // Patches will be reapplied during preload steps
    this.patchManager.restoreAll();
    this.logger.warn('✓ Patches restored');

    // Wait to ensure DOM is cleared and cleanup is complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Re-run initialization with stored options
    // Patches will be reapplied during preload steps
    this.initializeMapWithPreload({
      preloadSteps: this.initializationOptions.preloadSteps,
      scenarioConfig: this.initializationOptions.scenarioConfig,
      mapOptions: this.initializationOptions.mapOptions,
    });

    this.logger.warn('✅ Map reinitialization initiated');
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
    this.logger.warn('✓ SITNA namespace available');

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
        this.logger.warn('✓ AppCfg fetched from remote URL successfully');
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
          this.logger.warn('✓ AppCfg loaded from local file successfully');
        } catch (error) {
          this.logger.error('Failed to load AppCfg from local file', error);
          this.logger.warn('Falling back to sitna-config.json configuration');
        }
      }
    }

    // Step 2: Build catalog using SitnaHelper.buildCatalogSilme
    if (apiConfig) {
      this.layerCatalogsSilme = SitnaHelper.buildCatalogSilme(apiConfig);
      this.logger.warn(`✓ Built ${this.layerCatalogsSilme.length} catalogs from AppCfg`);
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
        this.logger.warn('✅ Configured from sitna-config.json (fallback)');
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
    this.logger.warn('✅ Initialized window.layerCatalogsSilmeForModal', {
      currentCatalog: this.currentCatalogIdx,
      catalogsCount: windowAny.layerCatalogsSilmeForModal.catalogs.length,
    });

    // Step 4: Configure SITNA.Cfg.controls.layerCatalogSilmeFolders with the catalog
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SITNA.Cfg.controls.layerCatalogSilmeFolders =
      this.layerCatalogsSilme.length > 0
        ? this.layerCatalogsSilme[this.currentCatalogIdx].catalog
        : {};

    this.logger.warn('✅ Configured SITNA.Cfg.controls.layerCatalogSilmeFolders', {
      hasCatalog: this.layerCatalogsSilme.length > 0,
      catalogTitle: this.layerCatalogsSilme.length > 0 ? this.layerCatalogsSilme[this.currentCatalogIdx].title : 'none',
    });
  }
}

