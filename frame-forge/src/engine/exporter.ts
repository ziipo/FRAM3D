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
  const w = Math.round(pictureWidth);
  const h = Math.round(pictureHeight);
  const profile = profileName.toLowerCase().replace(/\s+/g, '-');
  const filename = `frame-${w}x${h}-${profile}.stl`;

  downloadBlob(stlData, filename, 'application/sla');
}

/**
 * Downloads 3MF data with a formatted filename.
 */
export function download3MF(
  threemfData: ArrayBuffer,
  pictureWidth: number,
  pictureHeight: number,
  profileName: string
): void {
  const w = Math.round(pictureWidth);
  const h = Math.round(pictureHeight);
  const profile = profileName.toLowerCase().replace(/\s+/g, '-');
  const filename = `frame-${w}x${h}-${profile}.3mf`;

  downloadBlob(threemfData, filename, 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml');
}

/**
 * Downloads split export ZIP data with a formatted filename.
 */
export function downloadSplitZip(
  zipData: ArrayBuffer,
  pictureWidth: number,
  pictureHeight: number,
  profileName: string,
  format?: string
): void {
  const w = Math.round(pictureWidth);
  const h = Math.round(pictureHeight);
  const profile = profileName.toLowerCase().replace(/\s+/g, '-');
  const formatSuffix = format ? `-${format}` : '';
  const filename = `frame-${w}x${h}-${profile}-split${formatSuffix}.zip`;

  downloadBlob(zipData, filename, 'application/zip');
}
