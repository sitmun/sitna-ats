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
  createPatchManager,
  type PatchManager,
} from '../../utils/monkey-patch';

// The patch file directly modifies TC.getProjectionData when loaded
// We'll require it in applyPatch() after TC is available and save the original for restoration

export interface ProjectionData {
  code: string;
  kind: string;
  name: string;
  wkt: string;
  proj4: string;
  bbox: number[];
  unit: string | null;
  accuracy: number | null;
}

export interface TCNamespace {
  apiLocation?: string;
  getProjectionData?: (options?: { crs?: string; sync?: boolean }) => ProjectionData | Promise<ProjectionData | false | { status: string; number_result: number; results: Array<{ code: string; name: string; def: string; proj4: string; unit: string | null }> }>;
  projectionDataCache?: Record<string, ProjectionData>;
  [key: string]: unknown;
}

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
export class ProjectionDataCurrentComponent
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
      this.applyPatchWithRetry().then(() => {
        this.initializeMap();
        this.updateCachedCodes();
      }).catch((error) => {
        this.logger.error('Failed to apply patch, initializing map anyway', error);
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

  private async applyPatchWithRetry(maxRetries: number = 50, delayMs: number = 100): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      const TC = this.getTC();
      if (TC) {
        await this.applyPatch();
        return;
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('TC namespace not available after retries');
  }

  private async applyPatch(): Promise<void> {
    const TC = this.getTC();
    if (!TC) {
      this.logger.error('TC namespace not available for patch');
      return;
    }

    try {
      // Save the original getProjectionData function before applying the patch
      const originalGetProjectionData = TC.getProjectionData;

      // Initialize TC.projectionDataCache if it doesn't exist
      // The patch will use this and expose it for analysis
      if (!TC.projectionDataCache) {
        TC.projectionDataCache = {};
      }

      // Require the patch file - it will use TC.projectionDataCache and expose it
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./src/TCProjectionDataPatch.js');

      // Create a restore function to restore the original
      const restore = (): void => {
        if (TC && originalGetProjectionData) {
          TC.getProjectionData = originalGetProjectionData;
        }
      };

      this.patchManager.add(restore);
      this.logger.warn('Applied TCProjectionDataPatch to TC namespace');
    } catch (error) {
      this.logger.error('Failed to apply TCProjectionDataPatch', error);
      throw error;
    }
  }

  private initializeMap(): void {
    const scenarioConfig: SitnaConfig = scenarioConfigJson as SitnaConfig;
    const scenarioOptions =
      this.configService.applyConfigToMapOptions(scenarioConfig);

    this.map = this.configService.initializeMap(
      'mapa-projection-data-current',
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
            'Projection Data Current: Map loaded successfully',
            this.map
          );
        })
        .catch((error: unknown) => {
          this.errorHandler.handleError(
            error,
            'ProjectionDataCurrentComponent.initializeMap'
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
        this.snackBar.open(`✓ Sync test successful for EPSG:${this.testResult.code}`, 'Close', { duration: 3000 });
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
      this.ngZone.run(() => {
        this.cdr.markForCheck();
      });
      this.updateCachedCodes();
    }
  }

  updateCachedCodes(showNotification: boolean = false): void {
    const previousCount = this.cachedCodes.length;
    const TC = this.getTC();
    // The cache is now accessible via TC.projectionDataCache (exposed through globalThis)
    if (TC?.projectionDataCache) {
      this.cachedCodes = Object.keys(TC.projectionDataCache).sort();
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

