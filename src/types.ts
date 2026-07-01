export interface NoteResult {
  path: string;
  title: string;
  frontmatter: Record<string, unknown>;
  body: string;
  tags: string[];
  size: number;
  modified: string;
  created: string;
}

export interface SearchResult {
  total: number;
  count: number;
  offset: number;
  has_more: boolean;
  next_offset?: number;
  notes: SearchHit[];
}

export interface SearchHit {
  path: string;
  title: string;
  snippet: string;
  tags: string[];
  modified: string;
}

export interface WriteResult {
  path: string;
  action: 'created' | 'updated' | 'appended';
  size: number;
}

export interface TagCount {
  tag: string;
  count: number;
}
