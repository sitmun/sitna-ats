import { Injectable } from '@angular/core';

/**
 * Service for accessing and waiting on SITNA namespace availability.
 *
 * Provides utilities for:
 * - Accessing SITNA control namespace
 * - Waiting for SITNA.control.Control to become available
 */
@Injectable({
  providedIn: 'root',
})
export class SitnaNamespaceService {
  /**
   * Get SITNA namespace from window.
   *
   * @returns The SITNA namespace, or undefined if not available
   */
  getSITNA(): { [key: string]: unknown } | undefined {
    return (window as { SITNA?: { [key: string]: unknown } }).SITNA;
  }

  /**
   * Get SITNA control namespace.
   *
   * @returns The SITNA control namespace, or undefined if not available
   */
  getSitnaControl(): unknown {
    const SITNA = this.getSITNA();
    if (!SITNA) {
      return undefined;
    }

    // Ensure control namespace exists
    if (!SITNA['control']) {
      SITNA['control'] = {};
    }

    const controlNamespace = SITNA['control'] as { [key: string]: unknown };
    return controlNamespace['Control'];
  }

  /**
   * Wait for SITNA.control.Control to become available with retry logic.
   * Also ensures the control namespace is properly set up.
   *
   * @param maxRetries - Maximum number of retry attempts (default: 50)
   * @param delayMs - Delay between retries in milliseconds (default: 100)
   * @returns Promise that resolves when SITNA.control.Control is available
   * @throws Error if SITNA.control.Control is not available after max retries
   */
  async waitForSitnaControl(
    maxRetries: number = 50,
    delayMs: number = 100
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      const SITNA = this.getSITNA();
      const TC = (window as { TC?: { [key: string]: unknown } }).TC;
      const sitnaControlNamespace = SITNA?.['control'] as
        | { [key: string]: unknown }
        | undefined;
      const tcControlNamespace = TC?.['control'] as
        | { [key: string]: unknown }
        | undefined;
      const controlCtor =
        sitnaControlNamespace?.['Control'] ??
        tcControlNamespace?.['Control'] ??
        TC?.['Control'];

      if (typeof controlCtor === 'function') {
        // Ensure SITNA.control namespace exists
        if (!SITNA?.['control']) {
          (window as { SITNA?: { [key: string]: unknown } }).SITNA = {
            ...SITNA,
            control: {},
          };
        }

        const sitna = (window as { SITNA?: { [key: string]: unknown } }).SITNA;
        if (sitna) {
          const controlNamespace = sitna['control'] as {
            [key: string]: unknown;
          };
          if (typeof controlNamespace['Control'] !== 'function') {
            controlNamespace['Control'] = controlCtor;
          }
        }
        return;
      }

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('SITNA.control.Control not available after retries');
  }
}

