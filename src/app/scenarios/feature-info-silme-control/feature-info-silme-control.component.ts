import {
  Component,
  type OnDestroy,
  type OnInit,
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
import type { TCNamespace } from '../../../types/api-sitna';

export const SCENARIO_METADATA: ScenarioMetadata = {
  name: 'FeatureInfo Silme Control',
  description:
    'Map with FeatureInfoSilme control that extends TC.control.FeatureInfo with a custom template.',
  tags: ['sitna-4.1', 'controls', 'feature-info', 'silme'],
  route: 'feature-info-silme-control',
};

@Component({
  selector: 'app-feature-info-silme-control',
  templateUrl: './feature-info-silme-control.component.html',
  styleUrls: ['./feature-info-silme-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureInfoSilmeControlComponent implements OnInit, OnDestroy {
  readonly metadata = SCENARIO_METADATA;
  map: SitnaMap | null = null;
  private readonly configService = inject(SitnaConfigService);
  private readonly logger = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlingService);
  private controlLoadPromise: Promise<void> | null = null;

  constructor() {
    afterNextRender(() => {
      this.loadControlAndInitializeMap();
    });
  }

  ngOnInit(): void {
    // Map initialization happens in afterNextRender callback
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  private getTC(): TCNamespace | undefined {
    return window.TC || (globalThis as { TC?: TCNamespace }).TC;
  }

  private async ensureControlLoaded(): Promise<void> {
    const TC = this.getTC();
    const control = TC?.control as { [key: string]: unknown } | undefined;
    if (control?.['FeatureInfoSilme']) {
      return;
    }

    if (this.controlLoadPromise) {
      return this.controlLoadPromise;
    }

    this.controlLoadPromise = (async () => {
      await this.waitForTC();
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./src/FeatureInfoSilme.js');
        this.logger.warn('FeatureInfoSilme control script loaded');
      } catch (error) {
        this.logger.error('FeatureInfoSilme control script failed to load', error);
        throw error;
      }
    })();

    return this.controlLoadPromise;
  }

  private async waitForTC(
    maxRetries: number = 50,
    delayMs: number = 100
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      const TC = this.getTC();
      const tcRecord = TC as { [key: string]: unknown } | undefined;
      if (tcRecord?.['apiLocation'] && tcRecord?.['syncLoadJS']) {
        return;
      }
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('TC not available after retries');
  }

  private async loadControlAndInitializeMap(): Promise<void> {
    try {
      // Load control script before initializing map so SITNA can auto-instantiate it from config
      await this.ensureControlLoaded();
      this.initializeMap();
    } catch (error) {
      this.logger.error(
        'Failed to load control before map initialization, initializing map anyway',
        error
      );
      this.initializeMap();
    }
  }

  private initializeMap(): void {
    const scenarioConfig = scenarioConfigJson as SitnaConfig;

    const scenarioOptions = this.configService.applyConfigToMapOptions(
      scenarioConfig
    );

    this.map = this.configService.initializeMap(
      'mapa-feature-info-silme-control',
      scenarioOptions
    );

    if (this.map !== null && this.map !== undefined) {
      this.map
        .loaded()
        .then(() => this.onMapLoaded())
        .catch((error: unknown) => {
          this.errorHandler.handleError(
            error,
            'FeatureInfoSilmeControlComponent.initializeMap'
          );
        });
    }
  }

  private async onMapLoaded(): Promise<void> {
    try {
      // Control should be auto-instantiated by SITNA from config, but verify it exists
      const TC = this.getTC();
      const control = TC?.control as { [key: string]: unknown } | undefined;
      if (control?.['FeatureInfoSilme']) {
        this.logger.warn(
          'FeatureInfo Silme Control: Map loaded successfully, control should be auto-instantiated from config',
          this.map
        );
      } else {
        this.logger.warn(
          'FeatureInfo Silme Control: Map loaded, but control class not found. It may be instantiated by SITNA from config.',
          this.map
        );
      }
    } catch (error) {
      this.errorHandler.handleError(
        error,
        'FeatureInfoSilmeControlComponent.onMapLoaded'
      );
    }
  }

  private destroyMap(): void {
    this.map = null;
  }
}

