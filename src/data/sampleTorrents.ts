import { parseTorrent, ParsedTorrent } from '../lib/torrentParser';

/**
 * Pre-constructed sample torrent bencoded buffers for quick 1-click testing
 */

// Helper to construct a minimal bencoded Uint8Array for testing
function createSampleTorrentBuffer(
  name: string,
  length: number,
  trackers: string[],
  comment: string
): Uint8Array {
  // We'll create a valid bencoded structure
  // d8:announce...7:comment...4:infod6:lengthi...e4:name...12:piece lengthi262144e6:pieces20:...ee
  const announce = trackers[0] || 'udp://tracker.opentrackr.org:1337/announce';
  
  // Create 20 bytes dummy pieces hash (SHA-1 length)
  const dummyPiecesHex = '1234567890123456789012345678901234567890';
  const piecesBytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    piecesBytes[i] = parseInt(dummyPiecesHex.substring(i * 2, i * 2 + 2), 16);
  }

  // Construct bencode string parts
  const textEncoder = new TextEncoder();
  
  const announceBencoded = `8:announce${announce.length}:${announce}`;
  const commentBencoded = `7:comment${comment.length}:${comment}`;
  const createdByBencoded = `10:created by22:TorrentMagnetParser/1.0`;
  const creationDateBencoded = `13:creation datei1715000000e`;

  // Announce list
  let announceListBencoded = `13:announce-listl`;
  for (const tr of trackers) {
    announceListBencoded += `l${tr.length}:${tr}e`;
  }
  announceListBencoded += `e`;

  // Info dict
  const infoNameBencoded = `4:name${name.length}:${name}`;
  const infoLengthBencoded = `6:lengthi${length}e`;
  const infoPieceLengthBencoded = `12:piece lengthi1048576e`; // 1MB
  
  const piecesHeaderStr = `6:pieces20:`;
  const piecesHeaderBytes = textEncoder.encode(piecesHeaderStr);

  const infoDictHeaderBytes = textEncoder.encode(`4:infod${infoLengthBencoded}${infoNameBencoded}${infoPieceLengthBencoded}`);
  const infoDictFooterBytes = textEncoder.encode(`e`);

  const outerHeaderBytes = textEncoder.encode(`d${announceBencoded}${announceListBencoded}${commentBencoded}${createdByBencoded}${creationDateBencoded}`);
  const outerFooterBytes = textEncoder.encode(`e`);

  const totalLen = outerHeaderBytes.length + 
                   infoDictHeaderBytes.length + 
                   piecesHeaderBytes.length + 
                   20 + 
                   infoDictFooterBytes.length + 
                   outerFooterBytes.length;

  const result = new Uint8Array(totalLen);
  let pos = 0;

  result.set(outerHeaderBytes, pos);
  pos += outerHeaderBytes.length;

  result.set(infoDictHeaderBytes, pos);
  pos += infoDictHeaderBytes.length;

  result.set(piecesHeaderBytes, pos);
  pos += piecesHeaderBytes.length;

  result.set(piecesBytes, pos);
  pos += 20;

  result.set(infoDictFooterBytes, pos);
  pos += infoDictFooterBytes.length;

  result.set(outerFooterBytes, pos);
  pos += outerFooterBytes.length;

  return result;
}

export interface SampleTorrent {
  title: string;
  description: string;
  category: string;
  buffer: Uint8Array;
}

export const SAMPLE_TORRENTS: SampleTorrent[] = [
  {
    title: 'Ubuntu 24.04 LTS Desktop (64-bit ISO)',
    description: '官方 Linux 发行版镜像，包含 Desktop 安装环境',
    category: '操作系统',
    buffer: createSampleTorrentBuffer(
      'ubuntu-24.04-desktop-amd64.iso',
      6234562048, // ~5.8 GB
      [
        'https://torrent.ubuntu.com/announce',
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://open.demonii.com:1337/announce'
      ],
      'Ubuntu 24.04 LTS (Noble Numbat) Official Release'
    )
  },
  {
    title: 'Big Buck Bunny 4K 60fps (Open Movie Project)',
    description: '开源 4K 极清动画短片电影',
    category: '高清影视',
    buffer: createSampleTorrentBuffer(
      'Big_Buck_Bunny_4K_60fps_HDR.mkv',
      2849501220, // ~2.65 GB
      [
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://tracker.moeking.me:6969/announce',
        'udp://open.stealth.si:80/announce'
      ],
      'Blender Open Movie Project 4K Ultra HD Release'
    )
  },
  {
    title: 'Arch Linux 2026.07.01 Dual Architecture',
    description: '轻量级 Linux 发行版滚动更新安装文件',
    category: '软件开发',
    buffer: createSampleTorrentBuffer(
      'archlinux-2026.07.01-x86_64.iso',
      1124501200, // ~1.05 GB
      [
        'http://tracker.archlinux.org:6969/announce',
        'udp://tracker.opentrackr.org:1337/announce'
      ],
      'Arch Linux Official Monthly Release'
    )
  }
];
