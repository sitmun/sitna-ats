import { Injectable } from '@angular/core';
import type { TCNamespace } from '../../types/api-sitna';

/**
 * Service for accessing and waiting on TC namespace availability.
 *
 * Provides utilities for:
 * - Accessing the TC namespace
 * - Waiting for TC namespace to become available
 * - Waiting for specific TC properties to become available
 */
@Injectable({
  providedIn: 'root',
})
export class TCNamespaceService {
  /**
   * Get the TC namespace from window or globalThis.
   *
   * @returns The TC namespace, or undefined if not available
   */
  getTC(): TCNamespace | undefined {
    return (
      (window as { TC?: TCNamespace }).TC ||
      (globalThis as { TC?: TCNamespace }).TC
    );
  }

  /**
   * Wait for TC namespace to become available with retry logic.
   *
   * @param maxRetries - Maximum number of retry attempts (default: 50)
   * @param delayMs - Delay between retries in milliseconds (default: 100)
   * @returns Promise that resolves when TC is available
   * @throws Error if TC is not available after max retries
   */
  async waitForTC(
    maxRetries: number = 50,
    delayMs: number = 100
  ): Promise<TCNamespace> {
    for (let i = 0; i < maxRetries; i++) {
      const TC = this.getTC();
      if (TC) {
        return TC;
      }
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('TC namespace not available after retries');
  }

  /**
   * Wait for a specific property path in TC namespace to become available.
   *
   * @param propertyPath - Dot-separated property path (e.g., 'control.FeatureInfoSilme')
   * @param maxRetries - Maximum number of retry attempts (default: 50)
   * @param delayMs - Delay between retries in milliseconds (default: 100)
   * @returns Promise that resolves with the property value when available
   * @throws Error if property is not available after max retries
   */
  async waitForTCProperty(
    propertyPath: string,
    maxRetries: number = 50,
    delayMs: number = 100
  ): Promise<unknown> {
    for (let i = 0; i < maxRetries; i++) {
      const TC = this.getTC();
      if (TC) {
        const value = this.getPropertyByPath(TC, propertyPath);
        if (value !== undefined) {
          return value;
        }
      }
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error(
      `TC property '${propertyPath}' not available after retries`
    );
  }

  /**
   * Get a property value from an object using a dot-separated path.
   *
   * @param obj - The object to traverse
   * @param path - Dot-separated property path
   * @returns The property value, or undefined if not found
   */
  private getPropertyByPath(
    obj: Record<string, unknown>,
    path: string
  ): unknown {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }

  /**
   * Check if TC namespace has specific properties available.
   * Useful for checking if TC is ready for certain operations.
   *
   * @param properties - Array of property paths to check
   * @returns true if all properties are available, false otherwise
   */
  hasTCProperties(properties: string[]): boolean {
    const TC = this.getTC();
    if (!TC) {
      return false;
    }
    return properties.every(
      (path) => this.getPropertyByPath(TC as Record<string, unknown>, path) !== undefined
    );
  }
}

