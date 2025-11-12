import {
  Component,
  type OnInit,
  type OnDestroy,
  ChangeDetectionStrategy,
  afterNextRender,
  inject,
} from '@angular/core';
import type SitnaMap from 'api-sitna';
import { SitnaConfigService } from '../../services/sitna-config.service';
import scenarioConfigJson from './sitna-config.json';
import type { SitnaConfig } from '../../types/sitna.types';
import { LoggingService } from '../../services/logging.service';
import { ErrorHandlingService } from '../../services/error-handling.service';
import type { ScenarioMetadata } from '../../types/scenario.types';

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
export class BasemapSelectorControlComponent
  implements OnInit, OnDestroy
{
  readonly metadata = SCENARIO_METADATA;
  map: SitnaMap | null = null;
  private readonly configService = inject(SitnaConfigService);
  private readonly logger = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlingService);

  constructor() {
    afterNextRender(() => {
      this.initializeMap();
    });
  }

  ngOnInit(): void {
    // Map initialization happens in afterNextRender callback
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  private initializeMap(): void {
    // Load scenario-specific config directly
    const scenarioConfig: SitnaConfig = scenarioConfigJson as SitnaConfig;

    // Convert config to map options (doesn't modify global state)
    const scenarioOptions =
      this.configService.applyConfigToMapOptions(scenarioConfig);

    // Initialize map with controls
    this.map = this.configService.initializeMap(
      'mapa-basemap-selector-control',
      scenarioOptions
    );

    if (this.map !== null && this.map !== undefined) {
      this.map
        .loaded(() => {
          this.logger.warn(
            'Basemap Selector Control: Map loaded successfully',
            this.map
          );
        })
        .catch((error: unknown) => {
          this.errorHandler.handleError(
            error,
            'BasemapSelectorControlComponent.initializeMap'
          );
        });
    }
  }

  private destroyMap(): void {
    this.map = null;
  }
}

