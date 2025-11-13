/**
 * TypeScript types for SITNA configuration
 */

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

