import { Component, Input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { marked } from 'marked';
import type { Finding, FindingType } from '../../types/findings.types';

@Component({
  selector: 'app-findings-section',
  templateUrl: './findings-section.component.html',
  styleUrls: ['./findings-section.component.scss'],
})
export class FindingsSectionComponent {
  @Input() findings: Finding[] = [];
  @Input() summary?: string;
  @Input() collapsed: boolean = true;
  @Input() hideTitle: boolean = false;
  @Input() useMarkdown: boolean = true;

  constructor(private sanitizer: DomSanitizer) {
    // Configure marked options
    marked.setOptions({
      breaks: true, // Convert line breaks to <br>
      gfm: true, // GitHub Flavored Markdown
    });
  }

  getFindingIcon(type: FindingType): string {
    switch (type) {
      case 'issue':
        return 'error';
      case 'solution':
        return 'check_circle';
      case 'learning':
        return 'lightbulb';
      case 'note':
        return 'info';
      default:
        return 'info';
    }
  }

  getFindingColor(type: FindingType): string {
    switch (type) {
      case 'issue':
        return 'warn';
      case 'solution':
        return 'primary';
      case 'learning':
        return 'accent';
      case 'note':
        return '';
      default:
        return '';
    }
  }

  groupFindingsByType(): Map<FindingType, Finding[]> {
    const grouped = new Map<FindingType, Finding[]>();
    this.findings.forEach((finding) => {
      const existing = grouped.get(finding.type) ?? [];
      existing.push(finding);
      grouped.set(finding.type, existing);
    });
    return grouped;
  }

  getTypeLabel(type: FindingType): string {
    switch (type) {
      case 'issue':
        return 'Issues';
      case 'solution':
        return 'Solutions';
      case 'learning':
        return 'Learnings';
      case 'note':
        return 'Notes';
      default:
        return 'Findings';
    }
  }

  trackByFindingId(index: number, finding: Finding): string {
    return finding.id;
  }

  renderMarkdown(text: string): SafeHtml {
    if (!text) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    if (!this.useMarkdown) {
      // For plain text, use proper sanitization (don't bypass security)
      const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, text);
      const safeText = sanitized ?? '';
      return this.sanitizer.bypassSecurityTrustHtml(safeText);
    }

    // Parse markdown to HTML and return as SafeHtml
    const html = marked.parse(text) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

