import type { OnInit} from '@angular/core';
import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import packageLockJson from '../../package-lock.json';
import packageJson from '../../package.json';
import { LoggingService } from './services/logging.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'SITNA API Testing Sandbox';
  sitnaVersion = '';

  private readonly titleService = inject(Title);
  private readonly logger = inject(LoggingService);

  ngOnInit(): void {
    this.loadSitnaVersion();
  }

  private loadSitnaVersion(): void {
    try {
      // Read from package-lock.json to get the exact installed version
      // This is the most accurate source as it reflects the effective runtime version
      // package-lock.json v3 uses 'packages' structure
      const sitnaPackage = packageLockJson.packages?.['node_modules/api-sitna'];

      if (sitnaPackage?.version) {
        this.sitnaVersion = sitnaPackage.version;
        this.title = `SITNA API Testing Sandbox (v${this.sitnaVersion} - package-lock.json)`;
        this.titleService.setTitle(this.title);
        return;
      }

      // Fallback: try reading from package.json dependencies
      const sitnaVersion = packageJson.dependencies?.['api-sitna'];
      if (sitnaVersion) {
        // Extract version number (remove ^, ~, etc.)
        this.sitnaVersion = sitnaVersion;
        this.title = `SITNA API Testing Sandbox (v${this.sitnaVersion} - package.json)`;
        this.titleService.setTitle(this.title);
      }
    } catch (error) {
      this.logger.warn('Could not load SITNA version:', error);
    }
  }
}

