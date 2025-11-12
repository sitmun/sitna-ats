import {
  Component,
  type OnInit,
  type OnDestroy,
  afterNextRender,
  inject,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import type SitnaMap from 'api-sitna';
import { SitnaConfigService } from '../../services/sitna-config.service';
import scenarioConfigJson from './sitna-config.json';
import type { SitnaConfig } from '../../types/sitna.types';
import { LoggingService } from '../../services/logging.service';
import { ErrorHandlingService } from '../../services/error-handling.service';
import type { ScenarioMetadata } from '../../types/scenario.types';
import {
  patchFunction,
  patchProperty,
  createPatchManager,
  type PatchManager,
} from '../../utils/monkey-patch';
import {
  type ProjectionData,
  type GetProjectionDataOptions,
  type TCNamespace,
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
export class ProjectionDataBackportComponent
  implements OnInit, OnDestroy
{
  readonly metadata = SCENARIO_METADATA;
  map: SitnaMap | null = null;
  epsgCode: string = '4326';
  testResult: ProjectionData | false | null = null;
  testError: string | null = null;
  isLoading: boolean = false;
  cachedCodes: string[] = [];

  private readonly configService = inject(SitnaConfigService);
  private readonly logger = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlingService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly snackBar = inject(MatSnackBar);
  private patchManager: PatchManager = createPatchManager();

  constructor() {
    afterNextRender(() => {
      this.applyBackportWithRetry().then(() => {
        this.initializeMap();
        this.updateCachedCodes();
      }).catch((error) => {
        this.logger.error('Failed to apply backport, initializing map anyway', error);
        this.initializeMap();
        this.updateCachedCodes();
      });
    });
  }

  ngOnInit(): void {
    // Map initialization happens in afterNextRender callback
  }

  ngOnDestroy(): void {
    this.patchManager.restoreAll();
    this.destroyMap();
  }

  private getTC(): TCNamespace | undefined {
    return (window as { TC?: TCNamespace }).TC || (globalThis as { TC?: TCNamespace }).TC;
  }

  private async initializeProj4Definitions(cache: Record<string, ProjectionData>): Promise<void> {
    await initializeProj4Definitions(cache, this.logger);
  }

  private async applyBackportWithRetry(maxRetries: number = 50, delayMs: number = 100): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      const TC = this.getTC();
      if (TC) {
        await this.applyBackport();
        return;
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('TC namespace not available after retries');
  }

  private async applyBackport(): Promise<void> {
    const TC = this.getTC();
    if (!TC) {
      this.logger.error('TC namespace not available for backport');
      return;
    }

    // Patch projectionDataCache if it doesn't exist
    if (!TC.projectionDataCache) {
      const cachePatch = patchProperty(TC, 'projectionDataCache', projectionDataCache);
      this.patchManager.add(cachePatch.restore);
      this.logger.warn('Backported projectionDataCache to TC namespace');
    } else {
      // Merge with existing cache
      Object.assign(TC.projectionDataCache, projectionDataCache);
      this.logger.warn('Merged backported projectionDataCache with existing cache');
    }

    // Initialize proj4 definitions for geographic projections (as-is from TC.js)
    // This must run after projectionDataCache is initialized
    await this.initializeProj4Definitions(TC.projectionDataCache || projectionDataCache);

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

  private initializeMap(): void {
    const scenarioConfig: SitnaConfig = scenarioConfigJson as SitnaConfig;
    const scenarioOptions =
      this.configService.applyConfigToMapOptions(scenarioConfig);

    this.map = this.configService.initializeMap(
      'mapa-projection-data-backport',
      scenarioOptions
    );

    if (this.map !== null && this.map !== undefined) {
      this.map
        .loaded()
        .then(() => {
          // Fix CSS class mismatch in Coordinates control dialog
          this.fixCoordinatesDialogCssClasses();

          this.ngZone.run(() => {
            this.cdr.markForCheck();
          });
          this.logger.warn(
            'Projection Data Backport: Map loaded successfully',
            this.map
          );
        })
        .catch((error: unknown) => {
          this.errorHandler.handleError(
            error,
            'ProjectionDataBackportComponent.initializeMap'
          );
        });
    }
  }

  private destroyMap(): void {
    this.map = null;
  }

  testGetProjectionDataSync(): void {
    this.isLoading = true;
    this.testResult = null;
    this.testError = null;
    this.ngZone.run(() => {
      this.cdr.markForCheck();
    });

    try {
      const TC = this.getTC();
      if (!TC?.getProjectionData) {
        throw new Error('TC.getProjectionData not available');
      }

      const result = TC.getProjectionData({ crs: `EPSG:${this.epsgCode}`, sync: true });
      if (typeof result === 'object' && 'code' in result) {
        this.testResult = result;
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
      this.ngZone.run(() => {
        this.cdr.markForCheck();
      });
    }
  }

  async testGetProjectionDataAsync(): Promise<void> {
    this.isLoading = true;
    this.testResult = null;
    this.testError = null;
    this.ngZone.run(() => {
      this.cdr.markForCheck();
    });

    try {
      const TC = this.getTC();
      if (!TC?.getProjectionData) {
        throw new Error('TC.getProjectionData not available');
      }

      const result = await TC.getProjectionData({ crs: `EPSG:${this.epsgCode}` });

      // Async mode returns wrapped EPSG API format: { status, number_result, results: [...] }
      if (result && typeof result === 'object' && 'results' in result && Array.isArray(result.results) && result.results.length > 0) {
        // Extract the actual ProjectionData from results array
        const firstResult = result.results[0];
        // Convert back to full ProjectionData format for display
        const TC = this.getTC();
        const cache = TC?.projectionDataCache || projectionDataCache;
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
      this.ngZone.run(() => {
        this.cdr.markForCheck();
      });
      this.updateCachedCodes();
    }
  }

  updateCachedCodes(showNotification: boolean = false): void {
    const previousCount = this.cachedCodes.length;
    const TC = this.getTC();
    if (TC?.projectionDataCache) {
      this.cachedCodes = Object.keys(TC.projectionDataCache).sort();
    } else {
      this.cachedCodes = Object.keys(projectionDataCache).sort();
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

    this.ngZone.run(() => {
      this.cdr.markForCheck();
    });
  }

  /**
   * Fix CSS class mismatch in Coordinates control dialog.
   * The ProjectionSelector uses 'tc-ctl-projs-cur-crs-name' but Coordinates dialog
   * template uses 'tc-ctl-coords-cur-crs-name'. This patch fixes the selector.
   */
  private fixCoordinatesDialogCssClasses(): void {
    if (!this.map) {
      return;
    }

    const TC = this.getTC();
    const tcControl = TC?.['control'] as { Coordinates?: unknown } | undefined;
    if (!TC || !tcControl?.['Coordinates']) {
      return;
    }

    // Get the Coordinates control instance
    const mapAny = this.map as { [key: string]: unknown };
    const getControlsByClass = mapAny['getControlsByClass'] as ((className: string) => unknown[]) | undefined;
    if (!getControlsByClass) {
      return;
    }

    const coordsControls = getControlsByClass('TC.control.Coordinates');
    if (!coordsControls || coordsControls.length === 0) {
      return;
    }

    const coordsControl = coordsControls[0] as {
      _cssClasses?: {
        CURRENT_CRS_NAME?: string;
        CURRENT_CRS_CODE?: string;
        [key: string]: string | undefined;
      };
      showProjectionChangeDialog?: (options?: unknown) => void;
    };

    // Patch _cssClasses to use correct class names for Coordinates dialog
    if (coordsControl._cssClasses) {
      const originalCssClasses = { ...coordsControl._cssClasses };

      // Update CSS classes to match Coordinates dialog template
      coordsControl._cssClasses.CURRENT_CRS_NAME = 'tc-ctl-coords-cur-crs-name';
      coordsControl._cssClasses.CURRENT_CRS_CODE = 'tc-ctl-coords-cur-crs-code';
      coordsControl._cssClasses['CRS_DIALOG'] = 'tc-ctl-coords-crs-dialog';
      coordsControl._cssClasses['CRS_LIST'] = 'tc-ctl-coords-crs-list';

      this.logger.warn('Fixed CSS classes for Coordinates control dialog', {
        original: originalCssClasses,
        patched: coordsControl._cssClasses
      });
    }
  }
}
