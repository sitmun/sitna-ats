/**
 * TypeScript declarations for custom TC (SITNA) controls.
 * These extend the base TC.control types with SILME-specific controls.
 */

/**
 * Base control interface that all TC controls extend
 */
export interface TCControlBase {
  /**
   * CSS class name for the control
   */
  CLASS: string;

  /**
   * Template paths for the control's HTML templates
   */
  template: Record<string, string>;

  /**
   * Register the control with a map instance
   */
  register(map: unknown): unknown;

  /**
   * Render the control's UI
   */
  render?(data?: unknown): Promise<void> | void;

  /**
   * Load templates for the control
   */
  loadTemplates?(): Promise<void>;
}

/**
 * LayerCatalogSilmeFolders control
 * Extends TC.control.LayerCatalog with folder-based organization
 */
export interface LayerCatalogSilmeFoldersControl extends TCControlBase {
  CLASS: 'tc-ctl-lcat-silme-folders';

  /**
   * Enable search functionality in the layer catalog
   */
  enableSearch?: boolean;

  /**
   * Layers configuration for the catalog
   */
  layers?: Array<{
    id: string;
    title: string;
    name: string;
    url: string;
    layerNames?: string[];
    hideTitle?: boolean;
    hideTree?: boolean;
    type?: string;
  }>;
}

/**
 * BasemapSelectorSilme control
 * Extends TC.control.BasemapSelector with custom templates
 */
export interface BasemapSelectorSilmeControl extends TCControlBase {
  CLASS: 'tc-ctl-bmap-silme';

  /**
   * Available basemaps
   */
  basemaps?: Array<{
    id: string;
    title: string;
    thumbnail?: string;
  }>;
}

/**
 * FeatureInfoSilme control
 * Extends TC.control.FeatureInfo with custom templates
 */
export interface FeatureInfoSilmeControl extends TCControlBase {
  CLASS: 'tc-ctl-finfo-silme';

  /**
   * Maximum number of features to display
   */
  maxFeatures?: number;
}

/**
 * HelloWorld control
 * Simple example control for demonstration purposes
 */
export interface HelloWorldControl extends TCControlBase {
  CLASS: 'tc-ctl-hello-world';

  /**
   * Greeting message to display
   */
  greeting?: string;
}

/**
 * Augment TC namespace with custom controls
 */
declare global {
  namespace TC {
    namespace control {
      /**
       * Layer catalog with folder-based organization
       */
      class LayerCatalogSilmeFolders implements LayerCatalogSilmeFoldersControl {
        CLASS: 'tc-ctl-lcat-silme-folders';
        template: Record<string, string>;
        enableSearch?: boolean;
        layers?: Array<{
          id: string;
          title: string;
          name: string;
          url: string;
          layerNames?: string[];
          hideTitle?: boolean;
          hideTree?: boolean;
          type?: string;
        }>;
        register(map: unknown): unknown;
        render?(data?: unknown): Promise<void> | void;
      }

      /**
       * Basemap selector with custom templates
       */
      class BasemapSelectorSilme implements BasemapSelectorSilmeControl {
        CLASS: 'tc-ctl-bmap-silme';
        template: Record<string, string>;
        basemaps?: Array<{
          id: string;
          title: string;
          thumbnail?: string;
        }>;
        register(map: unknown): unknown;
        loadTemplates(): Promise<void>;
      }

      /**
       * Feature info with custom templates
       */
      class FeatureInfoSilme implements FeatureInfoSilmeControl {
        CLASS: 'tc-ctl-finfo-silme';
        template: Record<string, string>;
        maxFeatures?: number;
        register(map: unknown): unknown;
      }

      /**
       * Hello World example control
       */
      class HelloWorld implements HelloWorldControl {
        CLASS: 'tc-ctl-hello-world';
        template: Record<string, string>;
        greeting?: string;
        register(map: unknown): unknown;
      }
    }
  }
}

export {};

