import type { CrossSection, ManifoldToplevel, Vec2 } from 'manifold-3d';
import type { FrameProfile } from '../types/frame';

/**
 * Builds a 2D cross-section profile from profile points.
 * The profile is scaled to actual frame dimensions.
 *
 * Profile coordinate system:
 * - Input points are normalized 0-1
 * - X: 0 = inner edge, 1 = outer edge → scaled to frameWidth
 * - Y: 0 = bottom, 1 = top → scaled to frameDepth
 *
 * The resulting CrossSection is in the X-Y plane with:
 * - X: 0 to frameWidth (inner to outer)
 * - Y: 0 to frameDepth (bottom to top)
 */
export function buildProfileCrossSection(
  wasm: ManifoldToplevel,
  profile: FrameProfile,
  frameWidth: number,
  frameDepth: number,
  rabbetWidth: number,
  rabbetDepth: number
): CrossSection {
  // Scale normalized profile points to actual dimensions
  const scaledPoints: Vec2[] = profile.points.map((p) => [
    p.x * frameWidth,
    p.y * frameDepth,
  ]);

  // Create the main profile polygon
  // The profile points define the visible face shape
  // We need to add the rabbet cutout

  // Build the full profile including rabbet
  // The rabbet is a rectangular notch at the inner-bottom corner
  const fullProfile = buildProfileWithRabbet(
    scaledPoints,
    frameWidth,
    frameDepth,
    rabbetWidth,
    rabbetDepth
  );

  return new wasm.CrossSection([fullProfile]);
}

/**
 * Builds the complete profile polygon including the rabbet notch.
 * The rabbet is where the glass/picture sits.
 */
function buildProfileWithRabbet(
  profilePoints: Vec2[],
  frameWidth: number,
  frameDepth: number,
  rabbetWidth: number,
  rabbetDepth: number
): Vec2[] {
  // Start with the profile points (these define the top/face surface)
  // Profile typically goes from inner-top around to outer edge

  // For a simple approach, we'll construct a closed polygon:
  // 1. Start at inner edge, top of rabbet
  // 2. Follow profile points for the visible face
  // 3. Go down outer edge
  // 4. Go along bottom
  // 5. Add rabbet notch
  // 6. Back to start

  // First, find the starting and ending Y values of the profile
  // We assume profile points go roughly from inner to outer edge
  const innerX = 0;
  const outerX = frameWidth;

  // Start at inner edge, at the rabbet ledge level
  // The rabbet ledge is at Y = frameDepth - rabbetDepth
  const rabbetLedgeY = frameDepth - rabbetDepth;

  // Add the profile face points
  // These typically define the decorative top surface
  // We need to connect them properly to the frame structure

  // For now, let's use a simpler approach:
  // Build the cross-section as a rectangle with the rabbet cut out
  // Then the profile modifies the top surface

  // Actually, the profile points ARE the shape of the molding.
  // We need to:
  // 1. Use the profile as the visible outer contour
  // 2. Subtract a rabbet rectangle from the inner-bottom

  // Simplified approach: Build the base rectangle + profile top + rabbet

  // Base shape: outer rectangle
  const basePoints: Vec2[] = [
    [innerX, rabbetLedgeY],     // Inner edge at rabbet ledge
    [rabbetWidth, rabbetLedgeY], // Rabbet inner corner (horizontal)
    [rabbetWidth, frameDepth],   // Rabbet bottom corner
    // Now follow the profile along the top
  ];

  // Add scaled profile points for the top surface
  // Profile points should be sorted from inner to outer
  for (const p of profilePoints) {
    // Only add points that are past the rabbet area
    if (p[0] >= rabbetWidth || p[1] < frameDepth) {
      basePoints.push(p);
    }
  }

  // Make sure we have the outer edge covered
  // Find if we already have the outer-bottom corner
  const hasOuterBottom = basePoints.some(
    (p) => Math.abs(p[0] - outerX) < 0.001 && Math.abs(p[1]) < 0.001
  );

  if (!hasOuterBottom) {
    // Add outer edge points if needed
    const lastPoint = basePoints[basePoints.length - 1];
    if (lastPoint && Math.abs(lastPoint[0] - outerX) < 0.001) {
      // We're at outer X, go down to bottom
      basePoints.push([outerX, 0]);
    } else {
      // Need to go to outer edge
      basePoints.push([outerX, lastPoint ? lastPoint[1] : frameDepth]);
      basePoints.push([outerX, 0]);
    }
  }

  // Close along bottom back to inner edge
  basePoints.push([innerX, 0]);

  return basePoints;
}

/**
 * Builds a simpler rectangular profile with rabbet.
 * Used as fallback or for flat profile.
 */
export function buildSimpleProfile(
  wasm: ManifoldToplevel,
  frameWidth: number,
  frameDepth: number,
  rabbetWidth: number,
  rabbetDepth: number
): CrossSection {
  const rabbetLedgeY = frameDepth - rabbetDepth;

  // Simple rectangular frame cross-section with rabbet notch
  // Going counter-clockwise from inner-bottom
  const points: Vec2[] = [
    [0, 0],                      // Inner bottom
    [0, rabbetLedgeY],           // Inner edge up to rabbet ledge
    [rabbetWidth, rabbetLedgeY], // Rabbet ledge horizontal
    [rabbetWidth, frameDepth],   // Up to top at rabbet width
    [frameWidth, frameDepth],    // Along top to outer edge
    [frameWidth, 0],             // Down outer edge
  ];

  return new wasm.CrossSection([points]);
}
