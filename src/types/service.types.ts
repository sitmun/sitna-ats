/**
 * Type definitions for application services
 */

import type SitnaMap from 'api-sitna';

/**
 * Options for initializing a scenario map
 */
export interface InitializeScenarioMapOptions {
  /**
   * Callback to execute after map is successfully loaded
   */
  onLoaded?: (map: SitnaMap) => void | Promise<void>;
  /**
   * Component name for error logging context
   */
  componentName?: string;
  /**
   * Success message to log after map loads
   */
  successMessage?: string;
}

/**
 * Log level for logging operations
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Standardized application error format
 */
export interface AppError {
  message: string;
  error?: unknown;
  context?: string;
  timestamp: Date;
}

