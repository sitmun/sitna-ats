import type SitnaMap from 'api-sitna';
import type { MapOptions } from 'api-sitna/TC/Map';

/**
 * Create a mock SITNA map instance for testing
 */
export function createMockSitnaMap(overrides?: Partial<SitnaMap>): SitnaMap {
  return {
    loaded: jest.fn().mockResolvedValue(undefined),
    addLayer: jest.fn().mockResolvedValue({} as any),
    removeLayer: jest.fn(),
    ...overrides,
  } as unknown as SitnaMap;
}

/**
 * Create default map options for testing
 */
export function createDefaultMapOptions(): MapOptions {
  return {
    crs: 'EPSG:3857',
    initialExtent: [-2000000, 4000000, 2000000, 6000000],
  };
}

