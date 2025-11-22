import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { ProjectionData } from 'api-sitna';
import { BaseScenarioComponent } from '../base-scenario.component';

/**
 * Base class for projection data scenario components.
 * Provides common functionality for testing projection data and managing cache.
 */
export abstract class BaseProjectionScenarioComponent extends BaseScenarioComponent {
  epsgCode: string = '4326';
  testResult: ProjectionData | false | null = null;
  testError: string | null = null;
  isLoading: boolean = false;
  cachedCodes: string[] = [];

  protected readonly snackBar = inject(MatSnackBar);

  /**
   * Get the projection data cache from TC namespace.
   * Subclasses can override to provide fallback cache if needed.
   *
   * @returns The projection data cache or undefined
   */
  protected getProjectionDataCache(): Record<string, ProjectionData> | undefined {
    const TC = this.tcNamespaceService.getTC();
    return TC?.['projectionDataCache'] as Record<string, ProjectionData> | undefined;
  }

  /**
   * Update the cached codes list from the projection data cache.
   *
   * @param showNotification - Whether to show a notification when cache is updated
   */
  updateCachedCodes(showNotification: boolean = false): void {
    const previousCount = this.cachedCodes.length;
    const cache = this.getProjectionDataCache();
    if (cache) {
      this.cachedCodes = Object.keys(cache).sort();
    } else {
      this.cachedCodes = this.getFallbackCacheKeys();
    }

    const newCount = this.cachedCodes.length;
    const added = newCount - previousCount;

    // Show feedback to user via snackbar only when explicitly requested (button click)
    if (showNotification) {
      let message: string;
      if (added > 0) {
        message = `Cache refreshed: ${added} new projection(s) added. Total: ${newCount}`;
        this.snackBar.open(message, 'Close', { duration: 4000 });
      } else if (previousCount === 0 && newCount > 0) {
        message = `Cache loaded: ${newCount} projection(s) cached`;
        this.snackBar.open(message, 'Close', { duration: 3000 });
      } else {
        message = `Cache refreshed: ${newCount} projection(s) (no changes)`;
        this.snackBar.open(message, 'Close', { duration: 2500 });
      }

      this.logger.info(message);
    }

    this.runInZoneHelper(() => {});
  }

  /**
   * Get fallback cache keys when TC.projectionDataCache is not available.
   * Subclasses can override to provide their own fallback cache.
   *
   * @returns Array of cache keys
   */
  protected getFallbackCacheKeys(): string[] {
    return [];
  }

  /**
   * Test getProjectionData in sync mode.
   * Subclasses should implement their own logic based on their patch implementation.
   */
  abstract testGetProjectionDataSync(): void;

  /**
   * Test getProjectionData in async mode.
   * Subclasses should implement their own logic based on their patch implementation.
   */
  abstract testGetProjectionDataAsync(): Promise<void>;
}

