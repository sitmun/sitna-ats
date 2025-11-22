import { Component, ChangeDetectionStrategy } from '@angular/core';
import scenarioConfigJson from './sitna-config.json';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { BaseScenarioComponent } from '../base-scenario.component';

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'Basic Map Initialization',
  description: 'Standard SITNA map initialization without patching',
  tags: ['map', 'initialization', 'basic'],
  route: 'basic-map-initialization',
};

@Component({
  selector: 'app-basic-map-initialization',
  templateUrl: './basic-map-initialization.component.html',
  styleUrls: ['./basic-map-initialization.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicMapInitializationComponent extends BaseScenarioComponent {
  constructor() {
    super();
    this.metadata = SCENARIO_METADATA;
  }

  protected override initializeMap(): void {
    this.map = this.initializeScenarioMapHelper(scenarioConfigJson, {
      successMessage: 'Basic Map Initialization: Map loaded successfully',
    });
  }
}

