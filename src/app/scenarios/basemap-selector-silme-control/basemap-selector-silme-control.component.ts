import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import scenarioConfigJson from './sitna-config.json';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { BaseScenarioComponent } from '../base-scenario.component';
import {
  patchMethodsWithLogging,
  type MethodPatchDefinition,
} from '../../utils/sitna-meld-patch';

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'Basemap Selector Silme Control',
  description:
    'Map with basemap selector control and TC.warp method patching',
  tags: ['map', 'controls', 'basemap', 'patch'],
  route: 'basemap-selector-silme-control',
};

// eslint-disable-next-line import/no-webpack-loader-syntax
// @ts-ignore - webpack inline loader syntax
import basemapSelectorSilmeCss from '!!raw-loader!./src/css/BasemapSelectorSilme.css';

@Component({
  selector: 'app-basemap-selector-silme-control',
  templateUrl: './basemap-selector-silme-control.component.html',
  styleUrls: ['./basemap-selector-silme-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasemapSelectorSilmeControlComponent extends BaseScenarioComponent {
  constructor() {
    super();
    this.metadata = SCENARIO_METADATA;
    this.initializeMapWithPreload({
      preloadSteps: [
        async () => {
          this.injectStylesFromString(basemapSelectorSilmeCss, SCENARIO_METADATA.route);
        },
        async () => {
          // Load our custom scripts
          await this.ensureControlLoaded({
            loadScript: () => {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              require('./src/SilmeUtils.js');
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              require('./src/controls/BasemapSelectorSilme.js');
            },
            controlName: 'BasemapSelectorSilme',
          });
        },
        async () => {
          // Patch template paths after control is loaded
          await this.patchTemplatePaths();
        },
        () => this.applyPatchWithRetry(),
      ],
      scenarioConfig: scenarioConfigJson,
      mapOptions: {
        successMessage: 'Basemap Selector Silme Control: Map loaded successfully',
        onLoaded: () => {
          // Set global silmeMap variable for use in patches and SilmeUtils.js
          this.setGlobalTCMapInstance('silmeMap');
        },
      },
    });
  }


  /**
   * Patch template paths in BasemapSelectorSilme after the control is loaded.
   * This overrides the template paths set in the synced file from GitHub,
   * ensuring they point to the correct location in the built application.
   */
  private async patchTemplatePaths(): Promise<void> {
    await this.patchControlTemplatePaths({
      controlName: 'BasemapSelectorSilme',
      templatePaths: {
        '': 'assets/js/patch/templates/basemap-selector-silme-control/BasemapSelectorSilme.hbs',
        '-node': 'assets/js/patch/templates/basemap-selector-silme-control/BasemapSelectorNodeSilme.hbs',
      },
      patchMethod: 'loadTemplates',
    });
  }

  private async applyPatchWithRetry(): Promise<void> {
    await this.waitForTCAndApply(async (TC) => {
      const methodsToPatch: MethodPatchDefinition[] = [
        {
          target: TC.wrap.Map.prototype,
          methodName: 'insertLayer',
          path: 'TC.wrap.Map.prototype.insertLayer',
        },
        {
          target: TC.wrap.Map.prototype,
          methodName: 'setBaseLayer',
          path: 'TC.wrap.Map.prototype.setBaseLayer',
        },
        {
          target: TC.wrap.layer.Raster.prototype,
          methodName: 'getAttribution',
          path: 'TC.wrap.layer.Raster.prototype.getAttribution',
        },
        {
          target: TC.wrap.layer.Raster.prototype,
          methodName: 'getCompatibleCRS',
          path: 'TC.wrap.layer.Raster.prototype.getCompatibleCRS',
        },
      ];
      const restores = patchMethodsWithLogging(methodsToPatch, this.logger);
      this.patchManager.add(restores);
    });
  }
}

