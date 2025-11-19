export type FindingType = 'issue' | 'solution' | 'learning' | 'note';

export interface Finding {
  id: string;
  type: FindingType;
  title: string;
  description: string;
  details?: string; // Optional detailed explanation
  codeSnippet?: string; // Optional code example
  solution?: string; // Optional solution text
  references?: string[]; // Optional links or references
}

