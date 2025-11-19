import {
  Component,
  inject,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import scenarioConfigJson from './sitna-config.json';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { BaseScenarioComponent } from '../base-scenario.component';
import {
  createPatchManager,
  type PatchManager,
} from '../../utils/monkey-patch';

// The patch file directly modifies TC.getProjectionData when loaded
// We'll require it in applyPatch() after TC is available and save the original for restoration

import type { ProjectionData } from 'api-sitna';

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'Projection Data Current',
  description: 'Patch for current api-sitna 4.1.0 getProjectionData to fix WKT compatibility issues with proj4js.',
  tags: ['projection', 'patch', 'crs', 'epsg', 'sitmun'],
  route: 'projection-data-current',
};


@Component({
  selector: 'app-projection-data-current',
  templateUrl: './projection-data-current.component.html',
  styleUrls: ['./projection-data-current.component.scss'],
})
export class ProjectionDataCurrentComponent extends BaseScenarioComponent {
  epsgCode: string = '4326';
  testResult: ProjectionData | false | null = null;
  testError: string | null = null;
  isLoading: boolean = false;
  cachedCodes: string[] = [];

  private readonly snackBar = inject(MatSnackBar);
  private patchManager: PatchManager = createPatchManager();

  constructor() {
    super();
    this.metadata = SCENARIO_METADATA;
    this.initializeMapWithPreload({
      preloadSteps: [
        () => this.applyPatchWithRetry(),
      ],
      scenarioConfig: scenarioConfigJson as Parameters<typeof this.scenarioMapService.initializeScenarioMap>[0],
      mapOptions: {
        successMessage: 'Projection Data Current: Map loaded successfully',
        onLoaded: () => {
          // Fix CSS class mismatch in Coordinates control dialog
          this.fixCoordinatesDialogCssClasses();
          this.runInZoneHelper(() => {});
          this.updateCachedCodes();
        },
      },
    });
  }

  override ngOnDestroy(): void {
    this.patchManager.restoreAll();
    super.ngOnDestroy();
  }

  private async applyPatchWithRetry(): Promise<void> {
    const TC = await this.tcNamespaceService.waitForTC();
    await this.applyPatch(TC);
  }

  private async applyPatch(TC: NonNullable<ReturnType<typeof this.tcNamespaceService.getTC>>): Promise<void> {

    try {
      // Save the original getProjectionData function before applying the patch
      const originalGetProjectionData = TC['getProjectionData'];

      // Initialize TC.projectionDataCache if it doesn't exist
      // The patch will use this and expose it for analysis
      if (!TC['projectionDataCache']) {
        TC['projectionDataCache'] = {};
      }

      // Require the patch file - it will use TC.projectionDataCache and expose it
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./src/TCProjectionDataPatch.js');

      // Create a restore function to restore the original
      const restore = (): void => {
        if (TC && originalGetProjectionData) {
          TC['getProjectionData'] = originalGetProjectionData;
        }
      };

      this.patchManager.add(restore);
      this.logger.warn('Applied TCProjectionDataPatch to TC namespace');
    } catch (error) {
      this.logger.error('Failed to apply TCProjectionDataPatch', error);
      throw error;
    }
  }

  testGetProjectionDataSync(): void {
    this.isLoading = true;
    this.testResult = null;
    this.testError = null;
    this.runInZoneHelper(() => {});

    try {
      if (!this.isTCPropertyRegistered('getProjectionData')) {
        throw new Error('TC.getProjectionData not available');
      }

      const TC = this.tcNamespaceService.getTC()!;
      const result = TC.getProjectionData!({ crs: `EPSG:${this.epsgCode}`, sync: true });

      // In sync mode, result should not be a Promise
      if (result instanceof Promise) {
        this.testError = 'Unexpected Promise returned in sync mode';
        this.snackBar.open(`✗ Sync mode returned Promise for EPSG:${this.epsgCode}`, 'Close', { duration: 4000 });
        this.logger.error('Sync test returned Promise', result);
        return;
      }

      // The patch returns EPSG API format: { status, number_result, results: [...] } or null
      if (result && typeof result === 'object' && 'results' in result && Array.isArray(result.results) && result.results.length > 0) {
        // Extract the actual projection data from results array
        const firstResult = result.results[0];
        const code = firstResult.code || this.epsgCode;
        this.testResult = {
          code: code,
          kind: 'CRS-UNKNOWN',
          name: firstResult.name || 'Unknown',
          wkt: firstResult.def || '', // Patch doesn't provide WKT, but we'll use proj4 as def
          proj4: firstResult.proj4 || '',
          bbox: [],
          unit: null,
          accuracy: null
        } as ProjectionData;
        this.snackBar.open(`✓ Sync test successful for EPSG:${code}`, 'Close', { duration: 3000 });
        this.logger.warn('Sync test successful', this.testResult);
        this.updateCachedCodes();
      } else if (result && typeof result === 'object' && 'code' in result) {
        // Direct ProjectionData format (fallback for compatibility)
        this.testResult = result;
        this.snackBar.open(`✓ Sync test successful for EPSG:${(this.testResult as ProjectionData).code}`, 'Close', { duration: 3000 });
        this.logger.warn('Sync test successful (direct format)', result);
        this.updateCachedCodes();
      } else if (result === null || result === false) {
        this.testError = 'No data found for this EPSG code';
        this.snackBar.open(`✗ No data found for EPSG:${this.epsgCode}`, 'Close', { duration: 4000 });
        this.logger.warn('Sync test returned null/false', result);
      } else {
        this.testError = 'Invalid result format returned';
        this.snackBar.open(`✗ Invalid result format for EPSG:${this.epsgCode}`, 'Close', { duration: 4000 });
        this.logger.warn('Sync test returned unexpected format', result);
      }
    } catch (error: unknown) {
      this.testError = error instanceof Error ? error.message : String(error);
      this.snackBar.open(`✗ Test failed: ${this.testError}`, 'Close', { duration: 5000 });
      this.logger.error('Sync test failed', error);
    } finally {
      this.isLoading = false;
      this.runInZoneHelper(() => {});
    }
  }

  async testGetProjectionDataAsync(): Promise<void> {
    this.isLoading = true;
    this.testResult = null;
    this.testError = null;
    this.runInZoneHelper(() => {});

    try {
      if (!this.isTCPropertyRegistered('getProjectionData')) {
        throw new Error('TC.getProjectionData not available');
      }

      const TC = this.tcNamespaceService.getTC()!;
      const result = await TC.getProjectionData!({ crs: `EPSG:${this.epsgCode}` });

      // Async mode returns wrapped EPSG API format: { status, number_result, results: [...] }
      if (result && typeof result === 'object' && 'results' in result && Array.isArray(result.results) && result.results.length > 0) {
        // Extract the actual ProjectionData from results array
        const firstResult = result.results[0];
        // Convert to ProjectionData format for display
        const code = firstResult.code || this.epsgCode;
        this.testResult = {
          code: code,
          kind: 'CRS-UNKNOWN',
          name: firstResult.name || 'Unknown',
          wkt: firstResult.def || '',
          proj4: firstResult.proj4 || '',
          bbox: [],
          unit: firstResult.unit || null,
          accuracy: null
        } as ProjectionData;
        this.snackBar.open(`✓ Async test successful for EPSG:${code}`, 'Close', { duration: 3000 });
        this.logger.warn('Async test successful', this.testResult);
      } else if (result && typeof result === 'object' && 'code' in result) {
        // Direct ProjectionData format (shouldn't happen in async mode, but handle it)
        this.testResult = result;
        this.snackBar.open(`✓ Async test successful for EPSG:${this.epsgCode}`, 'Close', { duration: 3000 });
        this.logger.warn('Async test successful (direct format)', result);
      } else {
        this.testError = 'No data found or invalid result';
        this.snackBar.open(`✗ No data found for EPSG:${this.epsgCode}`, 'Close', { duration: 4000 });
        this.logger.warn('Async test returned unexpected format', result);
      }
    } catch (error: unknown) {
      this.testError = error instanceof Error ? error.message : String(error);
      this.snackBar.open(`✗ Test failed: ${this.testError}`, 'Close', { duration: 5000 });
      this.logger.error('Async test failed', error);
    } finally {
      this.isLoading = false;
      this.runInZoneHelper(() => {});
      this.updateCachedCodes();
    }
  }

  updateCachedCodes(showNotification: boolean = false): void {
    const previousCount = this.cachedCodes.length;
    const TC = this.tcNamespaceService.getTC();
    // The cache is now accessible via TC.projectionDataCache (exposed through globalThis)
    const cache = TC?.['projectionDataCache'] as Record<string, ProjectionData> | undefined;
    if (cache) {
      this.cachedCodes = Object.keys(cache).sort();
    } else {
      this.cachedCodes = [];
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

}

