import { Injectable, isDevMode } from '@angular/core';
import type { LogLevel } from '../../types/service.types';

// Re-export type for backward compatibility
export type { LogLevel } from '../../types/service.types';

/**
 * Log level hierarchy for filtering
 */
const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Service for application-wide logging with environment-based log level configuration.
 *
 * - Suppresses console output in test environments (Jest/Karma) to keep test output clean
 * - Filters logs based on configured log level
 * - Default log levels:
 *   - Production: 'warn' (only warnings and errors)
 *   - Development: 'info' (info, warnings, and errors)
 */
@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  private currentLogLevel: LogLevel;

  constructor() {
    // Set default log level based on environment
    // Production: warn, Development: info
    this.currentLogLevel = isDevMode() ? 'info' : 'warn';
  }

  /**
   * Check if a log level should be output based on current configuration
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.isTestEnvironment()) {
      return false;
    }
    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[this.currentLogLevel];
  }

  private isTestEnvironment(): boolean {
    return (
      typeof (globalThis as { jest?: unknown }).jest !== 'undefined' ||
      typeof (window as { __karma__?: unknown }).__karma__ !== 'undefined'
    );
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(message, ...optionalParams);
    }
  }

  info(message: string, ...optionalParams: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(message, ...optionalParams);
    }
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(message, ...optionalParams);
    }
  }

  error(message: string, ...optionalParams: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(message, ...optionalParams);
    }
  }
}

