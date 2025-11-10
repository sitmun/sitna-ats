import type { MapOptions } from './Map';

/**
 * Global SITNA configuration object
 */
export interface Cfg {
  /**
   * Default CRS
   */
  crs?: string;
  
  /**
   * Default initial extent
   */
  initialExtent?: number[];
  
  /**
   * Default max extent
   */
  maxExtent?: number[];
  
  /**
   * Layout configuration
   */
  layout?: string | MapOptions['layout'];
  
  /**
   * Proxy URL
   */
  proxy?: string;
  
  /**
   * Controls configuration
   */
  controls?: MapOptions['controls'];
  
  [key: string]: unknown;
}

declare const Cfg: Cfg;
export default Cfg;

