import type Proxification from './tool/Proxification';

/**
 * Projection data structure returned by getProjectionData
 */
export interface ProjectionData {
  code: string;
  kind: string;
  name: string;
  wkt: string;
  proj4: string;
  bbox: number[];
  unit: string | null;
  accuracy: number | null;
}

/**
 * TC namespace type definition
 */
export interface TCNamespace {
  /**
   * Base URL for TC API resources
   */
  apiLocation?: string;
  tool?: {
    Proxification?: typeof Proxification;
    [key: string]: unknown;
  };
  loadProjDefAsync?: (...args: unknown[]) => Promise<unknown>;
  /**
   * Get projection data for a given CRS code.
   * This method may be patched/backported in some scenarios.
   */
  getProjectionData?: (options?: { crs?: string; sync?: boolean }) => ProjectionData | false | null | Promise<ProjectionData | false | { status: string; number_result: number; results: Array<{ code: string; name: string; def: string; proj4: string; unit: string | null }> }>;
  /**
   * Cache for projection data, keyed by CRS code.
   * This property may be patched/backported in some scenarios.
   */
  projectionDataCache?: Record<string, ProjectionData>;
  wrap?: {
    Map?: {
      prototype?: {
        insertLayer?: (...args: unknown[]) => unknown;
        setBaseLayer?: (...args: unknown[]) => unknown;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    layer?: {
      Raster?: {
        prototype?: {
          getAttribution?: (...args: unknown[]) => unknown;
          getCompatibleCRS?: (...args: unknown[]) => unknown;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  control?: {
    LayerCatalogSilmeFolders?: {
      prototype?: {
        render?: (...args: unknown[]) => unknown;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

