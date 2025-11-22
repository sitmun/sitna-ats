import {inject, Injectable} from '@angular/core';
import type SitnaMap from 'api-sitna';
import type {MapOptions} from 'api-sitna/TC/Map';
import type {SitnaConfig, SitnaControls} from '../../types/sitna.types';
import defaultMapOptionsJson from '../../environments/sitna-config-default.json';
import {LoggingService} from './logging.service';

/**
 * Service for SITNA map configuration management.
 *
 * Responsibilities:
 * - Initialize SITNA maps with configuration options
 * - Manage default map options
 * - Convert between SitnaConfig and MapOptions formats
 * - Apply global and scenario-specific configurations
 *
 * The service supports both global configuration (via SITNA.Cfg) and
 * scenario-specific configuration that only affects individual map instances.
 */
@Injectable({
  providedIn: 'root',
})
export class SitnaConfigService {
  private readonly logger = inject(LoggingService);
  private defaultMapOptions: MapOptions = defaultMapOptionsJson as MapOptions;

  /**
   * Initialize SITNA map with configuration
   */
  initializeMap(containerId: string, options?: MapOptions): SitnaMap | null {
    if (typeof window.SITNA === 'undefined') {
      this.logger.error('SITNA library not loaded');
      return null;
    }

    const SITNA = window.SITNA;
    // Merge default options with provided options
    const mapOptions = { ...this.defaultMapOptions, ...options };

    // Ensure workLayers is explicitly set to prevent inheritance from defaults or SITNA.Cfg
    // If options doesn't specify workLayers, explicitly set to empty array
    // This prevents scenarios from inheriting workLayers they didn't define
    if (options?.workLayers === undefined) {
      mapOptions.workLayers = [];
    }

    return new SITNA.Map(containerId, mapOptions);
  }

  /**
   * Convert SitnaConfig to MapOptions without modifying global state
   * Used for scenario-specific configs that should only affect a single map instance
   */
  applyConfigToMapOptions(config: SitnaConfig): MapOptions {
    const mapOptions: MapOptions = {};

    // Apply layout if provided
    if (config.layout) {
      mapOptions.layout = config.layout;
    }

    // Apply controls if provided
    if (config.controls) {
      mapOptions.controls = this.convertControlsConfig(config.controls);
    }

    // Apply proxy if provided
    if (config.proxy) {
      mapOptions.proxy = config.proxy;
    }

    // Apply any other top-level config properties that map to MapOptions
    // (crs, baseLayers, initialExtent, etc. can be in config too)
    if (config['crs'] !== undefined) {
      mapOptions.crs = config['crs'] as string;
    }
    if (config['baseLayers'] !== undefined) {
      mapOptions.baseLayers = config['baseLayers'] as MapOptions['baseLayers'];
    }
    if (config['defaultBaseLayer'] !== undefined) {
      mapOptions.defaultBaseLayer = config['defaultBaseLayer'] as string;
    }
    if (config['initialExtent'] !== undefined) {
      mapOptions.initialExtent = config['initialExtent'] as number[];
    }
    // Explicitly set workLayers - if not in config, set to empty array to prevent inheritance
    // This ensures scenarios only get workLayers they explicitly define
    if (config['workLayers'] !== undefined) {
      mapOptions.workLayers = config['workLayers'] as MapOptions['workLayers'];
    } else {
      // Explicitly set to empty array to prevent inheritance from defaultMapOptions
      mapOptions.workLayers = [];
    }

    return mapOptions;
  }

  /**
   * Convert SitnaConfig controls to MapControlsOptions
   * Most controls are passed through directly to SITNA, which handles auto-instantiation.
   * Only layerCatalog needs special transformation (layer type string to SITNA constant).
   */
  private convertControlsConfig(controls: SitnaControls): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const SITNA = window.SITNA;
    const controlsRecord = controls as Record<string, unknown>;

    // Handle layerCatalog: needs special transformation for layer types
    if (controls.layerCatalog === false) {
      result['layerCatalog'] = false;
    } else if (controls.layerCatalog !== undefined && typeof controls.layerCatalog === 'object') {
      result['layerCatalog'] = {
        div: controls.layerCatalog.div || 'layerCatalog',
      };

      // Include enableSearch if explicitly provided
      if (controls.layerCatalog.enableSearch !== undefined) {
        (result['layerCatalog'] as Record<string, unknown>)['enableSearch'] = controls.layerCatalog.enableSearch;
      }

      // Include layers array if provided (for WMS services, etc.)
      if (controls.layerCatalog.layers !== undefined && Array.isArray(controls.layerCatalog.layers)) {
        result['layerCatalog'] = {
          ...(result['layerCatalog'] as Record<string, unknown>),
          layers: controls.layerCatalog.layers.map((layer) => {
            const layerConfig: Record<string, unknown> = {
              id: layer.id,
              title: layer.title,
              name: layer.name,
              hideTitle: layer.hideTitle,
              url: layer.url,
              layerNames: layer.layerNames,
              hideTree: layer.hideTree,
            };

            // Convert layer type string to SITNA constant if available
            if (layer.type !== undefined) {
              if (typeof layer.type === 'string' && SITNA?.Consts?.layerType !== undefined) {
                // Map string types to SITNA constants
                const typeMap: Record<string, string> = {
                  'WMS': 'WMS',
                  'WMTS': 'WMTS',
                  'XYZ': 'XYZ',
                  'Vector': 'Vector',
                };
                const constName = typeMap[layer.type];
                if (constName !== undefined && SITNA.Consts.layerType[constName] !== undefined) {
                  layerConfig['type'] = SITNA.Consts.layerType[constName];
                } else {
                  layerConfig['type'] = layer.type;
                }
              } else {
                layerConfig['type'] = layer.type;
              }
            }

            return layerConfig;
          }),
        };
      }
    }

    // Handle workLayerManager: set default div if not provided
    if (controls.workLayerManager !== undefined && typeof controls.workLayerManager === 'object') {
      result['workLayerManager'] = {
        div: controls.workLayerManager.div || 'workLayerManager',
      };
    }

    // All other controls are passed through directly - SITNA handles auto-instantiation
    // This includes: overviewMap, basemapSelector, basemapSelectorSilme, offlineMapMaker,
    // featureInfoSilme, helloWorld, and any other custom controls
    for (const key in controlsRecord) {
      if (key !== 'layerCatalog' && key !== 'workLayerManager' && controlsRecord[key] !== undefined) {
        result[key] = controlsRecord[key];
      }
    }

    return result;
  }
}
