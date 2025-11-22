import { inject, Injectable } from '@angular/core';
import type SitnaMap from 'api-sitna';
import type { SitnaConfig } from '../../types/sitna.types';
import type { InitializeScenarioMapOptions } from '../../types/service.types';
import { SitnaConfigService } from './sitna-config.service';
import { LoggingService } from './logging.service';
import { ErrorHandlingService } from './error-handling.service';

// Re-export type for backward compatibility
export type { InitializeScenarioMapOptions } from '../../types/service.types';

/**
 * Service for scenario-specific map initialization.
 *
 * Provides a standardized way to:
 * - Load scenario config JSON
 * - Convert SitnaConfig to MapOptions
 * - Initialize map with error handling
 * - Handle map loaded callbacks
 */
@Injectable({
  providedIn: 'root',
})
export class ScenarioMapService {
  private readonly configService = inject(SitnaConfigService);
  private readonly logger = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlingService);

  /**
   * Initialize a SITNA map with scenario-specific configuration.
   *
   * @param scenarioConfig - The scenario configuration object
   * @param containerId - The DOM element ID for the map container
   * @param options - Optional callbacks and configuration
   * @returns The initialized map instance, or null if initialization failed
   */
  initializeScenarioMap(
    scenarioConfig: SitnaConfig,
    containerId: string,
    options?: InitializeScenarioMapOptions
  ): SitnaMap | null {
    // Convert config to map options (doesn't modify global state)
    const scenarioOptions =
      this.configService.applyConfigToMapOptions(scenarioConfig);

    // Initialize map
    const map = this.configService.initializeMap(containerId, scenarioOptions);

    if (map === null || map === undefined) {
      return null;
    }

    // Handle map loaded promise
    map
      .loaded()
      .then(async () => {
        if (options?.onLoaded) {
          await options.onLoaded(map);
        }
        if (options?.successMessage) {
          this.logger.warn(options.successMessage, map);
        }
      })
      .catch((error: unknown) => {
        const componentName =
          options?.componentName || 'ScenarioMapService.initializeScenarioMap';
        this.errorHandler.handleError(error, componentName);
      });

    return map;
  }

  /**
   * Generate a container ID from a scenario route.
   *
   * @param route - The scenario route (e.g., 'basic-map-initialization')
   * @returns Container ID (e.g., 'mapa-basic-map-initialization')
   */
  generateContainerId(route: string): string {
    return `mapa-${route}`;
  }
}

