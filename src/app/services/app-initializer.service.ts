import { Injectable, inject } from '@angular/core';
import { LoggingService } from './logging.service';
import { ErrorHandlingService } from './error-handling.service';

@Injectable({
  providedIn: 'root',
})
export class AppInitializerService {
  private readonly logger = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlingService);
  private readonly maxWaitAttempts = 10;
  private readonly waitIntervalMs = 50;

  /**
   * Initialize SITNA configuration on app bootstrap
   */
  async initialize(): Promise<void> {
    try {
      // Wait for SITNA script to load
      await this.waitForSITNA();

      // Note: Patching is done in scenarios, not globally
      // This service only ensures SITNA is loaded
    } catch (error: unknown) {
      this.errorHandler.handleError(
        error,
        'AppInitializerService.initialize'
      );
    }
  }

  /**
   * Wait for SITNA library to be available
   * With npm package, SITNA should be available immediately after import
   */
  private async waitForSITNA(): Promise<void> {
    // With npm import, SITNA should be available synchronously
    if (typeof window.SITNA !== 'undefined') {
      return;
    }

    // Poll for SITNA availability with exponential backoff
    for (let attempt = 0; attempt < this.maxWaitAttempts; attempt++) {
      await this.delay(this.waitIntervalMs);
      if (typeof window.SITNA !== 'undefined') {
        return;
      }
    }

    // Even if not on window, the import should make it available
    // Log warning but don't fail initialization
    this.logger.warn(
      'SITNA not found on window object after waiting, but continuing initialization'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

}

/**
 * Factory function for APP_INITIALIZER
 */
export function initializeApp(
  initializer: AppInitializerService
): () => Promise<void> {
  return () => initializer.initialize();
}
