import {
  Component,
  type OnInit,
  type OnDestroy,
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
  name: 'Basic Map Initialization',
  description: 'Standard SITNA map initialization without patching',
  tags: ['map', 'initialization', 'basic'],
  route: 'basic-map-initialization',
};

@Component({
  selector: 'app-basic-map-initialization',
  templateUrl: './basic-map-initialization.component.html',
  styleUrls: ['./basic-map-initialization.component.scss'],
})
export class BasicMapInitializationComponent
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

    // Basic usage - no patching
    this.map = this.configService.initializeMap(
      'mapa-basic-map-initialization',
      scenarioOptions
    );

    if (this.map !== null && this.map !== undefined) {
      this.map
        .loaded(() => {
          this.logger.warn(
            'Basic Map Initialization: Map loaded successfully',
            this.map
          );
        })
        .catch((error: unknown) => {
          this.errorHandler.handleError(
            error,
            'BasicMapInitializationComponent.initializeMap'
          );
        });
    }
  }

  private destroyMap(): void {
    this.map = null;
  }
}

