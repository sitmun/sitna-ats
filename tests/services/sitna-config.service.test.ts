import { TestBed } from '@angular/core/testing';
import { SitnaConfigService } from '../../src/app/services/sitna-config.service';
import { LoggingService } from '../../src/app/services/logging.service';
import type { SitnaConfig } from '../../src/app/types/sitna.types';
import type { MapOptions } from 'api-sitna/TC/Map';

describe('SitnaConfigService', () => {
  let service: SitnaConfigService;
  let loggingService: LoggingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SitnaConfigService, LoggingService],
    });
    service = TestBed.inject(SitnaConfigService);
    loggingService = TestBed.inject(LoggingService);

    // Mock SITNA global
    window.SITNA = {
      Map: class MockMap {
        constructor(div: HTMLElement | string, options?: MapOptions) {
          return { containerId: typeof div === 'string' ? div : div.id, options };
        }
      },
      Cfg: {
        layout: null,
        controls: {},
        proxy: null,
      },
      Consts: {
        layerType: {
          WMS: 'WMS',
          WMTS: 'WMTS',
          XYZ: 'XYZ',
          Vector: 'Vector',
        },
      },
    } as typeof window.SITNA;
  });

  afterEach(() => {
    delete window.SITNA;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initializeMap', () => {
    it('should initialize a map with default options', () => {
      const containerId = 'test-map';
      const map = service.initializeMap(containerId);

      expect(map).toBeTruthy();
      const mockMap = map as unknown as { containerId: string; options?: MapOptions };
      expect(mockMap.containerId).toBe(containerId);
    });

    it('should initialize a map with custom options', () => {
      const containerId = 'test-map';
      const customOptions: MapOptions = {
        layout: 'custom-layout',
        crs: 'EPSG:4326',
      };
      const map = service.initializeMap(containerId, customOptions);

      expect(map).toBeTruthy();
      const mockMap = map as unknown as { containerId: string; options?: MapOptions };
      expect(mockMap.options).toMatchObject(customOptions);
    });

    it('should return null when SITNA is not available', () => {
      delete window.SITNA;
      const errorSpy = jest.spyOn(loggingService, 'error');

      const map = service.initializeMap('test-map');

      expect(map).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith('SITNA library not loaded');
    });
  });

  describe('setDefaultMapOptions', () => {
    it('should merge options with existing defaults', () => {
      const newOptions: MapOptions = {
        crs: 'EPSG:25830',
        layout: 'new-layout',
      };

      service.setDefaultMapOptions(newOptions);
      const defaultOptions = service.getDefaultMapOptions();

      expect(defaultOptions.crs).toBe('EPSG:25830');
      expect(defaultOptions.layout).toBe('new-layout');
    });
  });

  describe('getDefaultMapOptions', () => {
    it('should return a copy of default options', () => {
      const options1 = service.getDefaultMapOptions();
      const options2 = service.getDefaultMapOptions();

      expect(options1).not.toBe(options2);
      expect(options1).toEqual(options2);
    });
  });

  describe('applyConfig', () => {
    it('should apply layout from config', () => {
      const config: SitnaConfig = {
        layout: 'test-layout',
      };

      service.applyConfig(config);
      const defaultOptions = service.getDefaultMapOptions();

      expect(defaultOptions.layout).toBe('test-layout');
      expect(window.SITNA?.Cfg?.layout).toBe('test-layout');
    });

    it('should apply proxy from config', () => {
      const config: SitnaConfig = {
        proxy: 'https://proxy.example.com',
      };

      service.applyConfig(config);
      const defaultOptions = service.getDefaultMapOptions();

      expect(defaultOptions.proxy).toBe('https://proxy.example.com');
      expect(window.SITNA?.Cfg?.proxy).toBe('https://proxy.example.com');
    });

    it('should not apply empty layout', () => {
      const originalLayout = service.getDefaultMapOptions().layout;
      const config: SitnaConfig = {
        layout: '',
      };

      service.applyConfig(config);
      const defaultOptions = service.getDefaultMapOptions();

      expect(defaultOptions.layout).toBe(originalLayout);
    });
  });

  describe('applyConfigToMapOptions', () => {
    it('should convert config to MapOptions without modifying global state', () => {
      const config: SitnaConfig = {
        layout: 'scenario-layout',
        crs: 'EPSG:3857',
      };

      const mapOptions = service.applyConfigToMapOptions(config);

      expect(mapOptions.layout).toBe('scenario-layout');
      expect(mapOptions.crs).toBe('EPSG:3857');
      // Global config should not be modified
      expect(window.SITNA?.Cfg?.layout).not.toBe('scenario-layout');
    });

    it('should handle controls configuration', () => {
      const config: SitnaConfig = {
        controls: {
          layerCatalog: {
            div: 'catalog-div',
            enableSearch: true,
          },
        },
      };

      const mapOptions = service.applyConfigToMapOptions(config);

      expect(mapOptions.controls).toBeDefined();
      const controls = mapOptions.controls as Record<string, unknown>;
      expect(controls['layerCatalog']).toBeDefined();
      expect((controls['layerCatalog'] as Record<string, unknown>)['div']).toBe('catalog-div');
    });

    it('should handle disabled controls', () => {
      const config: SitnaConfig = {
        controls: {
          layerCatalog: false,
        },
      };

      const mapOptions = service.applyConfigToMapOptions(config);

      const controls = mapOptions.controls as Record<string, unknown>;
      expect(controls['layerCatalog']).toBe(false);
    });
  });

  describe('deprecated methods', () => {
    it('setLayout should log a warning', () => {
      const warnSpy = jest.spyOn(loggingService, 'warn');

      service.setLayout('test-layout');

      expect(warnSpy).toHaveBeenCalledWith(
        'setLayout() is deprecated. Use MapOptions.layout during map initialization instead.'
      );
    });

    it('configureDefaultLayers should log a warning when SITNA is available', () => {
      const warnSpy = jest.spyOn(loggingService, 'warn');

      service.configureDefaultLayers([]);

      expect(warnSpy).toHaveBeenCalledWith(
        'configureDefaultLayers() is deprecated. Add layers via map.addLayer() after map initialization.'
      );
    });

    it('configureDefaultLayers should log an error when SITNA is not available', () => {
      delete window.SITNA;
      const errorSpy = jest.spyOn(loggingService, 'error');

      service.configureDefaultLayers([]);

      expect(errorSpy).toHaveBeenCalledWith('SITNA library not loaded');
    });
  });
});

