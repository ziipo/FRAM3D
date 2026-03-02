/**
 * Minimal STORE-only ZIP archive writer.
 * No compression (STORE method) — valid for 3MF files.
 */

interface ZipEntry {
  filename: string;
  data: Uint8Array;
}

/** CRC-32 lookup table */
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeString(view: DataView, offset: number, str: string): number {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
  return str.length;
}

export function createZipArchive(entries: ZipEntry[]): ArrayBuffer {
  // Calculate total size
  // Local file header: 30 + filename length + data length per entry
  // Central directory: 46 + filename length per entry
  // End of central directory: 22

  let totalSize = 22; // EOCD
  for (const entry of entries) {
    const nameLen = entry.filename.length;
    totalSize += 30 + nameLen + entry.data.length; // local header + data
    totalSize += 46 + nameLen; // central directory entry
  }

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  const localOffsets: number[] = [];

  // Write local file headers + data
  for (const entry of entries) {
    localOffsets.push(offset);
    const crc = crc32(entry.data);
    const nameLen = entry.filename.length;
    const size = entry.data.length;

    // Local file header signature
    view.setUint32(offset, 0x04034b50, true); offset += 4;
    // Version needed
    view.setUint16(offset, 20, true); offset += 2;
    // General purpose bit flag
    view.setUint16(offset, 0, true); offset += 2;
    // Compression method (0 = STORE)
    view.setUint16(offset, 0, true); offset += 2;
    // Last mod time
    view.setUint16(offset, 0, true); offset += 2;
    // Last mod date
    view.setUint16(offset, 0, true); offset += 2;
    // CRC-32
    view.setUint32(offset, crc, true); offset += 4;
    // Compressed size
    view.setUint32(offset, size, true); offset += 4;
    // Uncompressed size
    view.setUint32(offset, size, true); offset += 4;
    // Filename length
    view.setUint16(offset, nameLen, true); offset += 2;
    // Extra field length
    view.setUint16(offset, 0, true); offset += 2;
    // Filename
    offset += writeString(view, offset, entry.filename);
    // File data
    const dst = new Uint8Array(buffer, offset, size);
    dst.set(entry.data);
    offset += size;
  }

  // Write central directory
  const cdStart = offset;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const crc = crc32(entry.data);
    const nameLen = entry.filename.length;
    const size = entry.data.length;

    // Central directory header signature
    view.setUint32(offset, 0x02014b50, true); offset += 4;
    // Version made by
    view.setUint16(offset, 20, true); offset += 2;
    // Version needed
    view.setUint16(offset, 20, true); offset += 2;
    // General purpose bit flag
    view.setUint16(offset, 0, true); offset += 2;
    // Compression method (0 = STORE)
    view.setUint16(offset, 0, true); offset += 2;
    // Last mod time
    view.setUint16(offset, 0, true); offset += 2;
    // Last mod date
    view.setUint16(offset, 0, true); offset += 2;
    // CRC-32
    view.setUint32(offset, crc, true); offset += 4;
    // Compressed size
    view.setUint32(offset, size, true); offset += 4;
    // Uncompressed size
    view.setUint32(offset, size, true); offset += 4;
    // Filename length
    view.setUint16(offset, nameLen, true); offset += 2;
    // Extra field length
    view.setUint16(offset, 0, true); offset += 2;
    // File comment length
    view.setUint16(offset, 0, true); offset += 2;
    // Disk number start
    view.setUint16(offset, 0, true); offset += 2;
    // Internal file attributes
    view.setUint16(offset, 0, true); offset += 2;
    // External file attributes
    view.setUint32(offset, 0, true); offset += 4;
    // Relative offset of local header
    view.setUint32(offset, localOffsets[i], true); offset += 4;
    // Filename
    offset += writeString(view, offset, entry.filename);
  }

  const cdSize = offset - cdStart;

  // End of central directory record
  view.setUint32(offset, 0x06054b50, true); offset += 4;
  // Disk number
  view.setUint16(offset, 0, true); offset += 2;
  // Disk with central directory
  view.setUint16(offset, 0, true); offset += 2;
  // Number of entries on this disk
  view.setUint16(offset, entries.length, true); offset += 2;
  // Total entries
  view.setUint16(offset, entries.length, true); offset += 2;
  // Size of central directory
  view.setUint32(offset, cdSize, true); offset += 4;
  // Offset of central directory
  view.setUint32(offset, cdStart, true); offset += 4;
  // Comment length
  view.setUint16(offset, 0, true); offset += 2;

  return buffer;
}
