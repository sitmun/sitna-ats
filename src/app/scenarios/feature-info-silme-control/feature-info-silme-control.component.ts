import { Component, ChangeDetectionStrategy } from '@angular/core';
import type SitnaMap from 'api-sitna';
import scenarioConfigJson from './sitna-config.json';
import type { SitnaConfig } from '../../types/sitna.types';
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

  protected initializeMap(): void {
    const scenarioConfig = scenarioConfigJson as SitnaConfig;

    this.initializeMapWithControl({
      scenarioConfig,
      controlName: 'FeatureInfoSilme',
      checkLoaded: () => this.isTCControlRegistered('FeatureInfoSilme'),
      preLoad: ['tc:apiLocation', 'tc:syncLoadJS'],
      loadScript: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./src/FeatureInfoSilme.js');
      },
      mapOptions: {
        successMessage: 'FeatureInfo Silme Control: Map loaded successfully',
        onLoaded: async (map) => {
          // Wait a bit for the map to fully initialize before validating
          await new Promise((resolve) => setTimeout(resolve, 100));
          // Validate template is loaded
          this.validateTemplateLoaded(map);
        },
      },
    });
  }

  /**
   * Validate that the FeatureInfoSilme template is loaded and being used
   */
  private validateTemplateLoaded(map: SitnaMap): void {
    try {
      const TC = this.tcNamespaceService.getTC();
      if (!TC) {
        this.logger.warn('TC namespace not available for template validation');
        return;
      }

      // Access controls directly from the map instance
      const mapAny = map as {
        controls?: Array<{
          constructor?: { name?: string };
          template?: Record<string, string>;
          CLASS?: string;
        }>;
      };

      // Check if map controls are initialized
      if (!mapAny.controls || !Array.isArray(mapAny.controls)) {
        this.logger.warn('Map controls not yet initialized, skipping template validation');
        return;
      }

      // Find FeatureInfoSilme control by checking constructor name
      const featureInfoControl = mapAny.controls.find((control) => {
        const constructorName = control.constructor?.name;
        return constructorName === 'FeatureInfoSilme' || constructorName === 'TC.control.FeatureInfoSilme';
      });

      if (!featureInfoControl) {
        this.logger.warn('No FeatureInfoSilme controls found on map');
        return;
      }

      if (featureInfoControl.template && featureInfoControl.CLASS) {
        const templatePath = featureInfoControl.template[featureInfoControl.CLASS];
        this.logger.warn('FeatureInfoSilme template validation:', {
          templatePath,
          templateObject: featureInfoControl.template,
          class: featureInfoControl.CLASS,
        });

        // Check if template path matches expected path
        const expectedPath = 'assets/js/patch/templates/feature-info-silme-control/FeatureInfoSilme.hbs';
        if (templatePath === expectedPath) {
          this.logger.warn('✅ Template path is correct:', templatePath);
        } else {
          this.logger.error('❌ Template path mismatch!', {
            expected: expectedPath,
            actual: templatePath,
          });
        }

        // Try to fetch the template to verify it exists
        fetch(templatePath)
          .then((response) => {
            if (response.ok) {
              this.logger.warn('✅ Template file exists and is accessible:', templatePath);
              return response.text();
            } else {
              this.logger.error('❌ Template file not found or not accessible:', {
                path: templatePath,
                status: response.status,
                statusText: response.statusText,
              });
              return null;
            }
          })
          .catch((error) => {
            this.logger.error('❌ Error fetching template file:', {
              path: templatePath,
              error,
            });
          });
      } else {
        this.logger.warn('Control template not yet loaded or not accessible');
      }
    } catch (error) {
      this.logger.error('Error during template validation:', error);
    }
  }
}

