import type SitnaMap from '../Map';

/**
 * Layer options interface
 */
export interface LayerOptions {
  id?: string;
  title?: string;
  name?: string;
  hideTitle?: boolean;
  type?: string | number;
  url?: string;
  layerNames?: string | string[];
  hideTree?: boolean;
  isBase?: boolean;
  isDefault?: boolean;
  format?: string;
  opacity?: number;
  visible?: boolean;
  [key: string]: unknown;
}

/**
 * Layer class for SITNA maps
 */
declare class Layer {
  id: string;
  map?: SitnaMap;
  type: number | string;
  url?: string;
  opacity?: number;
  visible?: boolean;
  isBase?: boolean;

  constructor(options?: LayerOptions);

  /**
   * Set layer visibility
   */
  setVisibility(visible: boolean): Layer;

  /**
   * Get layer visibility
   */
  getVisibility(): boolean;

  /**
   * Get layer opacity
   */
  getOpacity(): number;

  /**
   * Set layer opacity
   */
  setOpacity(opacity: number, silent?: boolean): Promise<void>;

  /**
   * Check if layer is compatible with CRS
   */
  isCompatible(crs: string): boolean;

  /**
   * Check if layer is raster
   */
  isRaster(): boolean;

  [key: string]: unknown;
}

export default Layer;

