import {
  Component,
  Input,
  ViewChild,
  type OnDestroy,
  type ElementRef,
  type AfterViewInit,
  afterNextRender,
  inject,
} from '@angular/core';
import type SitnaMap from 'api-sitna';
import type { MapOptions } from 'api-sitna/TC/Map';
import { SitnaConfigService } from '../../services/sitna-config.service';
import { LoggingService } from '../../services/logging.service';
import { ErrorHandlingService } from '../../services/error-handling.service';

@Component({
  selector: 'app-sitna-map',
  templateUrl: './sitna-map.component.html',
  styleUrls: ['./sitna-map.component.scss'],
})
export class SitnaMapComponent implements AfterViewInit, OnDestroy {
  @Input() containerId: string = 'mapa';
  @Input() options?: MapOptions;
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  map: SitnaMap | null = null;
  private isInitialized = false;
  private readonly configService = inject(SitnaConfigService);
  private readonly logger = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlingService);

  constructor() {
    afterNextRender(() => {
      this.initializeMap();
    });
  }

  ngAfterViewInit(): void {
    // Map initialization happens in afterNextRender callback
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  /**
   * Initialize SITNA map
   */
  private initializeMap(): void {
    if (this.isInitialized) {
      return;
    }

    // Use container ID from input or generate unique ID
    const containerId =
      this.containerId || `map-${Date.now()}`;

    // Ensure container exists
    if (this.mapContainer !== null && this.mapContainer !== undefined) {
      (this.mapContainer.nativeElement as HTMLElement).id = containerId;
    }

    this.map = this.configService.initializeMap(containerId, this.options);

    if (this.map !== null && this.map !== undefined) {
      this.map
        .loaded(() => {
          this.isInitialized = true;
          this.logger.warn('SITNA map loaded', this.map);
        })
        .catch((error: unknown) => {
          this.errorHandler.handleError(
            error,
            'SitnaMapComponent.initializeMap'
          );
        });
    }
  }

  /**
   * Destroy map instance
   */
  private destroyMap(): void {
    if (this.map) {
      // SITNA maps don't have explicit destroy methods in the API
      // but we can clean up references
      this.map = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get map instance (for external access)
   */
  getMap(): SitnaMap | null {
    return this.map;
  }
}

