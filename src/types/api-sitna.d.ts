/**
 * Import TC namespace type definition
 */
import type { TCNamespace } from './api-sitna/TC/TCNamespace';
export type { TCNamespace };

/**
 * Import type definitions for re-export
 */
import type { Cfg as CfgType } from './api-sitna/TC/Cfg';
import type { Consts as ConstsType } from './api-sitna/TC/Consts';

type MapOptions = import('./api-sitna/TC/Map').MapOptions;
type SitnaMap = import('./api-sitna/SITNA/Map').default;
type Cfg = import('./api-sitna/TC/Cfg').default;
type Consts = import('./api-sitna/TC/Consts').default;

/**
 * Main api-sitna module declaration
 */
declare module 'api-sitna' {
  import SitnaMap from './api-sitna/SITNA/Map';
  import Cfg from './api-sitna/TC/Cfg';
  import Consts from './api-sitna/TC/Consts';
  import Layer from './api-sitna/SITNA/layer/Layer';
  import Raster from './api-sitna/SITNA/layer/Raster';
  import Vector from './api-sitna/SITNA/layer/Vector';
  import Feature from './api-sitna/SITNA/feature/Feature';
  import Point from './api-sitna/SITNA/feature/Point';
  import MultiPoint from './api-sitna/SITNA/feature/MultiPoint';
  import Marker from './api-sitna/SITNA/feature/Marker';
  import MultiMarker from './api-sitna/SITNA/feature/MultiMarker';
  import Polyline from './api-sitna/SITNA/feature/Polyline';
  import MultiPolyline from './api-sitna/SITNA/feature/MultiPolyline';
  import Polygon from './api-sitna/SITNA/feature/Polygon';
  import MultiPolygon from './api-sitna/SITNA/feature/MultiPolygon';
  import Circle from './api-sitna/SITNA/feature/Circle';

  interface layer {
    Layer: typeof Layer;
    Raster: typeof Raster;
    Vector: typeof Vector;
  }

  interface feature {
    Feature: typeof Feature;
    Point: typeof Point;
    MultiPoint: typeof MultiPoint;
    Marker: typeof Marker;
    MultiMarker: typeof MultiMarker;
    Polyline: typeof Polyline;
    MultiPolyline: typeof MultiPolyline;
    Polygon: typeof Polygon;
    MultiPolygon: typeof MultiPolygon;
    Circle: typeof Circle;
  }

  // Export values
  export { Cfg, Consts, feature, layer, SitnaMap as Map };
  // Export types - TypeScript allows same name for value and type
  type Cfg = CfgType;
  type Consts = ConstsType;
  export type { Cfg, Consts };
  export default SitnaMap;
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
    TC?: TCNamespace;
    /**
     * Base URL for SITNA API resources
     */
    SITNA_BASE_URL?: string;
  }
}
