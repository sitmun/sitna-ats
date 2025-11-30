import type { ScenarioRegistryService } from '../services/scenario-registry.service';
import type { ScenarioRegistration } from '../types/scenario.types';

// Import scenario component and its metadata
import {
  BasicMapInitializationComponent,
  SCENARIO_METADATA as BasicMapInitMetadata,
} from './basic-map-initialization/basic-map-initialization.component';
import {
  ProxificationLoggingComponent,
  SCENARIO_METADATA as ProxificationLoggingMetadata,
} from './proxification-logging/proxification-logging.component';
import {
  ProjectionDataBackportComponent,
  SCENARIO_METADATA as ProjectionDataBackportMetadata,
} from './projection-data-backport/projection-data-backport.component';
import {
  ProjectionDataCurrentComponent,
  SCENARIO_METADATA as ProjectionDataCurrentMetadata,
} from './projection-data-current/projection-data-current.component';
import {
  BasemapSelectorControlComponent,
  SCENARIO_METADATA as BasemapSelectorControlMetadata,
} from './basemap-selector-control/basemap-selector-control.component';
import {
  BasemapSelectorSilmeControlComponent,
  SCENARIO_METADATA as BasemapSelectorSilmeControlMetadata,
} from './basemap-selector-silme-control/basemap-selector-silme-control.component';
import {
  HelloWorldControlComponent,
  SCENARIO_METADATA as HelloWorldControlMetadata,
} from './hello-world-control/hello-world-control.component';
import {
  FeatureInfoSilmeControlComponent,
  SCENARIO_METADATA as FeatureInfoSilmeControlMetadata,
} from './feature-info-silme-control/feature-info-silme-control.component';
import {
  LayerCatalogSilmeFoldersControlComponent,
  SCENARIO_METADATA as LayerCatalogSilmeFoldersControlMetadata,
} from './layer-catalog-silme-folders-control/layer-catalog-silme-folders-control.component';

/**
 * Register all scenarios with the registry service
 * This is called during app initialization
 */
export function registerScenarios(
  registry: ScenarioRegistryService
): ScenarioRegistration[] {
  const registrations: ScenarioRegistration[] = [
    {
      ...BasicMapInitMetadata,
      componentClass: BasicMapInitializationComponent,
      selector: 'app-basic-map-initialization',
    },
    {
      ...ProxificationLoggingMetadata,
      componentClass: ProxificationLoggingComponent,
      selector: 'app-proxification-logging',
    },
    {
      ...ProjectionDataBackportMetadata,
      componentClass: ProjectionDataBackportComponent,
      selector: 'app-projection-data-backport',
    },
    {
      ...ProjectionDataCurrentMetadata,
      componentClass: ProjectionDataCurrentComponent,
      selector: 'app-projection-data-current',
    },
    {
      ...BasemapSelectorControlMetadata,
      componentClass: BasemapSelectorControlComponent,
      selector: 'app-basemap-selector-control',
    },
    {
      ...BasemapSelectorSilmeControlMetadata,
      componentClass: BasemapSelectorSilmeControlComponent,
      selector: 'app-basemap-selector-silme-control',
    },
    {
      ...HelloWorldControlMetadata,
      componentClass: HelloWorldControlComponent,
      selector: 'app-hello-world-control',
    },
    {
      ...FeatureInfoSilmeControlMetadata,
      componentClass: FeatureInfoSilmeControlComponent,
      selector: 'app-feature-info-silme-control',
    },
    {
      ...LayerCatalogSilmeFoldersControlMetadata,
      componentClass: LayerCatalogSilmeFoldersControlComponent,
      selector: 'app-layer-catalog-silme-folders-control',
    },
  ];

  registrations.forEach((registration) => {
    registry.register(registration);
  });

  return registrations;
}

/**
 * Get all scenario component classes for Angular module declarations
 */
export function getScenarioComponents(): (new (...args: unknown[]) => unknown)[] {
  return [
    BasicMapInitializationComponent,
    ProxificationLoggingComponent,
    ProjectionDataBackportComponent,
    ProjectionDataCurrentComponent,
    BasemapSelectorControlComponent,
    BasemapSelectorSilmeControlComponent,
    HelloWorldControlComponent,
    FeatureInfoSilmeControlComponent,
    LayerCatalogSilmeFoldersControlComponent,
  ];
}

