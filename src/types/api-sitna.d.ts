/**
 * Type aliases for commonly used types
 */
type ProxificationConstructor = new (proxy: unknown, options?: unknown) => unknown;

type MapOptions = import('./api-sitna/TC/Map').MapOptions;
type SitnaMap = import('./api-sitna/SITNA/Map').default;
type Cfg = import('./api-sitna/TC/Cfg').default;
type Consts = import('./api-sitna/TC/Consts').default;

/**
 * Main api-sitna module declaration
 */
declare module 'api-sitna' {
  import SitnaMap from './api-sitna/SITNA/Map';
  export default SitnaMap;
  export { Cfg, Consts, feature, layer, Map } from './api-sitna/sitna';
}

/**
 * TC/Map module - exports map configuration types
 */
declare module 'api-sitna/TC/Map' {
  export type {
    MapOptions,
    LayoutOptions,
    MapControlOptions,
    LayerCatalogOptions,
    WorkLayerManagerOptions,
    OverviewMapOptions,
    StyleOptions,
    LayerOptions,
  } from './api-sitna/TC/Map';
}

/**
 * SITNA Layer module - exports layer options
 */
declare module 'api-sitna/SITNA/layer/Layer' {
  export { LayerOptions } from './api-sitna/SITNA/layer/Layer';
}

/**
 * TC/tool/Proxification module - exports Proxification constructor
 */
declare module 'api-sitna/TC/tool/Proxification' {
  const Proxification: ProxificationConstructor;
  export default Proxification;
}

/**
 * Global type augmentations for Window object
 */
declare global {
  interface Window {
    /**
     * SITNA namespace - main API entry point
     */
    SITNA?: {
      Map: new (div: HTMLElement | string, options?: MapOptions) => SitnaMap;
      Cfg?: Cfg;
      Consts?: Consts;
      [key: string]: unknown;
    };
    /**
     * TC namespace - internal SITNA utilities
     */
    TC?: {
      tool?: {
        Proxification?: ProxificationConstructor;
        [key: string]: unknown;
      };
      loadProjDefAsync?: (...args: unknown[]) => Promise<unknown>;
      [key: string]: unknown;
    };
    /**
     * Base URL for SITNA API resources
     */
    SITNA_BASE_URL?: string;
  }
}
