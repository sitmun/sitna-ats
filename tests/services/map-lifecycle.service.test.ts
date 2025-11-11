import { TestBed } from '@angular/core/testing';
import { MapLifecycleService, type MapLifecycleState } from '../../src/app/services/map-lifecycle.service';
import { SitnaConfigService } from '../../src/app/services/sitna-config.service';
import { LoggingService } from '../../src/app/services/logging.service';
import { ErrorHandlingService } from '../../src/app/services/error-handling.service';
import type SitnaMap from 'api-sitna';
import type { MapOptions } from 'api-sitna/TC/Map';

describe('MapLifecycleService', () => {
  let service: MapLifecycleService;
  let sitnaConfigService: SitnaConfigService;
  let loggingService: LoggingService;
  let errorHandlingService: ErrorHandlingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MapLifecycleService,
        SitnaConfigService,
        LoggingService,
        ErrorHandlingService,
      ],
    });
    service = TestBed.inject(MapLifecycleService);
    sitnaConfigService = TestBed.inject(SitnaConfigService);
    loggingService = TestBed.inject(LoggingService);
    errorHandlingService = TestBed.inject(ErrorHandlingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getState', () => {
    it('should return initial state with no map', () => {
      const state = service.getState();
      expect(state()).toEqual({
        map: null,
        isInitialized: false,
        isLoading: false,
        error: null,
      });
    });
  });

  describe('getMap', () => {
    it('should return null when no map is initialized', () => {
      expect(service.getMap()).toBeNull();
    });
  });

  describe('initializeMap', () => {
    it('should set loading state to true initially', async () => {
      const mockMap = {
        loaded: jest.fn().mockReturnValue({
          then: jest.fn().mockReturnValue({
            catch: jest.fn(),
          }),
        }),
      } as unknown as SitnaMap;

      jest.spyOn(sitnaConfigService, 'initializeMap').mockReturnValue(mockMap);

      // Start initialization but don't await
      const promise = service.initializeMap('test-container');

      // Check loading state
      const state = service.getState()();
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();

      await promise;
    });

    it('should initialize map successfully', async () => {
      const mockMap = {
        loaded: jest.fn().mockReturnValue(
          Promise.resolve()
        ),
      } as unknown as SitnaMap;

      jest.spyOn(sitnaConfigService, 'initializeMap').mockReturnValue(mockMap);
      jest.spyOn(loggingService, 'info');

      const result = await service.initializeMap('test-container');

      expect(result).toBe(mockMap);
      const state = service.getState()();
      expect(state.map).toBe(mockMap);
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle map initialization failure when SITNA not available', async () => {
      jest.spyOn(sitnaConfigService, 'initializeMap').mockReturnValue(null);
      jest.spyOn(errorHandlingService, 'handleError');

      const result = await service.initializeMap('test-container');

      expect(result).toBeNull();
      const state = service.getState()();
      expect(state.map).toBeNull();
      expect(state.isInitialized).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toContain('SITNA library not available');
    });

    it('should handle map loading errors', async () => {
      const testError = new Error('Map loading failed');
      const mockMap = {
        loaded: jest.fn().mockReturnValue(
          Promise.reject(testError)
        ),
      } as unknown as SitnaMap;

      jest.spyOn(sitnaConfigService, 'initializeMap').mockReturnValue(mockMap);
      jest.spyOn(errorHandlingService, 'handleError').mockReturnValue({
        message: 'Map loading failed',
        error: testError,
        timestamp: new Date(),
      });

      const result = await service.initializeMap('test-container');

      expect(result).toBeNull();
      const state = service.getState()();
      expect(state.error).toBe('Map loading failed');
      expect(state.isLoading).toBe(false);
    });

    it('should pass options to SitnaConfigService', async () => {
      const mockMap = {
        loaded: jest.fn().mockReturnValue(Promise.resolve()),
      } as unknown as SitnaMap;

      const initializeSpy = jest.spyOn(sitnaConfigService, 'initializeMap').mockReturnValue(mockMap);
      const options: MapOptions = { crs: 'EPSG:4326' };

      await service.initializeMap('test-container', options);

      expect(initializeSpy).toHaveBeenCalledWith('test-container', options);
    });
  });

  describe('destroyMap', () => {
    it('should reset state when map exists', async () => {
      const mockMap = {
        loaded: jest.fn().mockReturnValue(Promise.resolve()),
      } as unknown as SitnaMap;

      jest.spyOn(sitnaConfigService, 'initializeMap').mockReturnValue(mockMap);
      jest.spyOn(loggingService, 'debug');

      await service.initializeMap('test-container');

      // Verify map is set
      expect(service.getMap()).toBe(mockMap);

      // Destroy the map
      service.destroyMap();

      const state = service.getState()();
      expect(state.map).toBeNull();
      expect(state.isInitialized).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(loggingService.debug).toHaveBeenCalledWith('Destroying map instance');
    });

    it('should reset state when no map exists', () => {
      service.destroyMap();

      const state = service.getState()();
      expect(state.map).toBeNull();
      expect(state.isInitialized).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});

