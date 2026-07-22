import { ParsedTorrent } from './lib/torrentParser';

export type ActiveTab = 'parser' | 'enhancer' | 'batch' | 'direct-link' | 'api';

export interface ParseResult {
  id: string;
  filename: string;
  parsed: ParsedTorrent;
  parsedAt: string;
}

export interface DirectLinkItem {
  index: number;
  name: string;
  size: string;
  bytes: number;
  directHttpUrl: string;
  webTorrentGatewayUrl: string;
  curlCommand: string;
}

export interface DirectLinkResponse {
  infoHash: string;
  name: string;
  totalSize: string;
  fileCount: number;
  magnetUri: string;
  webTorrentPlayUrl: string;
  directDownloadUrls: DirectLinkItem[];
  cloudSeedrUrl: string;
  curlCommandAll: string;
}

export interface ApiSnippet {
  language: string;
  label: string;
  code: string;
}

