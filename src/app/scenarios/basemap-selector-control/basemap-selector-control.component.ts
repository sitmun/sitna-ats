import { Component, ChangeDetectionStrategy } from '@angular/core';
import scenarioConfigJson from './sitna-config.json';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { BaseScenarioComponent } from '../base-scenario.component';

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'Basemap Selector Control',
  description: 'Map with basemap selector and offline map maker controls',
  tags: ['map', 'controls', 'basemap', 'layout'],
  route: 'basemap-selector-control',
};

@Component({
  selector: 'app-basemap-selector-control',
  templateUrl: './basemap-selector-control.component.html',
  styleUrls: ['./basemap-selector-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasemapSelectorControlComponent extends BaseScenarioComponent {
  constructor() {
    super();
    this.metadata = SCENARIO_METADATA;
  }

  protected override initializeMap(): void {
    this.map = this.initializeScenarioMapHelper(scenarioConfigJson, {
      successMessage: 'Basemap Selector Control: Map loaded successfully',
    });
  }
}

