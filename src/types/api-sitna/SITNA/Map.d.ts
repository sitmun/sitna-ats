import { MapOptions } from '../TC/Map';
import type { LayerOptions } from './layer/Layer';
import type Layer from './layer/Layer';

/**
 * Main SITNA Map class
 */
declare class SitnaMap {
  constructor(div: HTMLElement | string, options?: MapOptions);

  /**
   * Loaded callback - returns a promise that resolves when the map is loaded
   */
  loaded(callback?: () => void): Promise<void>;

  /**
   * Add a layer to the map
   */
  addLayer(layer: string | LayerOptions | Layer, callback?: (layer: Layer) => void): Promise<Layer>;

  /**
   * Remove a layer from the map
   */
  removeLayer(layer: string | Layer): void;

  /**
   * Get a layer by ID
   */
  getLayer(id: string): Layer | undefined;

  /**
   * Get the current base layer
   */
  getBaseLayer(): Layer | undefined;

  /**
   * Trigger an event
   */
  trigger(event: string, data?: unknown): void;

  /**
   * Subscribe to an event
   */
  on(event: string, handler: (data?: unknown) => void): void;

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler?: (data?: unknown) => void): void;

  /**
   * Check location state
   */
  checkLocation(): Promise<unknown>;

  /**
   * Add a control to the map
   */
  addControl(control: unknown, options?: unknown): unknown;

  [key: string]: unknown;
}

export default SitnaMap;

