/**
 * SITNA Constants
 */
export interface Consts {
  layer: LayerConstants;
  layerType: LayerTypeConstants;
  event: EventConstants;
  format: FormatConstants;
  mimeType: MimeTypeConstants;
  [key: string]: unknown;
}

/**
 * Layer constants
 */
export interface LayerConstants {
  IDENA_DYNBASEMAP?: string;
  [key: string]: string | undefined;
}

/**
 * Layer type constants
 */
export interface LayerTypeConstants {
  WMS?: number;
  WMTS?: number;
  XYZ?: number;
  VECTOR?: number;
  WFS?: number;
  KML?: number;
  GROUP?: number;
  [key: string]: number | undefined;
}

/**
 * Event constants
 */
export interface EventConstants {
  LAYERADD?: string;
  LAYERREMOVE?: string;
  LAYEROPACITY?: string;
  LAYERVISIBILITY?: string;
  ZOOM?: string;
  BASELAYERCHANGE?: string;
  MAPCHANGE?: string;
  FEATUREADD?: string;
  FEATUREREMOVE?: string;
  FEATUREMODIFY?: string;
  FEATURESADD?: string;
  FEATURESCLEAR?: string;
  UPDATEPARAMS?: string;
  [key: string]: string | undefined;
}

/**
 * Format constants
 */
export interface FormatConstants {
  JSON?: string;
  [key: string]: string | undefined;
}

/**
 * MIME type constants
 */
export interface MimeTypeConstants {
  JPEG?: string;
  PNG?: string;
  [key: string]: string | undefined;
}

declare const Consts: Consts;
export default Consts;

