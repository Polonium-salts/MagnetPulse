/**
 * Torrent file Bencode Parser & SHA-1 InfoHash Generator
 * Pure TypeScript implementation that runs synchronously and blazingly fast
 * in both Node.js and Browser environments.
 */

export interface TorrentFileItem {
  path: string;
  length: number;
  formattedSize: string;
}

export interface ParsedTorrent {
  infoHash: string; // 40-character hex string (BTIH)
  infoHashBase32: string; // 32-character base32 string
  magnetUri: string;
  name: string;
  totalSize: number;
  formattedTotalSize: string;
  fileCount: number;
  files: TorrentFileItem[];
  trackers: string[];
  announce: string | null;
  isPrivate: boolean;
  pieceLength: number;
  pieceCount: number;
  createdDate?: string;
  createdBy?: string;
  comment?: string;
  encoding?: string;
}

/**
 * Format bytes to human readable string (KB, MB, GB, TB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Pure JS SHA-1 implementation for synchronous execution in any JS runtime.
 */
function sha1Sync(buffer: Uint8Array): Uint8Array {
  // Pre-processing
  const len = buffer.length;
  const bitLen = len * 8;
  const padLen = ((len + 8) % 64 === 0) ? 64 : (64 - ((len + 8) % 64));
  const totalLen = len + padLen + 8;
  
  const padded = new Uint8Array(totalLen);
  padded.set(buffer, 0);
  padded[len] = 0x80;
  
  // Set 64-bit Big-Endian length at the end
  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalLen - 4, bitLen & 0xffffffff, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);

  for (let i = 0; i < totalLen; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + (j * 4), false);
    }
    for (let j = 16; j < 80; j++) {
      const val = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (val << 1) | (val >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f = 0;
      let k = 0;
      if (j < 20) {
        f = (b & c) | ((~b) & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) & 0xffffffff;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2));
      b = a;
      a = temp;
    }

    h0 = (h0 + a) & 0xffffffff;
    h1 = (h1 + b) & 0xffffffff;
    h2 = (h2 + c) & 0xffffffff;
    h3 = (h3 + d) & 0xffffffff;
    h4 = (h4 + e) & 0xffffffff;
  }

  const result = new Uint8Array(20);
  const resView = new DataView(result.buffer);
  resView.setUint32(0, h0, false);
  resView.setUint32(4, h1, false);
  resView.setUint32(8, h2, false);
  resView.setUint32(12, h3, false);
  resView.setUint32(16, h4, false);
  return result;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBase32(hex: string): string {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }

  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += base32Chars[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Bencode Decoder with Info dictionary byte boundary tracking
 */
class BencodeDecoder {
  private pos = 0;
  private buffer: Uint8Array;
  private textDecoder = new TextDecoder('utf-8');
  public infoStart = -1;
  public infoEnd = -1;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
  }

  public decode(): any {
    return this.parseNext();
  }

  private parseNext(): any {
    if (this.pos >= this.buffer.length) {
      throw new Error('Unexpected end of bencoded data');
    }

    const char = String.fromCharCode(this.buffer[this.pos]);

    if (char === 'i') {
      return this.parseInteger();
    } else if (char === 'l') {
      return this.parseList();
    } else if (char === 'd') {
      return this.parseDictionary();
    } else if (char >= '0' && char <= '9') {
      return this.parseByteString();
    } else {
      throw new Error(`Invalid bencode token at position ${this.pos}: '${char}' (${this.buffer[this.pos]})`);
    }
  }

  private parseInteger(): number {
    this.pos++; // skip 'i'
    const start = this.pos;
    while (this.pos < this.buffer.length && this.buffer[this.pos] !== 101) { // 'e' = 101
      this.pos++;
    }
    if (this.pos >= this.buffer.length) {
      throw new Error('Unterminated integer in bencode');
    }
    const numStr = String.fromCharCode(...this.buffer.subarray(start, this.pos));
    this.pos++; // skip 'e'
    return parseInt(numStr, 10);
  }

  private parseByteString(): Uint8Array {
    const start = this.pos;
    while (this.pos < this.buffer.length && this.buffer[this.pos] !== 58) { // ':' = 58
      this.pos++;
    }
    if (this.pos >= this.buffer.length) {
      throw new Error('Invalid string length in bencode');
    }
    const lenStr = String.fromCharCode(...this.buffer.subarray(start, this.pos));
    const length = parseInt(lenStr, 10);
    this.pos++; // skip ':'

    if (this.pos + length > this.buffer.length) {
      throw new Error(`String out of bounds: length ${length} at position ${this.pos}`);
    }

    const strBytes = this.buffer.subarray(this.pos, this.pos + length);
    this.pos += length;
    return strBytes;
  }

  private parseList(): any[] {
    this.pos++; // skip 'l'
    const list: any[] = [];
    while (this.pos < this.buffer.length && this.buffer[this.pos] !== 101) { // 'e' = 101
      list.push(this.parseNext());
    }
    if (this.pos >= this.buffer.length) {
      throw new Error('Unterminated list in bencode');
    }
    this.pos++; // skip 'e'
    return list;
  }

  private parseDictionary(): Record<string, any> {
    this.pos++; // skip 'd'
    const dict: Record<string, any> = {};

    while (this.pos < this.buffer.length && this.buffer[this.pos] !== 101) { // 'e' = 101
      // Keys are always byte strings
      const keyBytes = this.parseByteString();
      const key = this.textDecoder.decode(keyBytes);

      const isInfoKey = (key === 'info');
      if (isInfoKey) {
        this.infoStart = this.pos;
      }

      const val = this.parseNext();

      if (isInfoKey) {
        this.infoEnd = this.pos;
      }

      dict[key] = val;
    }

    if (this.pos >= this.buffer.length) {
      throw new Error('Unterminated dictionary in bencode');
    }
    this.pos++; // skip 'e'
    return dict;
  }
}

/**
 * Safely converts Uint8Array or string values to UTF-8 strings
 */
function decodeString(value: any): string {
  if (!value) return '';
  if (value instanceof Uint8Array) {
    try {
      return new TextDecoder('utf-8').decode(value);
    } catch {
      return String.fromCharCode(...value);
    }
  }
  if (typeof value === 'string') return value;
  return String(value);
}

/**
 * Main parseTorrent function accepting raw Buffer or Uint8Array
 */
export function parseTorrent(data: Uint8Array | ArrayBuffer): ParsedTorrent {
  const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
  const decoder = new BencodeDecoder(buffer);
  const decoded = decoder.decode();

  if (!decoded || typeof decoded !== 'object') {
    throw new Error('无效的 Torrent 文件格式');
  }

  if (decoder.infoStart < 0 || decoder.infoEnd < 0) {
    throw new Error('Torrent 文件中未找到 info 字典结构');
  }

  // Extract raw info dictionary bytes & calculate SHA-1 infohash
  const infoBuffer = buffer.subarray(decoder.infoStart, decoder.infoEnd);
  const infoHashBytes = sha1Sync(infoBuffer);
  const infoHash = bytesToHex(infoHashBytes).toLowerCase();
  const infoHashBase32 = hexToBase32(infoHash);

  const info = decoded.info;
  if (!info) {
    throw new Error('Missing info section in torrent data');
  }

  // Name
  const name = decodeString(info['name.utf-8'] || info.name) || 'unnamed_torrent';

  // Files & Total Size
  const files: TorrentFileItem[] = [];
  let totalSize = 0;

  if (Array.isArray(info.files)) {
    // Multi-file torrent
    for (const fileDict of info.files) {
      const length = typeof fileDict.length === 'number' ? fileDict.length : 0;
      totalSize += length;

      const pathSegments: string[] = [];
      const rawPaths = fileDict['path.utf-8'] || fileDict.path;
      if (Array.isArray(rawPaths)) {
        for (const seg of rawPaths) {
          pathSegments.push(decodeString(seg));
        }
      } else if (rawPaths) {
        pathSegments.push(decodeString(rawPaths));
      }

      files.push({
        path: pathSegments.join('/'),
        length,
        formattedSize: formatBytes(length)
      });
    }
  } else {
    // Single file torrent
    const length = typeof info.length === 'number' ? info.length : 0;
    totalSize = length;
    files.push({
      path: name,
      length,
      formattedSize: formatBytes(length)
    });
  }

  // Trackers
  const trackersSet = new Set<string>();
  let announce: string | null = null;

  if (decoded.announce) {
    const annStr = decodeString(decoded.announce).trim();
    if (annStr) {
      announce = annStr;
      trackersSet.add(annStr);
    }
  }

  if (Array.isArray(decoded['announce-list'])) {
    for (const subList of decoded['announce-list']) {
      if (Array.isArray(subList)) {
        for (const tr of subList) {
          const trStr = decodeString(tr).trim();
          if (trStr) trackersSet.add(trStr);
        }
      } else if (subList) {
        const trStr = decodeString(subList).trim();
        if (trStr) trackersSet.add(trStr);
      }
    }
  }

  const trackers = Array.from(trackersSet);

  // Metadata
  const isPrivate = Boolean(info.private === 1);
  const pieceLength = typeof info['piece length'] === 'number' ? info['piece length'] : 0;
  const piecesBytes = info.pieces instanceof Uint8Array ? info.pieces : new Uint8Array(0);
  const pieceCount = Math.floor(piecesBytes.length / 20);

  let createdDate: string | undefined;
  if (typeof decoded['creation date'] === 'number') {
    try {
      createdDate = new Date(decoded['creation date'] * 1000).toISOString();
    } catch {
      // ignore
    }
  }

  const createdBy = decodeString(decoded['created by']);
  const comment = decodeString(decoded['comment.utf-8'] || decoded.comment);
  const encoding = decodeString(decoded.encoding);

  // Generate Magnet Link
  const magnetParams: string[] = [
    `xt=urn:btih:${infoHash}`,
    `dn=${encodeURIComponent(name)}`
  ];

  for (const tr of trackers) {
    magnetParams.push(`tr=${encodeURIComponent(tr)}`);
  }

  const magnetUri = `magnet:?${magnetParams.join('&')}`;

  return {
    infoHash,
    infoHashBase32,
    magnetUri,
    name,
    totalSize,
    formattedTotalSize: formatBytes(totalSize),
    fileCount: files.length,
    files,
    trackers,
    announce,
    isPrivate,
    pieceLength,
    pieceCount,
    createdDate,
    createdBy: createdBy || undefined,
    comment: comment || undefined,
    encoding: encoding || undefined
  };
}

/**
 * Magnet URI Parser & Enhancer
 */
export interface ParsedMagnet {
  infoHash: string;
  name?: string;
  trackers: string[];
}

export function parseMagnetUri(magnetUri: string): ParsedMagnet {
  if (!magnetUri.startsWith('magnet:?')) {
    throw new Error('无效的磁力链接，格式必须以 magnet:? 开头');
  }

  const queryString = magnetUri.substring(8);
  const params = new URLSearchParams(queryString);

  let infoHash = '';
  const xtList = params.getAll('xt');
  for (const xt of xtList) {
    if (xt.startsWith('urn:btih:')) {
      infoHash = xt.replace('urn:btih:', '').trim();
      break;
    }
  }

  if (!infoHash) {
    throw new Error('磁力链接中未找到 xt=urn:btih: 哈希值');
  }

  const name = params.get('dn') ? decodeURIComponent(params.get('dn')!) : undefined;
  const trackers = params.getAll('tr').map(tr => decodeURIComponent(tr).trim()).filter(Boolean);

  return {
    infoHash: infoHash.toLowerCase(),
    name,
    trackers
  };
}

export function buildMagnetUri(infoHash: string, name?: string, trackers: string[] = []): string {
  const parts: string[] = [`xt=urn:btih:${infoHash.toLowerCase()}`];
  if (name) {
    parts.push(`dn=${encodeURIComponent(name)}`);
  }
  const uniqueTrackers = Array.from(new Set(trackers));
  for (const tr of uniqueTrackers) {
    if (tr.trim()) {
      parts.push(`tr=${encodeURIComponent(tr.trim())}`);
    }
  }
  return `magnet:?${parts.join('&')}`;
}

/**
 * High-speed Public Tracker Presets for Optimizing Magnet Links
 */
export const POPULAR_TRACKERS = {
  best: [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.demonii.com:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://exodus.desync.com:6969/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://tracker.moeking.me:6969/announce',
    'udp://opentracker.i2p.rocks:6969/announce',
    'udp://open.demonii.com:1337/announce',
    'https://tracker.tamersrealm.com:443/announce',
    'udp://p4p.arenabg.com:1337/announce'
  ],
  all: [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.demonii.com:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://exodus.desync.com:6969/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://tracker.moeking.me:6969/announce',
    'udp://opentracker.i2p.rocks:6969/announce',
    'udp://tracker.tiny-vps.com:6969/announce',
    'udp://tracker.cyberia.is:6969/announce',
    'udp://ipv4.tracker.harry.lu:80/announce',
    'udp://p4p.arenabg.com:1337/announce',
    'udp://9.rarbg.com:2810/announce',
    'udp://tracker.openbittorrent.com:6969/announce',
    'https://tracker.tamersrealm.com:443/announce',
    'http://tracker.ren2.cn:6969/announce'
  ]
};
