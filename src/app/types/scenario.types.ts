export interface ScenarioMetadata {
  name: string;
  description: string;
  tags: string[];
  route: string;
}

export interface ScenarioRegistration extends ScenarioMetadata {
  componentClass: new (...args: unknown[]) => unknown;
  selector: string;
}

