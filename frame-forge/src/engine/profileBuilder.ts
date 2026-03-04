import type { CrossSection, ManifoldToplevel, Vec2 } from 'manifold-3d';
import type { FrameProfile, ProfilePoint } from '../types/frame';

/**
 * Builds a 2D cross-section polygon from profile data, including a rabbet notch.
 *
 * Profile coordinate system (normalized 0-1 in FrameProfile.points):
 *   X: 0 = inner edge, 1 = outer edge
 *   Y: 0 = bottom (back of frame), 1 = top (front face)
 *
 * Output cross-section coordinate system:
 *   X: 0 (inner) to frameWidth (outer)
 *   Y: 0 (back/bottom) to frameDepth (front/top)
 *
 * The rabbet notch is at the BACK (low Y) on the inner edge:
 *   (0, rabbetDepth) → (rabbetWidth, rabbetDepth) → (rabbetWidth, 0)
 *
 * The profile top surface is at the FRONT (high Y):
 *   Decorative face from inner to outer at Y near frameDepth
 *
 * The polygon is constructed counter-clockwise (positive winding for Manifold).
 */
export function buildProfileCrossSection(
  wasm: ManifoldToplevel,
  profile: FrameProfile,
  frameWidth: number,
  frameDepth: number,
  rabbetWidth: number,
  rabbetDepth: number
): CrossSection {
  // Extract only the top-surface points from the profile.
  const topPoints = extractTopSurface(profile.points);

  // Tessellate Bezier curves into polyline segments
  const tessellated = tessellateProfile(topPoints);

  // Scale normalized top-surface points to actual dimensions
  const scaledTop: Vec2[] = tessellated.map((p) => [
    p.x * frameWidth,
    p.y * frameDepth,
  ]);

  // Filter to only points past the rabbet boundary (x >= rabbetWidth).
  const profilePoints: Vec2[] = scaledTop.filter(
    (p) => p[0] >= rabbetWidth - 0.001
  );

  // Build the closed polygon in counter-clockwise order.
  // CCW in standard 2D (Y-up):
  //   outer-bottom → outer-top → [profile points, outer to inner] →
  //   inner-top → rabbet back wall → rabbet shelf → inner-bottom → close
  const polygon: Vec2[] = [];

  // Start at outer-back corner
  polygon.push([frameWidth, 0]);

  // Up the outer edge to the outer-front corner
  // Find the outermost profile point's Y to connect properly
  const outerProfileY = profilePoints.length > 0
    ? profilePoints[profilePoints.length - 1][1]
    : frameDepth;
  polygon.push([frameWidth, outerProfileY]);

  // Profile top-surface points from outer to inner (reversed for CCW)
  const profileReversed = [...profilePoints].reverse();
  for (const p of profileReversed) {
    const last = polygon[polygon.length - 1];
    const dx = Math.abs(p[0] - last[0]);
    const dy = Math.abs(p[1] - last[1]);
    if (dx > 0.001 || dy > 0.001) {
      polygon.push(p);
    }
  }

  // From innermost profile point, go up to full height at inner edge
  // (profile starts at x≈rabbetWidth after filtering)
  // Then the rabbet: notch cut into the BACK (low Y) of the inner edge
  polygon.push([0, frameDepth]);          // Inner edge, front face
  polygon.push([0, rabbetDepth]);         // Inner edge, down to rabbet shelf
  polygon.push([rabbetWidth, rabbetDepth]); // Rabbet shelf, horizontal
  polygon.push([rabbetWidth, 0]);          // Rabbet back wall, down to back

  // Close back to outer-back corner (implicit, but ensure no gap)

  // Deduplicate consecutive points that are too close
  const cleaned: Vec2[] = [polygon[0]];
  for (let i = 1; i < polygon.length; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = polygon[i];
    if (Math.abs(curr[0] - prev[0]) > 0.001 || Math.abs(curr[1] - prev[1]) > 0.001) {
      cleaned.push(curr);
    }
  }

  return new wasm.CrossSection([cleaned]);
}

/**
 * Builds a simple rectangular cross-section.
 */
export function buildRectangularCrossSection(
  wasm: ManifoldToplevel,
  width: number,
  depth: number
): CrossSection {
  const polygon: Vec2[] = [
    [0, 0],
    [width, 0],
    [width, depth],
    [0, depth],
  ];
  return new wasm.CrossSection([polygon]);
}

/**
 * Returns true if a point has a non-zero Bezier handle.
 */
function hasHandle(p: ProfilePoint): boolean {
  return (p.hx != null && p.hx !== 0) || (p.hy != null && p.hy !== 0);
}

/**
 * Tessellates a sequence of ProfilePoints into a polyline,
 * converting Bezier handle pairs into cubic curve subdivisions.
 *
 * For each consecutive pair P0→P1:
 * - If neither has a handle: straight segment (just emit P1)
 * - If either/both have handles: cubic Bezier with SUBDIVISIONS steps
 *   cp1 = P0 + (hx, hy)       — out-handle of P0
 *   cp2 = P1 + (-hx, -hy)     — in-handle of P1 (mirrored)
 */
const BEZIER_SUBDIVISIONS = 10;

export function tessellateProfile(points: ProfilePoint[]): { x: number; y: number }[] {
  if (points.length < 2) return points.map(p => ({ x: p.x, y: p.y }));

  const result: { x: number; y: number }[] = [{ x: points[0].x, y: points[0].y }];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    if (!hasHandle(p0) && !hasHandle(p1)) {
      // Straight segment
      result.push({ x: p1.x, y: p1.y });
    } else {
      // Cubic Bezier
      const cp1x = p0.x + (p0.hx ?? 0);
      const cp1y = p0.y + (p0.hy ?? 0);
      const cp2x = p1.x - (p1.hx ?? 0);
      const cp2y = p1.y - (p1.hy ?? 0);

      for (let s = 1; s <= BEZIER_SUBDIVISIONS; s++) {
        const t = s / BEZIER_SUBDIVISIONS;
        const mt = 1 - t;
        const x = mt * mt * mt * p0.x + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * p1.x;
        const y = mt * mt * mt * p0.y + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * p1.y;
        result.push({ x, y });
      }
    }
  }

  return result;
}

/**
 * Extracts the top-surface points from a profile's point array.
 *
 * Profile points define the full outline of the molding cross-section.
 * The top surface runs from the inner edge (x≈0) to the outer edge (x≈1),
 * with varying Y values that create the decorative shape.
 *
 * We identify top-surface points as those that run left-to-right (increasing X)
 * before hitting the bottom edge (y≈0). This skips the bottom/side closing points.
 */
function extractTopSurface(
  points: ProfilePoint[]
): ProfilePoint[] {
  const top: ProfilePoint[] = [];

  for (const p of points) {
    // Stop when we hit the bottom edge (outer-bottom or inner-bottom)
    if (p.y < 0.01 && top.length > 0) {
      break;
    }
    // Only include points that are part of the top surface (y > 0)
    if (p.y >= 0.01 || top.length === 0) {
      top.push(p);
    }
  }

  return top;
}
