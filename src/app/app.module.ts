import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, type Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AppComponent } from './app.component';
import { SitnaMapComponent } from './components/sitna-map/sitna-map.component';
import { ScenarioSelectorComponent } from './components/scenario-selector/scenario-selector.component';
import {
  getScenarioComponents,
  registerScenarios,
} from './scenarios/scenario-registry';
import {
  AppInitializerService,
  initializeApp,
} from './services/app-initializer.service';

// Get scenario registrations and create routes
function initializeRoutes(): Routes {
  // Create a temporary registry instance to get registrations
  // The actual singleton will be used at runtime
  const tempRegistry = new (class {
    private scenarios: Map<string, any> = new Map();
    register(reg: any): void {
      this.scenarios.set(reg.route, reg);
    }
    getAllScenarios(): any[] {
      return Array.from(this.scenarios.values());
    }
  })();

  const registrations = registerScenarios(tempRegistry as any);

  const scenarioRoutes: Routes = registrations.map((reg) => ({
    path: reg.route,
    component: reg.componentClass as any,
  }));

  return [
    { path: '', component: ScenarioSelectorComponent },
    ...scenarioRoutes,
    // Catch-all route - but Angular router should not intercept asset requests
    // Assets are served by the dev server before routing
    { path: '**', redirectTo: '' },
  ];
}

const routes: Routes = initializeRoutes();

@NgModule({
  declarations: [
    AppComponent,
    SitnaMapComponent,
    ScenarioSelectorComponent,
    ...getScenarioComponents(),
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatChipsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatToolbarModule,
    MatSnackBarModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatChipsModule,
    MatExpansionModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    RouterModule.forRoot(routes, {
      // Use hash location strategy to prevent router from intercepting asset requests
      // URLs will be: http://localhost:4200/#/scenario-01 instead of http://localhost:4200/scenario-01
      // This ensures /assets/, /js/, and /config/ paths are not intercepted by the router
      useHash: true,
      initialNavigation: 'enabledBlocking',
      // Enable error handling for better debugging
      enableTracing: false,
    }),
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppInitializerService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

