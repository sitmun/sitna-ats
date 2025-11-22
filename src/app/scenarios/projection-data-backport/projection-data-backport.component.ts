import {
  Component,
} from '@angular/core';
import scenarioConfigJson from './sitna-config.json';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { BaseProjectionScenarioComponent } from '../shared/base-projection-scenario.component';
import {
  patchFunction,
  patchProperty,
} from '../../utils/monkey-patch';
import type { ProjectionData } from 'api-sitna';
import {
  type GetProjectionDataOptions,
  projectionDataCache,
  getProjectionData,
  initializeProj4Definitions,
} from './src/projection-data-backport';

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'Projection Data Backport',
  description: 'Backport of getProjectionData and projectionDataCache from api-sitna version 4.8.0.',
  tags: ['projection', 'backport', 'crs', 'epsg'],
  route: 'projection-data-backport',
};


@Component({
  selector: 'app-projection-data-backport',
  templateUrl: './projection-data-backport.component.html',
  styleUrls: ['./projection-data-backport.component.scss'],
})
export class ProjectionDataBackportComponent extends BaseProjectionScenarioComponent {

  constructor() {
    super();
    this.metadata = SCENARIO_METADATA;
    this.initializeMapWithPreload({
      preloadSteps: [
        () => this.applyBackportWithRetry(),
      ],
      scenarioConfig: scenarioConfigJson as Parameters<typeof this.scenarioMapService.initializeScenarioMap>[0],
      mapOptions: {
        successMessage: 'Projection Data Backport: Map loaded successfully',
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
    super.ngOnDestroy();
  }

  private async initializeProj4Definitions(cache: Record<string, ProjectionData>): Promise<void> {
    await initializeProj4Definitions(cache, this.logger);
  }

  private async applyBackportWithRetry(): Promise<void> {
    await this.waitForTCAndApply((TC) => this.applyBackport(TC));
  }

  private async applyBackport(TC: NonNullable<ReturnType<typeof this.tcNamespaceService.getTC>>): Promise<void> {

    // Patch projectionDataCache if it doesn't exist
    if (!TC['projectionDataCache']) {
      const cachePatch = patchProperty(TC, 'projectionDataCache', projectionDataCache);
      this.patchManager.add(cachePatch.restore);
      this.logger.warn('Backported projectionDataCache to TC namespace');
    } else {
      // Merge with existing cache
      Object.assign(TC['projectionDataCache'] as Record<string, ProjectionData>, projectionDataCache);
      this.logger.warn('Merged backported projectionDataCache with existing cache');
    }

    // Initialize proj4 definitions for geographic projections (as-is from TC.js)
    // This must run after projectionDataCache is initialized
    const cache = (TC['projectionDataCache'] as Record<string, ProjectionData> | undefined) || projectionDataCache;
    await this.initializeProj4Definitions(cache);

    // Always patch getProjectionData to replace the existing implementation
    const funcPatch = patchFunction(
      TC,
      'getProjectionData',
      ((...args: unknown[]) => {
        const options = (args[0] as GetProjectionDataOptions | undefined) || {};
        return getProjectionData(options);
      }) as (...args: unknown[]) => unknown
    );
    this.patchManager.add(funcPatch.restore);
    this.logger.warn('Backported getProjectionData to TC namespace (replaced existing implementation)');
  }

  override testGetProjectionDataSync(): void {
    this.isLoading = true;
    this.testResult = null;
    this.testError = null;
    this.runInZoneHelper(() => {});

    try {
      const TC = this.tcNamespaceService.getTC();
      const getProjectionData = TC?.['getProjectionData'] as ((options?: { crs?: string; sync?: boolean }) => ProjectionData | false) | undefined;
      if (!getProjectionData) {
        throw new Error('TC.getProjectionData not available');
      }

      const result = getProjectionData({ crs: `EPSG:${this.epsgCode}`, sync: true });
      if (typeof result === 'object' && result !== null && 'code' in result) {
        this.testResult = result as ProjectionData;
        this.snackBar.open(`✓ Sync test successful for EPSG:${this.testResult.code}`, 'Close', { duration: 3000 });
        this.logger.warn('Sync test successful', result);
      } else {
        this.testError = 'Invalid result returned';
        this.snackBar.open(`✗ Invalid result for EPSG:${this.epsgCode}`, 'Close', { duration: 4000 });
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

  override async testGetProjectionDataAsync(): Promise<void> {
    this.isLoading = true;
    this.testResult = null;
    this.testError = null;
    this.runInZoneHelper(() => {});

    try {
      const TC = this.tcNamespaceService.getTC();
      const getProjectionData = TC?.['getProjectionData'] as ((options?: { crs?: string; sync?: boolean }) => Promise<ProjectionData | false | { status: string; number_result: number; results: Array<{ code: string; name: string; def: string; proj4: string; unit: string | null }> }>) | undefined;
      if (!getProjectionData) {
        throw new Error('TC.getProjectionData not available');
      }

      const result = await getProjectionData({ crs: `EPSG:${this.epsgCode}` });

      // Async mode returns wrapped EPSG API format: { status, number_result, results: [...] }
      if (result && typeof result === 'object' && 'results' in result && Array.isArray(result.results) && result.results.length > 0) {
        // Extract the actual ProjectionData from results array
        const firstResult = result.results[0];
        // Convert back to full ProjectionData format for display
        const TC = this.tcNamespaceService.getTC();
        const cache = (TC?.['projectionDataCache'] as Record<string, ProjectionData> | undefined) || projectionDataCache;
        const code = firstResult.code || this.epsgCode;
        this.testResult = cache[code] || {
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

  protected override getProjectionDataCache(): Record<string, ProjectionData> | undefined {
    const TC = this.tcNamespaceService.getTC();
    return (TC?.['projectionDataCache'] as Record<string, ProjectionData> | undefined) || projectionDataCache;
  }

  protected override getFallbackCacheKeys(): string[] {
    return Object.keys(projectionDataCache).sort();
  }

}
