import { Injectable } from '@angular/core';
import type { AppService } from '../../types/api-sitmun';

/**
 * Service for matching and normalizing service URLs.
 * Provides utilities for comparing layer service URLs with model service URLs.
 */
@Injectable({
  providedIn: 'root',
})
export class ServiceMatcherService {
  /**
   * Find a service in the AppCfg model by matching the service URL prefix.
   * The layer's service URL must start with the model service URL.
   *
   * @param serviceUrl - The service URL from the layer to match
   * @param services - Array of services from AppCfg
   * @returns The matching AppService from the model, or null if not found
   */
  findServiceInModel(serviceUrl: string, services: AppService[]): AppService | null {
    if (!services || services.length === 0) {
      return null;
    }

    // Normalize the layer's service URL
    const normalizedLayerUrl = this.normalizeUrl(serviceUrl);

    // Search through model services
    for (const service of services) {
      const normalizedModelUrl = this.normalizeUrl(service.url);

      // Check if layer URL starts with model service URL (prefix matching)
      if (normalizedLayerUrl.startsWith(normalizedModelUrl)) {
        return service;
      }
    }

    return null;
  }

  /**
   * Normalize a URL for comparison by:
   * - Converting protocol-relative URLs to https://
   * - Removing trailing slashes
   * - Converting to lowercase
   *
   * @param url - The URL to normalize
   * @returns The normalized URL
   */
  normalizeUrl(url: string): string {
    let normalized = url;

    // Handle protocol-relative URLs (starting with //)
    if (normalized.startsWith('//')) {
      normalized = 'https:' + normalized;
    } else if (!normalized.includes('://')) {
      // If no protocol at all, add https://
      normalized = 'https://' + normalized;
    }

    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');

    // Convert to lowercase for case-insensitive comparison
    normalized = normalized.toLowerCase();

    return normalized;
  }
}

