import { ParsedTorrent } from './lib/torrentParser';

export type ActiveTab = 'parser' | 'enhancer' | 'batch' | 'api';

export interface ParseResult {
  id: string;
  filename: string;
  parsed: ParsedTorrent;
  parsedAt: string;
}

export interface ApiSnippet {
  language: string;
  label: string;
  code: string;
}
