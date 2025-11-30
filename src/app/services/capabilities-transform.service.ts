import { Injectable, inject } from '@angular/core';
import type { AppCfg, AppService } from '../../types/api-sitmun';
import { LoggingService } from './logging.service';
import { ServiceMatcherService } from './service-matcher.service';

/**
 * Service for transforming WMS GetCapabilities responses.
 * Handles layer title patching and capabilities response modification.
 */
@Injectable({
  providedIn: 'root',
})
export class CapabilitiesTransformService {
  private readonly logger = inject(LoggingService);
  private readonly serviceMatcherService = inject(ServiceMatcherService);

  /**
   * Modify the capabilities response from getCapabilitiesOnline.
   * Replaces layer titles with node titles from AppCfg for layers defined in the model.
   *
   * @param response - The original response from getCapabilitiesOnline
   * @param matchedService - The AppService from the model that matches the layer's service URL, or null if not found
   * @param apiConfig - The full AppCfg configuration
   * @returns The modified response with patched layer titles
   */
  modifyCapabilitiesResponse(response: unknown, matchedService: AppService | null, apiConfig: AppCfg | null): unknown {
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
        ? this.getLayerNameToTitleMapForService(matchedService.id, apiConfig)
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
   * @param apiConfig - The full AppCfg configuration
   * @returns Map where key is layer name and value is node title
   */
  private getLayerNameToTitleMapForService(serviceId: string, apiConfig: AppCfg | null): Map<string, string> {
    const layerNameToTitleMap = new Map<string, string>();

    if (!apiConfig || !apiConfig.layers || !apiConfig.trees) {
      return layerNameToTitleMap;
    }

    // Find all layers that use this service
    const serviceLayers = apiConfig.layers.filter((layer: { service: string }) => layer.service === serviceId);

    // For each layer, find the corresponding node and build the mapping
    for (const layer of serviceLayers) {
      // Get the first element of the layers array (the layer name)
      if (layer.layers && layer.layers.length > 0) {
        const layerName = layer.layers[0];

        // Search through all trees to find a node where node.resource === layer.id
        let nodeFound = false;
        for (const tree of apiConfig.trees) {
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
}

