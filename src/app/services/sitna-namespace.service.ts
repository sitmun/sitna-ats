import { Injectable } from '@angular/core';
import type { TCNamespace } from '../../types/api-sitna';

/**
 * SITNA namespace type definition
 */
interface SitnaNamespace {
  Map: new (
    div: HTMLElement | string,
    options?: unknown
  ) => unknown;
  Cfg?: unknown;
  Consts?: unknown;
  control?: {
    Control?: new (...args: unknown[]) => unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Service for accessing and waiting on SITNA namespace availability.
 *
 * Provides utilities for:
 * - Accessing SITNA namespace
 * - Waiting for SITNA namespace to become available
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
  getSITNA(): SitnaNamespace | undefined {
    return window.SITNA as SitnaNamespace | undefined;
  }

  /**
   * Wait for SITNA namespace to become available with retry logic.
   *
   * @param maxRetries - Maximum number of retry attempts (default: 50)
   * @param delayMs - Delay between retries in milliseconds (default: 100)
   * @returns Promise that resolves when SITNA is available
   * @throws Error if SITNA is not available after max retries
   */
  async waitForSITNA(
    maxRetries: number = 50,
    delayMs: number = 100
  ): Promise<SitnaNamespace> {
    for (let i = 0; i < maxRetries; i++) {
      const SITNA = this.getSITNA();
      if (SITNA) {
        return SITNA;
      }
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('SITNA namespace not available after retries');
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
      const TC: TCNamespace | undefined = window.TC;
      const sitnaControlNamespace = SITNA?.['control'] as
        | { Control?: new (...args: unknown[]) => unknown; [key: string]: unknown }
        | undefined;
      const tcControlNamespace = TC?.['control'] as
        | { Control?: new (...args: unknown[]) => unknown; [key: string]: unknown }
        | undefined;
      const controlCtor =
        sitnaControlNamespace?.['Control'] ??
        tcControlNamespace?.['Control'] ??
        (TC?.['Control'] as (new (...args: unknown[]) => unknown) | undefined);

      if (typeof controlCtor === 'function') {
        // Ensure SITNA.control namespace exists
        if (!SITNA?.['control']) {
          if (!window.SITNA) {
            (window as { SITNA?: SitnaNamespace }).SITNA = {} as SitnaNamespace;
          }
          const sitna = (window as { SITNA?: SitnaNamespace }).SITNA;
          if (sitna) {
            sitna['control'] = {};
          }
        }

        const sitna = (window as { SITNA?: SitnaNamespace }).SITNA;
        if (sitna && sitna['control']) {
          const controlNamespace = sitna['control'] as {
            Control?: new (...args: unknown[]) => unknown;
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

