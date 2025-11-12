import type { OnInit} from '@angular/core';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorHandlingService } from '../../services/error-handling.service';
import { ScenarioRegistryService } from '../../services/scenario-registry.service';
import type { ScenarioRegistration } from '../../types/scenario.types';
import { registerScenarios } from '../../scenarios/scenario-registry';

@Component({
  selector: 'app-scenario-selector',
  templateUrl: './scenario-selector.component.html',
  styleUrls: ['./scenario-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioSelectorComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlingService);
  private readonly registry = inject(ScenarioRegistryService);

  allScenarios: ScenarioRegistration[] = [];
  filteredScenarios: ScenarioRegistration[] = [];
  selectedTags: string[] = [];
  nameFilter: string = '';
  availableTags: string[] = [];
  tagCounts: Map<string, number> = new Map();

  ngOnInit(): void {
    // Register all scenarios
    registerScenarios(this.registry);

    // Load scenarios
    this.allScenarios = this.registry.getAllScenarios();
    this.availableTags = this.registry.getAllTags();

    // Calculate tag counts
    this.calculateTagCounts();

    this.applyFilters();
  }

  private calculateTagCounts(): void {
    this.tagCounts.clear();
    this.allScenarios.forEach((scenario) => {
      scenario.tags.forEach((tag) => {
        const currentCount = this.tagCounts.get(tag) || 0;
        this.tagCounts.set(tag, currentCount + 1);
      });
    });
  }

  getTagCount(tag: string): number {
    return this.tagCounts.get(tag) || 0;
  }

  getTagColorClass(tag: string): string {
    // Generate consistent color class based on tag name using Material Design palette colors
    // Returns a class name like 'tag-color-0', 'tag-color-1', etc.

    // Simple hash function to get consistent color for each tag
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % 10; // 10 color variants
    return `tag-color-${index}`;
  }

  onNameFilterInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.nameFilter = target.value;
    this.applyFilters();
  }

  onNameFilterChange(filter: string): void {
    this.nameFilter = filter;
    this.applyFilters();
  }

  onTagToggle(tag: string): void {
    const index = this.selectedTags.indexOf(tag);
    if (index >= 0) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedTags = [];
    this.nameFilter = '';
    this.applyFilters();
  }

  private applyFilters(): void {
    const filters: { tags?: string[]; name?: string } = {};

    if (this.selectedTags.length > 0) {
      filters.tags = this.selectedTags;
    }

    if (this.nameFilter.trim()) {
      filters.name = this.nameFilter.trim();
    }

    this.filteredScenarios = Object.keys(filters).length > 0
      ? this.registry.getScenariosByFilters(filters)
      : this.allScenarios;
  }

  navigateToScenario(route: string): void {
    this.router.navigate([route]).catch((error: unknown) => {
      this.errorHandler.handleError(
        error,
        'ScenarioSelectorComponent.navigateToScenario'
      );
    });
  }

  trackByScenarioRoute(_index: number, scenario: ScenarioRegistration): string {
    return scenario.route;
  }

  trackByTagName(_index: number, tag: string): string {
    return tag;
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  getTagAriaLabel(tag: string): string {
    const count = this.getTagCount(tag);
    const selected = this.isTagSelected(tag);
    const state = selected ? 'selected' : 'not selected';
    return `${tag} filter, ${count} scenario${count !== 1 ? 's' : ''}, ${state}`;
  }

  onKeyDown(event: KeyboardEvent, action: 'toggle' | 'clear', tag?: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (action === 'toggle' && tag) {
        this.onTagToggle(tag);
      } else if (action === 'clear') {
        this.clearFilters();
      }
    } else if (event.key === 'Escape' && (this.selectedTags.length > 0 || this.nameFilter)) {
      event.preventDefault();
      this.clearFilters();
    }
  }

  onCardTagClick(event: Event, tag: string): void {
    event.stopPropagation();
    this.onTagToggle(tag);
  }

  onCardTagKeyDown(event: KeyboardEvent, tag: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.onTagToggle(tag);
    }
  }
}

