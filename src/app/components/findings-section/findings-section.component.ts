import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { marked } from 'marked';

@Component({
  selector: 'app-findings-section',
  templateUrl: './findings-section.component.html',
  styleUrls: ['./findings-section.component.scss'],
})
export class FindingsSectionComponent implements OnInit, OnChanges {
  @Input() markdownFile?: string;
  @Input() markdownFileName: string = 'findings.md';
  @Input() collapsed: boolean = true;
  @Input() hideTitle: boolean = false;

  markdownContent: string | null = null;
  markdownHtml: SafeHtml | null = null;
  markdownLoading: boolean = false;
  markdownError: string | null = null;

  private readonly sanitizer = inject(DomSanitizer);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    // Configure marked options
    marked.setOptions({
      breaks: true, // Convert line breaks to <br>
      gfm: true, // GitHub Flavored Markdown
    });
  }

  ngOnInit(): void {
    this.loadMarkdownFile();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['markdownFile'] || changes['markdownFileName']) {
      this.loadMarkdownFile();
    }
  }

  private resolveMarkdownFilePath(): string {
    if (this.markdownFile) {
      // If explicit path provided, use it directly
      return this.markdownFile;
    }

    // Convention-based: use route to construct path
    // Convention: findings.md in the same directory as the component
    // Since files in src/app aren't directly served, we construct a path
    // that assumes the file structure mirrors the route structure
    const routePath = this.route.snapshot.routeConfig?.path ||
                      this.route.snapshot.url.join('/') ||
                      '';

    if (routePath) {
      // Construct path based on route: /assets/scenarios/{route}/{filename}
      return `/assets/scenarios/${routePath}/${this.markdownFileName}`;
    }

    // Fallback: use relative path (may need asset configuration)
    return `./${this.markdownFileName}`;
  }

  private loadMarkdownFile(): void {
    const filePath = this.resolveMarkdownFilePath();

    if (!filePath) {
      this.markdownError = 'No markdown file path specified';
      return;
    }

    this.markdownLoading = true;
    this.markdownError = null;
    this.markdownContent = null;
    this.markdownHtml = null;

    // Log the path for debugging
    console.log('Loading markdown file from:', filePath);
    console.log('Route path:', this.route.snapshot.routeConfig?.path);

    this.http.get(filePath, { responseType: 'text' }).subscribe({
      next: (content) => {
        this.markdownContent = content;
        this.markdownHtml = this.renderMarkdownToHtml(content);
        this.markdownLoading = false;
      },
      error: (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load markdown file';
        const fullError = `${errorMessage} (path: ${filePath})`;
        console.error('Failed to load markdown:', fullError, error);
        this.markdownError = fullError;
        this.markdownLoading = false;
      },
    });
  }

  private renderMarkdownToHtml(text: string): SafeHtml {
    if (!text) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // Parse markdown to HTML and return as SafeHtml
    const html = marked.parse(text) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

