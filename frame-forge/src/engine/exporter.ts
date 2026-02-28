/**
 * Downloads binary data as a file.
 */
export function downloadBlob(
  data: ArrayBuffer | Blob,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads STL data with a formatted filename.
 */
export function downloadSTL(
  stlData: ArrayBuffer,
  pictureWidth: number,
  pictureHeight: number,
  profileName: string
): void {
  // Format dimensions for filename
  const w = Math.round(pictureWidth);
  const h = Math.round(pictureHeight);
  const profile = profileName.toLowerCase().replace(/\s+/g, '-');
  const filename = `frame-${w}x${h}-${profile}.stl`;

  downloadBlob(stlData, filename, 'application/sla');
}

/**
 * Generates a 3MF file from mesh data.
 * 3MF is a ZIP archive containing XML files and mesh data.
 */
export async function generate3MF(
  _positions: Float32Array,
  _indices: Uint32Array
): Promise<ArrayBuffer> {
  // 3MF is more complex - it's a ZIP containing XML files
  // For now, we'll implement a minimal version

  // The 3MF structure:
  // [Content_Types].xml
  // _rels/.rels
  // 3D/3dmodel.model

  // This is a simplified implementation
  // A full implementation would use JSZip or similar

  // For MVP, we'll focus on STL which is simpler and widely supported
  // 3MF support can be added later with a proper ZIP library

  console.warn('3MF export not yet implemented, falling back to STL');
  throw new Error('3MF export not yet implemented');
}
