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

interface MapWithControls extends SitnaMap {
  addControl?: (control: unknown, options?: unknown) => unknown;
}

type HelloWorldControlConstructor = new (...args: unknown[]) => HTMLElement;

interface HelloWorldScenarioConfig extends SitnaConfig {
  helloWorldControl?: {
    div?: string;
  };
}

declare global {
  interface Window {
    HelloWorldControl?: HelloWorldControlConstructor;
  }
}

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
export class HelloWorldControlComponent implements OnInit, OnDestroy {
  readonly metadata = SCENARIO_METADATA;
  map: SitnaMap | null = null;
  private readonly configService = inject(SitnaConfigService);
  private readonly logger = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlingService);
  private controlLoadPromise: Promise<void> | null = null;
  private controlDiv = 'tc-slot-hello-world';

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

  private async ensureControlLoaded(): Promise<void> {
    if (typeof customElements.get('hello-world-control') === 'function') {
      return;
    }

    if (this.controlLoadPromise) {
      return this.controlLoadPromise;
    }

    this.controlLoadPromise = (async () => {
      await this.waitForSitnaControl();
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./src/HelloWorldControl.js');
        this.logger.warn('HelloWorldControl script loaded');
      } catch (error) {
        this.logger.error('HelloWorldControl script failed to load', error);
        throw error;
      }
    })();

    return this.controlLoadPromise;
  }

  private async waitForSitnaControl(
    maxRetries: number = 50,
    delayMs: number = 100
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      const sitna = window.SITNA as
        | { [key: string]: unknown }
        | undefined;
      const tc = window.TC as
        | { [key: string]: unknown }
        | undefined;
      const sitnaControlNamespace = sitna?.['control'] as
        | { [key: string]: unknown }
        | undefined;
      const tcControlNamespace = tc?.['control'] as
        | { [key: string]: unknown }
        | undefined;
      const controlCtor =
        sitnaControlNamespace?.['Control'] ??
        tcControlNamespace?.['Control'] ??
        tc?.['Control'];
      if (typeof controlCtor === 'function') {
        if (!sitna?.['control']) {
          (window.SITNA as { [key: string]: unknown })['control'] = {};
        }
        const controlNamespace = (window.SITNA as {
          [key: string]: unknown;
        })['control'] as { [key: string]: unknown };
        if (typeof controlNamespace['Control'] !== 'function') {
          controlNamespace['Control'] = controlCtor;
        }
        return;
      }
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('SITNA.control.Control not available after retries');
  }

  private initializeMap(): void {
    const scenarioConfig =
      scenarioConfigJson as HelloWorldScenarioConfig;
    this.controlDiv =
      scenarioConfig.helloWorldControl?.div ?? 'tc-slot-hello-world';

    // Remove custom config before passing to SITNA
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { helloWorldControl: _helloWorldControl, ...baseConfig } =
      scenarioConfig;

    const scenarioOptions = this.configService.applyConfigToMapOptions(
      baseConfig as SitnaConfig
    );

    this.map = this.configService.initializeMap(
      'mapa-hello-world-control',
      scenarioOptions
    );

    if (this.map !== null && this.map !== undefined) {
      this.map
        .loaded()
        .then(() => this.onMapLoaded())
        .catch((error: unknown) => {
          this.errorHandler.handleError(
            error,
            'HelloWorldControlComponent.initializeMap'
          );
        });
    }
  }

  private async onMapLoaded(): Promise<void> {
    try {
      await this.ensureControlLoaded();
      this.addHelloWorldControl();
      this.logger.warn(
        'Hello World Control: Map loaded successfully',
        this.map
      );
    } catch (error) {
      this.errorHandler.handleError(
        error,
        'HelloWorldControlComponent.onMapLoaded'
      );
    }
  }

  private addHelloWorldControl(): void {
    if (!this.map) {
      return;
    }

    const ControlClass = window.HelloWorldControl;
    if (typeof ControlClass !== 'function') {
      this.logger.error('HelloWorldControl class is not available on window');
      return;
    }

    const mapWithControls = this.map as MapWithControls;
    if (typeof mapWithControls.addControl !== 'function') {
      this.logger.error('Current SitnaMap instance does not expose addControl');
      return;
    }

    try {
      const controlInstance = new ControlClass(this.controlDiv);
      mapWithControls.addControl(controlInstance);
      this.logger.warn('HelloWorldControl added to map', controlInstance);
    } catch (error) {
      this.logger.error('Failed to add HelloWorldControl to map', error);
    }
  }

  private destroyMap(): void {
    this.map = null;
  }
}


