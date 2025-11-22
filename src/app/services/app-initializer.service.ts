import { Injectable, inject } from '@angular/core';
import { ErrorHandlingService } from './error-handling.service';
import { SitnaNamespaceService } from './sitna-namespace.service';

@Injectable({
  providedIn: 'root',
})
export class AppInitializerService {
  private readonly errorHandler = inject(ErrorHandlingService);
  private readonly sitnaNamespaceService = inject(SitnaNamespaceService);

  /**
   * Initialize SITNA configuration on app bootstrap
   */
  async initialize(): Promise<void> {
    try {
      // Wait for SITNA script to load
      await this.sitnaNamespaceService.waitForSITNA(10, 50);

      // Note: Patching is done in scenarios, not globally
      // This service only ensures SITNA is loaded
    } catch (error: unknown) {
      this.errorHandler.handleError(
        error,
        'AppInitializerService.initialize'
      );
    }
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
