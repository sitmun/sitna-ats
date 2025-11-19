import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import scenarioConfigJson from './sitna-config.json';
import type { ScenarioMetadata } from '../../types/scenario.types';
import type { SitnaConfig } from '../../../types/sitna.types';
import { BaseScenarioComponent } from '../base-scenario.component';
import {
  createMeldPatchManager,
  patchMethodsWithLogging,
  type MethodPatchDefinition,
} from '../../utils/sitna-meld-patch';

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
        async () => {
          // Load our custom scripts
          await this.ensureScriptsLoaded({
            checkLoaded: () => this.isTCControlRegistered('BasemapSelectorSilme'),
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
          });
        },
        () => this.applyPatchWithRetry(),
      ],
      scenarioConfig: scenarioConfigJson as SitnaConfig,
      mapOptions: {
        successMessage: 'Basemap Selector Silme Control: Map loaded successfully',
        onLoaded: () => {
          // Set global silmeMap variable for use in patches and SilmeUtils.js
          this.setGlobalTCMapInstance('silmeMap');
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
    const wrap = TC?.wrap;
    await this.tcNamespaceService.waitForTCProperty('control');
    const control = TC?.control;

    try {
      this.logger.warn('Applying in-component AOP wrappers');

      // Extract common prototypes for cleaner code
      const mapPrototype = wrap?.['Map']?.['prototype'];
      const rasterPrototype = wrap?.['layer']?.['Raster']?.['prototype'];

      // Define the methods to patch from TC.patch.js
      const methodsToPatch: MethodPatchDefinition[] = [
        {
          target: mapPrototype,
          methodName: 'insertLayer',
          path: 'TC.wrap.Map.prototype.insertLayer',
        },
        {
          target: mapPrototype,
          methodName: 'setBaseLayer',
          path: 'TC.wrap.Map.prototype.setBaseLayer',
        },
        {
          target: rasterPrototype,
          methodName: 'getAttribution',
          path: 'TC.wrap.layer.Raster.prototype.getAttribution',
        },
        {
          target: rasterPrototype,
          methodName: 'getCompatibleCRS',
          path: 'TC.wrap.layer.Raster.prototype.getCompatibleCRS',
        },
      ];

      // Patch methods using the reusable utility function
      const restores = patchMethodsWithLogging(methodsToPatch, this.logger);

      this.patchManager.add(restores);
      this.logger.warn(
        `Applied AOP patches: ${restores.length} methods patched`
      );
    } catch (error) {
      this.logger.error('Failed to apply TC.patch.js patches', error);
      throw error;
    }
  }
}

