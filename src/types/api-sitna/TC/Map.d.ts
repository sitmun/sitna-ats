/**
 * Map options interface for SITNA Map configuration
 */
export interface MapOptions {
  /**
   * Código EPSG del sistema de referencia espacial del mapa
   */
  crs?: string;
  
  /**
   * Extensión inicial del mapa definida por x mínima, y mínima, x máxima, y máxima
   */
  initialExtent?: number[];
  
  /**
   * Extensión máxima del mapa definida por x mínima, y mínima, x máxima, y máxima
   */
  maxExtent?: number[];
  
  /**
   * URL de una carpeta de maquetación
   */
  layout?: string | LayoutOptions;
  
  /**
   * Lista de identificadores de capa o instancias de LayerOptions para incluir dichas capas como mapas de fondo
   */
  baseLayers?: Array<string | LayerOptions>;
  
  /**
   * Identificador de la capa de fondo por defecto
   */
  defaultBaseLayer?: string;
  
  /**
   * Lista de identificadores de capa o instancias de LayerOptions para incluir dichas capas como contenido del mapa
   */
  workLayers?: Array<string | LayerOptions>;
  
  /**
   * Opciones de controles de mapa
   */
  controls?: MapControlOptions;
  
  /**
   * Opciones de estilo de entidades geográficas
   */
  styles?: StyleOptions;
  
  /**
   * Código de idioma de la interfaz de usuario (es-ES, eu-ES, en-US)
   */
  locale?: string;
  
  /**
   * URL del proxy utilizado para peticiones a dominios remotos
   */
  proxy?: string;
  
  /**
   * Extensión de las capas de fondo
   */
  baselayerExtent?: number[];
  
  [key: string]: unknown;
}

/**
 * Layout options
 */
export interface LayoutOptions {
  config?: string;
  i18n?: string;
  markup?: string;
  script?: string;
  style?: string;
}

/**
 * Map control options
 */
export interface MapControlOptions {
  layerCatalog?: LayerCatalogOptions | false;
  workLayerManager?: WorkLayerManagerOptions;
  overviewMap?: OverviewMapOptions | boolean;
  [key: string]: unknown;
}

/**
 * Layer catalog options
 */
export interface LayerCatalogOptions {
  div?: string;
  enableSearch?: boolean;
  layers?: LayerOptions[];
}

/**
 * Work layer manager options
 */
export interface WorkLayerManagerOptions {
  div?: string;
}

/**
 * Overview map options
 */
export interface OverviewMapOptions {
  layer?: string;
  [key: string]: unknown;
}

/**
 * Style options for geographic features
 */
export interface StyleOptions {
  [key: string]: unknown;
}

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

