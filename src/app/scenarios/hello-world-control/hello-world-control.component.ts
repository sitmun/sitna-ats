import { Component, ChangeDetectionStrategy } from '@angular/core';
import scenarioConfigJson from './sitna-config.json';
import type { SitnaConfig } from '../../../types/sitna.types';
import type { ScenarioMetadata } from '../../types/scenario.types';
import { BaseScenarioComponent } from '../base-scenario.component';

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'SITNA 4.1 Custom Control',
  description:
    'Tutorial scenario showing how to register a Hello World control in SITNA 4.1 using Angular + Handlebars.',
  tags: ['sitna-4.1', 'controls', 'tutorial'],
  route: 'hello-world-control',
};

@Component({
  selector: 'app-hello-world-control',
  templateUrl: './hello-world-control.component.html',
  styleUrls: ['./hello-world-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelloWorldControlComponent extends BaseScenarioComponent {
  constructor() {
    super();
    this.metadata = SCENARIO_METADATA;
  }

  protected override initializeMap(): void {
    const scenarioConfig = scenarioConfigJson as SitnaConfig;

    this.initializeMapWithControl({
      scenarioConfig,
      controlName: 'HelloWorld',
      checkLoaded: () => this.isTCControlRegistered('HelloWorld'),
      preLoad: 'sitna-control',
      loadScript: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./src/HelloWorldControl.js');
      },
      mapOptions: {
        successMessage: 'Hello World Control: Map loaded successfully',
      },
    });
  }
}


