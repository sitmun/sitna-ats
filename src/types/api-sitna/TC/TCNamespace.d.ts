import type Proxification from './tool/Proxification';

/**
 * TC namespace type definition
 */
export interface TCNamespace {
  tool?: {
    Proxification?: typeof Proxification;
    [key: string]: unknown;
  };
  loadProjDefAsync?: (...args: unknown[]) => Promise<unknown>;
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

