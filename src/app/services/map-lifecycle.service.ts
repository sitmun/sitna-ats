import { Injectable, inject, signal, type Signal } from '@angular/core';
import type SitnaMap from 'api-sitna';
import type { MapOptions } from 'api-sitna/TC/Map';
import { SitnaConfigService } from './sitna-config.service';
import { LoggingService } from './logging.service';
import { ErrorHandlingService } from './error-handling.service';

export interface MapLifecycleState {
  map: SitnaMap | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Service for managing SITNA map lifecycle with reactive state.
 *
 * Provides:
 * - Map initialization with loading state tracking
 * - Signal-based reactive state management
 * - Automatic error handling and logging
 * - Async map loading with Promise-based API
 * - Clean map destruction
 *
 * Uses Angular signals for reactive state updates, making it easy to
 * track map initialization status in components.
 */
@Injectable({
  providedIn: 'root',
})
export class MapLifecycleService {
  private readonly configService = inject(SitnaConfigService);
  private readonly logger = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlingService);

  private readonly mapState = signal<MapLifecycleState>({
    map: null,
    isInitialized: false,
    isLoading: false,
    error: null,
  });

  getState(): Signal<MapLifecycleState> {
    return this.mapState.asReadonly();
  }

  getMap(): SitnaMap | null {
    return this.mapState().map;
  }

  async initializeMap(
    containerId: string,
    options?: MapOptions
  ): Promise<SitnaMap | null> {
    this.mapState.update((state) => ({
      ...state,
      isLoading: true,
      error: null,
    }));

    try {
      const map = this.configService.initializeMap(containerId, options);

      if (map === null) {
        const error = 'Failed to initialize map: SITNA library not available';
        this.mapState.update((state) => ({
          ...state,
          isLoading: false,
          error,
        }));
        this.errorHandler.handleError(new Error(error), 'MapLifecycleService');
        return null;
      }

      await this.waitForMapLoaded(map);

      this.mapState.update((state) => ({
        ...state,
        map,
        isInitialized: true,
        isLoading: false,
        error: null,
      }));

      this.logger.info('Map initialized successfully', { containerId, map });
      return map;
    } catch (error: unknown) {
      const appError = this.errorHandler.handleError(
        error,
        'MapLifecycleService.initializeMap'
      );
      this.mapState.update((state) => ({
        ...state,
        isLoading: false,
        error: appError.message,
      }));
      return null;
    }
  }

  destroyMap(): void {
    const currentMap = this.mapState().map;
    if (currentMap !== null) {
      this.logger.debug('Destroying map instance');
    }

    this.mapState.update((state) => ({
      ...state,
      map: null,
      isInitialized: false,
      isLoading: false,
      error: null,
    }));
  }

  private waitForMapLoaded(map: SitnaMap): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        map
          .loaded(() => {
            resolve();
          })
          .catch((error: unknown) => {
            reject(error);
          });
      } catch (error: unknown) {
        reject(error);
      }
    });
  }
}

