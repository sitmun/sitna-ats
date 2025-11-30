/**
 * TypeScript declarations for SITNA/TC layer objects.
 * These are runtime instances of layers from the SITNA API.
 */

/**
 * Base layer instance interface
 */
export interface LayerInstance {
  /**
   * Layer URL (WMS service URL, tile server URL, etc.)
   */
  url?: string;

  /**
   * Layer identifier
   */
  id: string;

  /**
   * Layer title/name
   */
  title?: string;

  /**
   * Layer type (WMS, WMTS, Vector, etc.)
   */
  type?: string;

  /**
   * Get the capabilities URL for this layer
   */
  getCapabilitiesUrl?(): string;

  /**
   * Fetch capabilities online from the service
   * @returns Promise that resolves with capabilities data
   */
  getCapabilitiesOnline?(): Promise<unknown>;

  /**
   * Layer names (for WMS layers)
   */
  names?: string[];

  /**
   * Layer opacity (0-1)
   */
  opacity?: number;

  /**
   * Whether the layer is visible
   */
  visibility?: boolean;

  /**
   * Whether the layer is a base layer
   */
  isBase?: boolean;

  /**
   * Layer format (image/png, image/jpeg, etc.)
   */
  format?: string;

  /**
   * Custom layer properties
   */
  [key: string]: unknown;
}

/**
 * WMS Layer instance
 */
export interface WMSLayerInstance extends LayerInstance {
  type: 'WMS';

  /**
   * WMS layer names
   */
  layerNames: string[];

  /**
   * WMS version
   */
  version?: string;

  /**
   * Whether to use transparent background
   */
  transparent?: boolean;
}

/**
 * WMTS Layer instance
 */
export interface WMTSLayerInstance extends LayerInstance {
  type: 'WMTS';

  /**
   * WMTS layer identifier
   */
  layerName: string;

  /**
   * Matrix set identifier
   */
  matrixSet?: string;
}

/**
 * Vector Layer instance
 */
export interface VectorLayerInstance extends LayerInstance {
  type: 'Vector';

  /**
   * Vector features
   */
  features?: unknown[];

  /**
   * Style configuration
   */
  styles?: Record<string, unknown>;
}

/**
 * Type guard to check if layer is WMS
 */
export function isWMSLayer(layer: LayerInstance): layer is WMSLayerInstance {
  return layer.type === 'WMS';
}

/**
 * Type guard to check if layer is WMTS
 */
export function isWMTSLayer(layer: LayerInstance): layer is WMTSLayerInstance {
  return layer.type === 'WMTS';
}

/**
 * Type guard to check if layer is Vector
 */
export function isVectorLayer(layer: LayerInstance): layer is VectorLayerInstance {
  return layer.type === 'Vector';
}

