/**
 * TypeScript types for SITNA configuration
 */

import type { MapOptions } from 'api-sitna/TC/Map';
import type SitnaMap from 'api-sitna';

export interface SitnaLayer {
  id?: string;
  title: string;
  name?: string;
  hideTitle?: boolean;
  type?: string | number;
  url?: string;
  layerNames?: string[];
  hideTree?: boolean;
}

export interface SitnaLayerCatalog {
  div: string;
  enableSearch?: boolean;
  layers?: SitnaLayer[];
}

export interface SitnaWorkLayerManager {
  div: string;
}

export interface SitnaControls {
  layerCatalog?: SitnaLayerCatalog | false;
  workLayerManager?: SitnaWorkLayerManager;
  overviewMap?: boolean | unknown;
}

export interface SitnaConfig {
  layout?: string;
  controls?: SitnaControls;
  proxy?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    SITNA?: {
      Map: new (div: HTMLElement | string, options?: import('api-sitna/TC/Map').MapOptions) => import('api-sitna').default;
      Cfg?: import('api-sitna').Cfg;
      Consts?: import('api-sitna').Consts;
      [key: string]: unknown;
    };
    SITNA_BASE_URL?: string;
  }
}

