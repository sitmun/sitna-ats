import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import scenarioConfigJson from './sitna-config.json';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { BaseScenarioComponent } from '../base-scenario.component';
import { createMeldPatchManager } from '../../utils/sitna-meld-patch';

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
export class BasemapSelectorSilmeControlComponent extends BaseScenarioComponent {
  private patchManager = createMeldPatchManager();

  constructor() {
    super();
    this.metadata = SCENARIO_METADATA;
    this.initializeMapWithPreload({
      preloadSteps: [
        () => this.ensureScriptsLoaded({
          checkLoaded: () => this.isTCPropertyRegistered('apiLocation'),
          preLoad: 'tc',
          loadScripts: [
            () => {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              require('./src/SilmeUtils.js');
            },
            () => {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              require('./src/controls/BasemapSelectorSilme.js');
            },
          ],
          controlName: 'BasemapSelectorSilme',
        }),
        () => this.applyPatchWithRetry(),
      ],
      scenarioConfig: scenarioConfigJson as Parameters<typeof this.scenarioMapService.initializeScenarioMap>[0],
      mapOptions: {
        successMessage: 'Basemap Selector Silme Control: Map loaded successfully',
        onLoaded: () => {
          // Set global silmeMap variable for use in patches and SilmeSecondBaseLayer.js
          // Access the internal map wrap through TC.Map.get after map is loaded
          const TC = this.tcNamespaceService.getTC();
          const containerId = this.getContainerId();
          const mapElement = document.querySelector(`#${containerId}`);
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
          this.runInZoneHelper(() => {});
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
    await this.tcNamespaceService.waitForTCProperty('wrap');
    await this.applyPatch(TC);
  }

  private async applyPatch(TC: NonNullable<ReturnType<typeof this.tcNamespaceService.getTC>>): Promise<void> {
    if (!this.isTCPropertyRegistered('wrap')) {
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

  protected initializeMap(): void {
    // Map initialization is handled by initializeMapWithPreload in constructor
  }
}

