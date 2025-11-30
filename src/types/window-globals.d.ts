/**
 * TypeScript declarations for SITNA/SILME global variables attached to the window object.
 * These globals are used by SILME controls and patches for inter-component communication.
 */

declare global {
  interface Window {
    /**
     * Global SITNA namespace (API for SITNA library)
     * @see node_modules/api-sitna/index.d.ts
     */
    SITNA?: typeof import('api-sitna');

    /**
     * Global TC namespace (internal SITNA API)
     * Note: This is a more granular API than SITNA, used internally
     */
    TC?: {
      Map?: {
        get?: (element: Element) => unknown;
        prototype?: unknown;
      };
      control?: Record<string, unknown>;
      wrap?: {
        Map?: {
          prototype?: unknown;
        };
        layer?: {
          Raster?: {
            prototype?: unknown;
          };
        };
      };
      layer?: {
        Layer?: {
          prototype?: unknown;
        };
      };
      apiLocation?: string;
      syncLoadJS?: (url: string) => void;
      [key: string]: unknown;
    };

    /**
     * SILME map instance (TC-wrapped map)
     * Set by scenarios to enable access to the map from patches and external scripts.
     */
    silmeMap?: unknown;

    /**
     * SILME layer catalog control instance
     * Used by SilmeMap.js for layer management
     */
    silmeLayerCatalog?: unknown;

    /**
     * SILME search control instance
     * Used for geocoding and search functionality
     */
    silmeSearch?: unknown;

    /**
     * Array of tree layer definitions used by LayerCatalogSilmeFolders
     * Must be initialized before the control is instantiated
     */
    treeLayers?: Array<unknown>;

    /**
     * Array of initial layers to add to the map
     * Used by SilmeMap.js during initialization
     */
    initLayers?: Array<unknown>;

    /**
     * Pending layer to be added to the map
     * Temporary storage for layer operations
     */
    pendingLayer?: unknown;

    /**
     * Modal configuration for layer catalog selection
     * Contains catalog list and current selection index
     */
    layerCatalogsSilmeForModal?: {
      currentCatalog: number;
      catalogs: Array<{
        id: number;
        catalog: string;
      }>;
    };

    /**
     * Search function for layers in the tree structure
     * Provided by SilmeTree.js, used by LayerCatalogSilmeFolders
     */
    cercaLayers?: (query: string) => unknown[];

    /**
     * Add layer function provided by SilmeMap.js
     * Used to add layers to the map from the layer catalog
     */
    silmeAddLayer?: (layer: unknown) => void;

    /**
     * Remove layer function provided by SilmeMap.js
     * Used to remove layers from the map
     */
    silmeRemoveLayer?: (layerId: string) => void;
  }
}

export {};

