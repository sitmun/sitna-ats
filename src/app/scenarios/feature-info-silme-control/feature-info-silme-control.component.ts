import { Component, ChangeDetectionStrategy } from '@angular/core';
import scenarioConfigJson from './sitna-config.json';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { BaseScenarioComponent } from '../base-scenario.component';

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'FeatureInfo Silme Control',
  description:
    'Map with FeatureInfoSilme control that extends TC.control.FeatureInfo with a custom template. ' +
    'IMPORTANT: The standard FeatureInfo control must be disabled (featureInfo: false) when using FeatureInfoSilme, ' +
    'as both controls use the same CSS class and would conflict if both are enabled.',
  tags: ['sitna-4.1', 'controls', 'feature-info', 'silme'],
  route: 'feature-info-silme-control',
};

@Component({
  selector: 'app-feature-info-silme-control',
  templateUrl: './feature-info-silme-control.component.html',
  styleUrls: ['./feature-info-silme-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureInfoSilmeControlComponent extends BaseScenarioComponent {
  constructor() {
    super();
    this.metadata = SCENARIO_METADATA;
  }

  protected override initializeMap(): void {
    this.initializeMapWithControl({
      scenarioConfig: scenarioConfigJson,
      controlName: 'FeatureInfoSilme',
      dependencies: 'TC', // TC core properties (apiLocation, syncLoadJS) are available when TC loads
      loadScript: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./src/FeatureInfoSilme.js');
      },
      mapOptions: {
        successMessage: 'FeatureInfo Silme Control: Map loaded successfully',
      },
    });
  }

}

