import { ScenarioRegistryService } from '../services/scenario-registry.service';
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
  ];
}

