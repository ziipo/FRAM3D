import type { CrossSection, ManifoldToplevel, Vec2 } from 'manifold-3d';
import type { FrameProfile } from '../types/frame';

/**
 * Builds a 2D cross-section polygon from profile data, including a rabbet notch.
 *
 * Profile coordinate system (normalized 0-1 in FrameProfile.points):
 *   X: 0 = inner edge, 1 = outer edge
 *   Y: 0 = bottom (back of frame), 1 = top (front face)
 *
 * Output cross-section coordinate system:
 *   X: 0 (inner) to frameWidth (outer)
 *   Y: 0 (bottom) to frameDepth (top)
 *
 * The polygon is constructed counter-clockwise (positive winding for Manifold):
 *   (frameWidth, 0) → [profile top-surface points, outer to inner] →
 *   (rabbetWidth, frameDepth) → (rabbetWidth, rabbetLedgeY) →
 *   (0, rabbetLedgeY) → (0, 0) → close
 */
export function buildProfileCrossSection(
  wasm: ManifoldToplevel,
  profile: FrameProfile,
  frameWidth: number,
  frameDepth: number,
  rabbetWidth: number,
  rabbetDepth: number
): CrossSection {
  const rabbetLedgeY = frameDepth - rabbetDepth;

  // Extract only the top-surface points from the profile.
  // Profile points define the full outline (top + sides + bottom).
  // The top-surface points are those that form the decorative face,
  // running from inner edge (x≈0) to outer edge (x≈1).
  const topPoints = extractTopSurface(profile.points);

  // Scale normalized top-surface points to actual dimensions
  const scaledTop: Vec2[] = topPoints.map((p) => [
    p.x * frameWidth,
    p.y * frameDepth,
  ]);

  // Filter to only points past the rabbet boundary (x >= rabbetWidth).
  // We'll connect from (rabbetWidth, frameDepth) to these points.
  const profilePoints: Vec2[] = scaledTop.filter(
    (p) => p[0] >= rabbetWidth - 0.001
  );

  // Reverse profile points so they go from outer (high x) to inner (low x).
  // This lets us build the polygon in CCW order (positive signed area).
  const profileReversed = [...profilePoints].reverse();

  // Build the closed polygon in counter-clockwise order.
  // CCW in standard 2D (Y-up): outer-bottom → outer-top → along top inward →
  // rabbet boundary → rabbet shelf → inner edge → inner-bottom → close
  const polygon: Vec2[] = [];

  // Start at outer-bottom corner
  polygon.push([frameWidth, 0]);

  // Add profile top-surface points from outer to inner (reversed)
  // First ensure we connect from outer edge to the first profile point
  if (profileReversed.length > 0) {
    const first = profileReversed[0];
    // If first reversed point isn't at outer edge, add outer-top connection
    if (Math.abs(first[0] - frameWidth) > 0.001) {
      polygon.push([frameWidth, first[1]]);
    }
    for (const p of profileReversed) {
      const last = polygon[polygon.length - 1];
      const dx = Math.abs(p[0] - last[0]);
      const dy = Math.abs(p[1] - last[1]);
      if (dx > 0.001 || dy > 0.001) {
        polygon.push(p);
      }
    }
  } else {
    // No profile points past rabbet — just go up outer edge
    polygon.push([frameWidth, frameDepth]);
  }

  // Connect from last profile point down to rabbet boundary top
  polygon.push([rabbetWidth, frameDepth]);

  // Rabbet shelf: go down to shelf level, then left to inner edge
  polygon.push([rabbetWidth, rabbetLedgeY]);
  polygon.push([0, rabbetLedgeY]);

  // Inner edge: go down to bottom
  polygon.push([0, 0]);

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
  points: { x: number; y: number }[]
): { x: number; y: number }[] {
  const top: { x: number; y: number }[] = [];

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
