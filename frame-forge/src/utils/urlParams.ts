import type { FrameParams, ProfilePoint } from '../types/frame';

/**
 * Encodes frame parameters to a compact URL hash.
 * Uses a shortened key format to keep URLs reasonably short.
 */
export function encodeParams(params: FrameParams): string {
  const data = {
    p: params.pictureSizeId,        // picture size
    cw: Math.round(params.customWidth * 10) / 10,  // custom width
    ch: Math.round(params.customHeight * 10) / 10, // custom height
    t: Math.round(params.tolerance * 10) / 10,     // tolerance
    fw: Math.round(params.frameWidth * 10) / 10,   // frame width
    fd: Math.round(params.frameDepth * 10) / 10,   // frame depth
    fs: params.frameStyle,          // frame style
    st: params.stampType,           // stamp type
    ss: Math.round(params.stampSpacing * 10) / 10, // stamp spacing
    sd: Math.round(params.stampDepth * 10) / 10,   // stamp depth
    sc: params.stampCornerStyle,    // stamp corner style
    sp: params.stampPattern,        // stamp pattern
    pr: params.profileId,           // profile
    rw: Math.round(params.rabbetWidth * 10) / 10,  // rabbet width
    rd: Math.round(params.rabbetDepth * 10) / 10,  // rabbet depth
    u: params.displayUnit,          // unit
    cp: params.profileId === 'custom'
      ? params.customProfilePoints.flatMap(p => [
          Math.round(p.x * 100) / 100,
          Math.round(p.y * 100) / 100,
          Math.round((p.hx ?? 0) * 100) / 100,
          Math.round((p.hy ?? 0) * 100) / 100,
        ])
      : undefined,                   // custom profile points (4 values per point: x, y, hx, hy)
  };

  // Convert to base64 for URL-safe encoding
  const json = JSON.stringify(data);
  const base64 = btoa(json);

  return base64;
}

/**
 * Decodes URL hash back to frame parameters.
 * Returns null if decoding fails.
 */
export function decodeParams(hash: string): Partial<FrameParams> | null {
  try {
    // Remove leading # if present
    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;

    if (!cleanHash) return null;

    const json = atob(cleanHash);
    const data = JSON.parse(json);

    const params: Partial<FrameParams> = {};

    if (data.p) params.pictureSizeId = data.p;
    if (typeof data.cw === 'number') params.customWidth = data.cw;
    if (typeof data.ch === 'number') params.customHeight = data.ch;
    if (typeof data.t === 'number') params.tolerance = data.t;
    if (typeof data.fw === 'number') params.frameWidth = data.fw;
    if (typeof data.fd === 'number') params.frameDepth = data.fd;
    if (data.fs === 'profile' || data.fs === 'stamp') params.frameStyle = data.fs;
    if (data.st) params.stampType = data.st;
    if (typeof data.ss === 'number') params.stampSpacing = data.ss;
    if (typeof data.sd === 'number') params.stampDepth = data.sd;
    if (data.sc === 'butt' || data.sc === 'cyclic') params.stampCornerStyle = data.sc;
    if (data.sp === 'repeating' || data.sp === 'alternating') params.stampPattern = data.sp;
    if (data.pr) params.profileId = data.pr;
    if (typeof data.rw === 'number') params.rabbetWidth = data.rw;
    if (typeof data.rd === 'number') params.rabbetDepth = data.rd;
    if (data.u === 'mm' || data.u === 'in') params.displayUnit = data.u;

    // Deserialize custom profile points
    // New format: 4 values per point (x, y, hx, hy); old format: 2 per point (x, y)
    if (Array.isArray(data.cp) && data.cp.length >= 4) {
      const points: ProfilePoint[] = [];
      const stride = data.cp.length % 4 === 0 ? 4 : 2;
      for (let i = 0; i + stride - 1 < data.cp.length; i += stride) {
        const x = Number(data.cp[i]);
        const y = Number(data.cp[i + 1]);
        if (isNaN(x) || isNaN(y)) continue;
        const pt: ProfilePoint = {
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
        };
        if (stride === 4) {
          const hx = Number(data.cp[i + 2]);
          const hy = Number(data.cp[i + 3]);
          if (!isNaN(hx) && hx !== 0) pt.hx = hx;
          if (!isNaN(hy) && hy !== 0) pt.hy = hy;
        }
        points.push(pt);
      }
      if (points.length >= 2) {
        params.customProfilePoints = points;
      }
    }

    return params;
  } catch {
    console.warn('Failed to decode URL parameters');
    return null;
  }
}

/**
 * Updates the URL hash with current parameters.
 */
export function updateUrlHash(params: FrameParams): void {
  const hash = encodeParams(params);
  // Use replaceState to avoid polluting browser history
  window.history.replaceState(null, '', `#${hash}`);
}

/**
 * Gets parameters from the current URL hash.
 */
export function getParamsFromUrl(): Partial<FrameParams> | null {
  return decodeParams(window.location.hash);
}

/**
 * Creates a shareable URL with the given parameters.
 */
export function createShareUrl(params: FrameParams): string {
  const hash = encodeParams(params);
  return `${window.location.origin}${window.location.pathname}#${hash}`;
}
