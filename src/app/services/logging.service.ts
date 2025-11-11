import { Injectable } from '@angular/core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Service for application-wide logging with test environment detection.
 *
 * Suppresses console output in test environments (Jest/Karma) to keep test output clean.
 * In production, proxies to standard console methods.
 */
@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  private isTestEnvironment(): boolean {
    return (
      typeof (globalThis as { jest?: unknown }).jest !== 'undefined' ||
      typeof (window as { __karma__?: unknown }).__karma__ !== 'undefined'
    );
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    if (!this.isTestEnvironment()) {
      console.debug(message, ...optionalParams);
    }
  }

  info(message: string, ...optionalParams: unknown[]): void {
    if (!this.isTestEnvironment()) {
      console.info(message, ...optionalParams);
    }
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    if (!this.isTestEnvironment()) {
      console.warn(message, ...optionalParams);
    }
  }

  error(message: string, ...optionalParams: unknown[]): void {
    if (!this.isTestEnvironment()) {
      console.error(message, ...optionalParams);
    }
  }

  log(level: LogLevel, message: string, ...optionalParams: unknown[]): void {
    switch (level) {
      case 'debug':
        this.debug(message, ...optionalParams);
        break;
      case 'info':
        this.info(message, ...optionalParams);
        break;
      case 'warn':
        this.warn(message, ...optionalParams);
        break;
      case 'error':
        this.error(message, ...optionalParams);
        break;
    }
  }
}

