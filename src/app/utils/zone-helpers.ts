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

