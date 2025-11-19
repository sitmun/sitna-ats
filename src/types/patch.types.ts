/**
 * Type definitions for patching utilities
 */

/**
 * Interface for patch restore functionality
 * Returned by patch functions to allow restoration of original behavior
 */
export interface PatchRestore {
  restore: () => void;
}

/**
 * Interface for managing multiple patches
 * Provides methods to add, restore, and clear patches
 */
export interface PatchManager {
  add: (restore: () => void) => void;
  restoreAll: () => void;
  clear: () => void;
}

/**
 * Configuration for SITNA map method patching with logging
 */
export interface SitnaPatchConfig {
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  patchMethods?: string[];
}

