import { Injectable } from '@angular/core';
import type { ScenarioRegistration } from '../types/scenario.types';

@Injectable({
  providedIn: 'root',
})
export class ScenarioRegistryService {
  private scenarios: Map<string, ScenarioRegistration> = new Map();

  /**
   * Register a scenario
   */
  register(registration: ScenarioRegistration): void {
    this.scenarios.set(registration.route, registration);
  }

  /**
   * Get all registered scenarios
   */
  getAllScenarios(): ScenarioRegistration[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Get scenario by route
   */
  getScenarioByRoute(route: string): ScenarioRegistration | undefined {
    return this.scenarios.get(route);
  }

  /**
   * Get scenarios filtered by tag
   */
  getScenariosByTag(tag: string): ScenarioRegistration[] {
    return this.getAllScenarios().filter((s) => s.tags.includes(tag));
  }

  /**
   * Get scenarios filtered by name (case-insensitive partial match)
   */
  getScenariosByName(nameFilter: string): ScenarioRegistration[] {
    const filter = nameFilter.toLowerCase();
    return this.getAllScenarios().filter(
      (s) =>
        s.name.toLowerCase().includes(filter) ||
        s.description.toLowerCase().includes(filter)
    );
  }

  /**
   * Get scenarios filtered by tags and name
   */
  getScenariosByFilters(options: {
    tags?: string[];
    name?: string;
  }): ScenarioRegistration[] {
    let scenarios = this.getAllScenarios();

    if (options.tags && options.tags.length > 0) {
      scenarios = scenarios.filter((s) =>
        options.tags!.every((tag) => s.tags.includes(tag))
      );
    }

    if (options.name) {
      scenarios = this.getScenariosByName(options.name).filter((s) =>
        scenarios.includes(s)
      );
    }

    return scenarios;
  }

  /**
   * Get all unique tags from registered scenarios
   */
  getAllTags(): string[] {
    const tags = new Set<string>();
    this.getAllScenarios().forEach((s) => {
      s.tags.forEach((t) => tags.add(t));
    });
    return Array.from(tags).sort();
  }
}

