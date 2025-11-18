import type { NgZone } from '@angular/core';
import type { ChangeDetectorRef } from '@angular/core';

/**
 * Utility functions for running code in Angular zone with change detection.
 *
 * These helpers abstract the common pattern of:
 * ```typescript
 * ngZone.run(() => {
 *   cdr.markForCheck();
 * });
 * ```
 */
export function runInZone(
  ngZone: NgZone,
  cdr: ChangeDetectorRef,
  fn: () => void
): void {
  ngZone.run(() => {
    fn();
    cdr.markForCheck();
  });
}

/**
 * Run an async function in Angular zone with change detection.
 *
 * @param ngZone - Angular NgZone instance
 * @param cdr - ChangeDetectorRef instance
 * @param fn - Async function to execute
 * @returns Promise that resolves when the function completes
 */
export async function runInZoneAsync(
  ngZone: NgZone,
  cdr: ChangeDetectorRef,
  fn: () => Promise<void>
): Promise<void> {
  return ngZone.run(async () => {
    await fn();
    cdr.markForCheck();
  });
}

