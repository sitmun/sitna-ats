declare module 'api-sitna' {
  import SitnaMap from './api-sitna/SITNA/Map';
  export default SitnaMap;
  export { Cfg, Consts, feature, layer, Map } from './api-sitna/sitna';
}

declare module 'api-sitna/TC/Map' {
  export type { MapOptions, LayoutOptions, MapControlOptions, LayerCatalogOptions, WorkLayerManagerOptions, OverviewMapOptions, StyleOptions, LayerOptions } from './api-sitna/TC/Map';
}

declare module 'api-sitna/SITNA/layer/Layer' {
  import Layer from './api-sitna/SITNA/layer/Layer';
  export { LayerOptions } from './api-sitna/SITNA/layer/Layer';
  export default Layer;
  export type { LayerOptions } from './api-sitna/SITNA/layer/Layer';
}

declare module 'api-sitna/TC/tool/Proxification' {
  // Proxification is a constructor function
  type ProxificationConstructor = new (proxy: unknown, options?: unknown) => unknown;
  const Proxification: ProxificationConstructor;
  export default Proxification;
}

declare global {
  interface Window {
    SITNA?: {
      Map: new (div: HTMLElement | string, options?: import('./api-sitna/TC/Map').MapOptions) => import('./api-sitna/SITNA/Map').default;
      Cfg?: import('./api-sitna/TC/Cfg').default;
      Consts?: import('./api-sitna/TC/Consts').default;
      [key: string]: unknown;
    };
    TC?: {
      tool?: {
        Proxification?: new (proxy: unknown, options?: unknown) => unknown;
        [key: string]: unknown;
      };
      loadProjDefAsync?: (...args: unknown[]) => Promise<unknown>;
      [key: string]: unknown;
    };
    SITNA_BASE_URL?: string;
  }
}

