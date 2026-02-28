import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d';

/**
 * Builds a single frame segment by extruding a profile along a length,
 * then cutting 45-degree miters at both ends.
 *
 * The segment is created in a standard orientation:
 * - Profile is in X-Y plane (X = across width, Y = depth/height)
 * - Extrusion is along Z-axis (segment length)
 * - After creation, segment can be rotated/translated into position
 */
export function buildFrameSegment(
  wasm: ManifoldToplevel,
  profile: CrossSection,
  length: number,
  miterStart: boolean = true,
  miterEnd: boolean = true
): Manifold {
  // Extrude the profile along Z axis
  let segment = profile.extrude(length);

  // Apply miter cuts at 45 degrees
  // Miter cut at start (Z = 0)
  if (miterStart) {
    segment = miterCutStart(wasm, segment, length);
  }

  // Miter cut at end (Z = length)
  if (miterEnd) {
    segment = miterCutEnd(wasm, segment, length);
  }

  return segment;
}

/**
 * Cuts the segment at a 45-degree angle at the start (Z=0).
 * The cut plane goes from outer-bottom at Z=0 to inner-bottom at Z=frameWidth
 */
function miterCutStart(
  _wasm: ManifoldToplevel,
  segment: Manifold,
  _length: number
): Manifold {
  // For a 45° miter at the start, we trim by a plane
  // Normal pointing toward positive Z, angled 45° from the XY plane
  // The plane passes through the origin and cuts diagonally

  // trimByPlane(normal, originOffset)
  // Normal = direction to KEEP (material on this side is kept)

  // For start miter: we want to keep material where Z > X (roughly)
  // Normal should point in the direction we want to keep
  // A 45° cut at start: normal = [1, 0, 1] normalized, cuts from outer edge

  // Actually for picture frames, the miter is typically at 45° in the XZ plane
  // The cut removes material at the "inner" corner where segments meet

  // Let's think about this differently:
  // - The segment runs along Z
  // - The profile's X=0 is the inner edge, X=frameWidth is outer edge
  // - At a corner, two segments meet with their inner edges touching
  // - The 45° cut should be perpendicular to the miter joint line

  // For a standard miter joint at the start:
  // - Cut plane normal: pointing into the segment (positive Z) but angled
  // - We want to remove the "wedge" at the inner corner

  // Using trimByPlane: keeps everything on the positive side of the plane
  // Plane defined by normal and originOffset

  // 45° miter at Z=0, cutting from inner edge:
  // Normal = [-1, 0, -1] normalized = toward negative X and Z
  // But we want to KEEP material, so normal points AWAY from what we cut
  // Normal = [1, 0, 1] normalized

  const normal: [number, number, number] = [1, 0, 1];
  const mag = Math.sqrt(2);
  const normalizedNormal: [number, number, number] = [
    normal[0] / mag,
    normal[1] / mag,
    normal[2] / mag,
  ];

  // Origin offset: the plane passes through the origin, so offset = 0
  return segment.trimByPlane(normalizedNormal, 0);
}

/**
 * Cuts the segment at a 45-degree angle at the end (Z=length).
 */
function miterCutEnd(
  _wasm: ManifoldToplevel,
  segment: Manifold,
  length: number
): Manifold {
  // For end miter: similar to start but at the other end
  // The cut should mirror the start cut

  // Normal pointing toward negative Z but angled for 45° cut
  // Normal = [1, 0, -1] normalized

  const normal: [number, number, number] = [1, 0, -1];
  const mag = Math.sqrt(2);
  const normalizedNormal: [number, number, number] = [
    normal[0] / mag,
    normal[1] / mag,
    normal[2] / mag,
  ];

  // Origin offset: plane should pass through (0, 0, length)
  // For trimByPlane, offset is the distance from origin along the normal
  // offset = dot(point_on_plane, normal)
  // Point on plane = (0, 0, length)
  // offset = 0 * (1/√2) + 0 * 0 + length * (-1/√2) = -length/√2

  const offset = (length * -1) / mag;

  return segment.trimByPlane(normalizedNormal, offset);
}

/**
 * Positions a segment for the top edge of the frame.
 * The frame is centered at origin with picture opening in the XY plane.
 */
export function positionTopSegment(
  segment: Manifold,
  innerWidth: number,
  innerHeight: number,
  frameWidth: number
): Manifold {
  // Top segment runs along the top edge of the frame
  // After extrusion, segment is along Z axis
  // We need to rotate and translate it to the top position

  // Rotate -90° around X to lay it flat (Z -> Y)
  // Then rotate 180° around Z to flip it
  // Then translate to position

  return segment
    .rotate([90, 0, 0])       // Rotate to lay flat, extrusion now along -Y
    .rotate([0, 0, 180])      // Flip so inner edge faces down
    .translate([
      -innerWidth / 2 - frameWidth,
      innerHeight / 2,
      0,
    ]);
}

/**
 * Positions a segment for the bottom edge of the frame.
 */
export function positionBottomSegment(
  segment: Manifold,
  innerWidth: number,
  innerHeight: number,
  frameWidth: number
): Manifold {
  return segment
    .rotate([90, 0, 0])
    .translate([
      -innerWidth / 2 - frameWidth,
      -innerHeight / 2 - frameWidth,
      0,
    ]);
}

/**
 * Positions a segment for the left edge of the frame.
 */
export function positionLeftSegment(
  segment: Manifold,
  innerWidth: number,
  innerHeight: number,
  frameWidth: number
): Manifold {
  return segment
    .rotate([90, 0, 0])
    .rotate([0, 0, 90])       // Rotate to run vertically
    .translate([
      -innerWidth / 2 - frameWidth,
      -innerHeight / 2 - frameWidth,
      0,
    ]);
}

/**
 * Positions a segment for the right edge of the frame.
 */
export function positionRightSegment(
  segment: Manifold,
  innerWidth: number,
  innerHeight: number,
  _frameWidth: number
): Manifold {
  return segment
    .rotate([90, 0, 0])
    .rotate([0, 0, -90])      // Rotate to run vertically (opposite direction)
    .translate([
      innerWidth / 2,
      innerHeight / 2,
      0,
    ]);
}
