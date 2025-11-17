import {
  Component,
  type OnInit,
  type OnDestroy,
  ChangeDetectionStrategy,
  afterNextRender,
  inject,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import type SitnaMap from 'api-sitna';
import { SitnaConfigService } from '../../services/sitna-config.service';
import scenarioConfigJson from './sitna-config.json';
import type { SitnaConfig } from '../../types/sitna.types';
import { LoggingService } from '../../services/logging.service';
import { ErrorHandlingService } from '../../services/error-handling.service';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { createMeldPatchManager } from '../../utils/sitna-meld-patch';
import type { TCNamespace } from '../../../types/api-sitna';

interface MeldAdvice {
  remove: () => void;
}

interface MeldJoinPoint {
  target: unknown;
  method: string;
  args: unknown[];
  proceed: () => unknown;
  proceedApply: (args: unknown[]) => unknown;
  proceedCount: number;
  result?: unknown;
  exception?: unknown;
}

interface Meld {
  before: (
    target: unknown,
    method: string,
    advice: (...args: unknown[]) => void
  ) => MeldAdvice;
  around: (
    target: unknown,
    method: string,
    advice: (joinPoint: MeldJoinPoint) => unknown
  ) => MeldAdvice;
  remove: (advice: MeldAdvice) => void;
}


// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const meld = require('meld') as Meld;

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'Basemap Selector Silme Control',
  description:
    'Map with basemap selector control and TC.warp method patching using AOP',
  tags: ['map', 'controls', 'basemap', 'patch', 'aop', 'warp'],
  route: 'basemap-selector-silme-control',
};

@Component({
  selector: 'app-basemap-selector-silme-control',
  templateUrl: './basemap-selector-silme-control.component.html',
  styleUrls: ['./basemap-selector-silme-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasemapSelectorSilmeControlComponent
  implements OnInit, OnDestroy
{
  readonly metadata = SCENARIO_METADATA;
  map: SitnaMap | null = null;
  private readonly configService = inject(SitnaConfigService);
  private readonly logger = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlingService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private patchManager = createMeldPatchManager();

  constructor() {
    afterNextRender(() => {
      this.loadControl()
        .then(() => {
          return this.applyPatchWithRetry();
        })
        .then(() => {
          this.initializeMap();
        })
        .catch((error) => {
          this.logger.error(
            'Failed to load control or apply patch, initializing map anyway',
            error
          );
          this.initializeMap();
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
    return window.TC || (globalThis as { TC?: TCNamespace }).TC;
  }

  private async loadControl(): Promise<void> {
    // Wait for TC to be available (needed for TC.syncLoadJS in the controls)
    const maxRetries = 50;
    const delayMs = 100;

    for (let i = 0; i < maxRetries; i++) {
      const TC = this.getTC();
      if (TC && TC['apiLocation']) {
        try {
          // Load SilmeUtils.js first (defines utility functions including getLastBaseMapIndex)
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('./src/SilmeUtils.js');
          this.logger.warn('Loaded SilmeUtils.js');

          // Load the BasemapSelectorSilme control
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('./src/controls/BasemapSelectorSilme.js');
          this.logger.warn('Loaded BasemapSelectorSilme control');
          return;
        } catch (error) {
          this.logger.error('Failed to load controls', error);
          throw error;
        }
      }
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('TC not available for loading controls');
  }

  private async applyPatchWithRetry(
    maxRetries: number = 50,
    delayMs: number = 100
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      const TC = this.getTC();
      if (TC?.['wrap']) {
        await this.applyPatch();
        return;
      }
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('TC.wrap not available after retries');
  }

  private async applyPatch(): Promise<void> {
    const TC = this.getTC();
    if (!TC?.['wrap']) {
      this.logger.error('TC.wrap not available for patch');
      return;
    }

    try {
      this.logger.warn('Applying in-component AOP wrappers');

      const component = this;
      const restores: Array<() => void> = [];

      // Access wrap and control - types are properly defined in api-sitna.d.ts
      const wrap = TC?.wrap;
      const control = TC?.control;

      // Define the methods to patch from TC.patch.js
      const methodsToPatch = [
        {
          target: wrap?.['Map']?.['prototype'] as
            | { insertLayer?: (...args: unknown[]) => unknown }
            | undefined,
          methodName: 'insertLayer',
          path: 'TC.wrap.Map.prototype.insertLayer',
        },
        {
          target: wrap?.['Map']?.['prototype'] as
            | { setBaseLayer?: (...args: unknown[]) => unknown }
            | undefined,
          methodName: 'setBaseLayer',
          path: 'TC.wrap.Map.prototype.setBaseLayer',
        },
        {
          target: wrap?.['layer']?.['Raster']?.['prototype'] as
            | { getAttribution?: (...args: unknown[]) => unknown }
            | undefined,
          methodName: 'getAttribution',
          path: 'TC.wrap.layer.Raster.prototype.getAttribution',
        },
        {
          target: wrap?.['layer']?.['Raster']?.['prototype'] as
            | { getCompatibleCRS?: (...args: unknown[]) => unknown }
            | undefined,
          methodName: 'getCompatibleCRS',
          path: 'TC.wrap.layer.Raster.prototype.getCompatibleCRS',
        },
        {
          target: control?.['LayerCatalogSilmeFolders']?.['prototype'] as
            | { render?: (...args: unknown[]) => unknown }
            | undefined,
          methodName: 'render',
          path: 'TC.control.LayerCatalogSilmeFolders.prototype.render',
        },
      ];

      // Patch each method using meld AOP
      methodsToPatch.forEach(({ target, methodName, path }) => {
        if (!target) {
          this.logger.warn(
            `Target not available for ${path}, skipping patch`
          );
          return;
        }

        const descriptor = Object.getOwnPropertyDescriptor(target, methodName);
        if (!descriptor || typeof descriptor.value !== 'function') {
          this.logger.warn(
            `Method ${methodName} not found on ${path}, skipping patch`
          );
          return;
        }

        try {
          const advice = meld.around(
            target,
            methodName,
            function (
              this: unknown,
              joinPoint: MeldJoinPoint
            ): unknown {
              const startTime = performance.now();
              const methodArgs = joinPoint.args;

              component.logger.warn(
                `[${path}] Called with args:`,
                methodArgs
              );

              try {
                const result = joinPoint.proceed();
                const endTime = performance.now();
                const duration = endTime - startTime;

                component.logger.warn(
                  `[${path}] Completed in ${duration.toFixed(2)}ms`,
                  result
                );

                // Handle promises
                if (result instanceof Promise) {
                  return result
                    .then((resolved) => {
                      component.logger.warn(
                        `[${path}] Promise resolved:`,
                        resolved
                      );
                      return resolved;
                    })
                    .catch((error) => {
                      component.logger.error(
                        `[${path}] Promise rejected:`,
                        error
                      );
                      throw error;
                    });
                }

                return result;
              } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;

                component.logger.error(
                  `[${path}] Failed after ${duration.toFixed(2)}ms:`,
                  error
                );
                throw error;
              }
            }
          );

          restores.push(() => meld.remove(advice));
          this.logger.warn(`Applied AOP patch to ${path}`);
        } catch (error) {
          this.logger.error(`Failed to patch ${path}:`, error);
        }
      });

      this.patchManager.add(restores);
      this.logger.warn(
        `Applied AOP patches: ${restores.length} methods patched`
      );
    } catch (error) {
      this.logger.error('Failed to apply TC.patch.js patches', error);
      throw error;
    }
  }

  private initializeMap(): void {
    // Load scenario-specific config directly
    const scenarioConfig: SitnaConfig = scenarioConfigJson as SitnaConfig;

    // Convert config to map options (doesn't modify global state)
    const scenarioOptions =
      this.configService.applyConfigToMapOptions(scenarioConfig);

    // Initialize map with controls
    this.map = this.configService.initializeMap(
      'mapa-basemap-selector-silme-control',
      scenarioOptions
    );

    if (this.map !== null && this.map !== undefined) {
      this.map
        .loaded()
        .then(() => {
          // Set global silmeMap variable for use in patches and SilmeSecondBaseLayer.js
          // Access the internal map wrap through TC.Map.get after map is loaded
          const TC = this.getTC();
          const mapElement = document.querySelector('#mapa-basemap-selector-silme-control');
          if (TC && mapElement && (window as { silmeMap?: unknown }).silmeMap === undefined) {
            try {
              const TCWithMap = TC as { Map?: { get: (element: Element | null) => unknown } };
              const mapInstance = TCWithMap.Map?.get(mapElement);
              if (mapInstance) {
                (window as { silmeMap?: unknown }).silmeMap = mapInstance;
                this.logger.warn('Set global silmeMap variable');
              }
            } catch (error) {
              this.logger.warn('Could not set silmeMap, patches may not work correctly', error);
            }
          }

          this.ngZone.run(() => {
            this.cdr.markForCheck();
          });
          this.logger.warn(
            'Basemap Selector Silme Control: Map loaded successfully',
            this.map
          );
        })
        .catch((error: unknown) => {
          this.errorHandler.handleError(
            error,
            'BasemapSelectorSilmeControlComponent.initializeMap'
          );
        });
    }
  }

  private destroyMap(): void {
    this.map = null;
  }
}

