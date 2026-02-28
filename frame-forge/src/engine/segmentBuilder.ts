import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d';
import type { ComputedDimensions, FrameParams } from '../types/frame';

const SQRT2 = Math.sqrt(2);
const INV_SQRT2 = 1 / SQRT2;

/**
 * Builds a single frame segment by extruding a profile cross-section
 * along the Z-axis, then applying 45° miter cuts at both ends.
 *
 * Build-space coordinates:
 *   X: [0, frameWidth]  — inner edge at 0, outer edge at frameWidth
 *   Y: [0, frameDepth]  — back at 0, front at frameDepth
 *   Z: [0, length]      — extrusion axis
 *
 * The miters cut from the INNER edge (x=0), leaving the outer edge (x=frameWidth)
 * at full length so that outer corners meet at 90°:
 *   At X=0 (inner):          shortened [frameWidth, length - frameWidth]
 *   At X=frameWidth (outer): full length [0, length]
 */
export function buildFrameSegment(
  _wasm: ManifoldToplevel,
  profile: CrossSection,
  length: number,
  frameWidth: number
): Manifold {
  let segment = profile.extrude(length);

  // Start miter (z=0 end): keep x + z ≥ frameWidth
  // At outer edge (x=frameWidth): keeps z ≥ 0 (full length)
  // At inner edge (x=0): keeps z ≥ frameWidth (45° cut)
  segment = segment.trimByPlane([INV_SQRT2, 0, INV_SQRT2], frameWidth / SQRT2);

  // End miter (z=length end): keep x + z ≤ length
  // At outer edge (x=frameWidth): keeps z ≤ length - frameWidth... wait
  // We want: at outer (x=fW), keep z ≤ length; at inner (x=0), keep z ≤ length - fW
  // That's: keep (length - fW) - z + x ≥ 0 → keep x - z ≥ fW - length
  // Normal [1/√2, 0, -1/√2], offset (fW - length)/√2
  segment = segment.trimByPlane(
    [INV_SQRT2, 0, -INV_SQRT2],
    (frameWidth - length) / SQRT2
  );

  return segment;
}

/**
 * All segments share a base rotation: Ry(-90°) then Rx(90°).
 * This maps build-space → world-space as:
 *   (bx, by, bz) → (-bz, -bx, by)
 *
 * World frame: centered at origin, picture opening in XY plane,
 * depth along Z (front at +Z, back at -Z).
 *
 * Each side adds an additional Z-rotation and translation.
 */

/** Bottom segment: runs along X, inner edge faces +Y (toward center). */
export function positionBottomSegment(
  segment: Manifold,
  dims: ComputedDimensions,
  params: FrameParams
): Manifold {
  // Base maps: X=-bz, Y=-bx, Z=by
  // After: X ∈ [-oW, 0], Y ∈ [-fW, 0], Z ∈ [0, fD]
  return segment
    .rotate([0, -90, 0])
    .rotate([90, 0, 0])
    .translate([
      dims.outerWidth / 2,
      -dims.innerHeight / 2,
      -params.frameDepth / 2,
    ]);
}

/** Top segment: runs along -X, inner edge faces -Y (toward center). */
export function positionTopSegment(
  segment: Manifold,
  dims: ComputedDimensions,
  params: FrameParams
): Manifold {
  // Base + Rz(180): X=bz, Y=bx, Z=by
  // After: X ∈ [0, oW], Y ∈ [0, fW], Z ∈ [0, fD]
  return segment
    .rotate([0, -90, 0])
    .rotate([90, 0, 0])
    .rotate([0, 0, 180])
    .translate([
      -dims.outerWidth / 2,
      dims.innerHeight / 2,
      -params.frameDepth / 2,
    ]);
}

/** Left segment: runs along +Y, inner edge faces +X (toward center). */
export function positionLeftSegment(
  segment: Manifold,
  dims: ComputedDimensions,
  params: FrameParams
): Manifold {
  // Base + Rz(-90): X=-bx, Y=bz, Z=by
  // After: X ∈ [-fW, 0], Y ∈ [0, oH], Z ∈ [0, fD]
  return segment
    .rotate([0, -90, 0])
    .rotate([90, 0, 0])
    .rotate([0, 0, -90])
    .translate([
      -dims.innerWidth / 2,
      -dims.outerHeight / 2,
      -params.frameDepth / 2,
    ]);
}

/** Right segment: runs along -Y, inner edge faces -X (toward center). */
export function positionRightSegment(
  segment: Manifold,
  dims: ComputedDimensions,
  params: FrameParams
): Manifold {
  // Base + Rz(90): X=bx, Y=-bz, Z=by
  // After: X ∈ [0, fW], Y ∈ [-oH, 0], Z ∈ [0, fD]
  return segment
    .rotate([0, -90, 0])
    .rotate([90, 0, 0])
    .rotate([0, 0, 90])
    .translate([
      dims.innerWidth / 2,
      dims.outerHeight / 2,
      -params.frameDepth / 2,
    ]);
}
