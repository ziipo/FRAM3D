import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d';
import type { ComputedDimensions, FrameParams } from '../types/frame';

const SQRT2 = Math.sqrt(2);
const INV_SQRT2 = 1 / SQRT2;

export function buildFlatSegment(
  _wasm: ManifoldToplevel,
  profile: CrossSection,
  length: number
): Manifold {
  return profile.extrude(length);
}

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

/**
 * Applies a boolean stamp pattern along the length of a flat segment.
 * The segment is in build-space: X ∈ [0, frameWidth], Y ∈ [0, frameDepth], Z ∈ [0, length]
 * Stamps are placed on the front face (Y = frameDepth), centered in X.
 */
export function applyStampPattern(
  wasm: ManifoldToplevel,
  segment: Manifold,
  length: number,
  params: FrameParams
): Manifold {
  const { M, stampType, stampSpacing, stampDepth, stampPattern, frameWidth, frameDepth } = {
    M: wasm.Manifold,
    stampType: params.stampType,
    stampSpacing: params.stampSpacing,
    stampDepth: params.stampDepth,
    stampPattern: params.stampPattern,
    frameWidth: params.frameWidth,
    frameDepth: params.frameDepth,
  };

  if (!stampType || stampSpacing <= 0) return segment;

  const tool = createStampTool(wasm, stampType, frameWidth, stampDepth);
  if (!tool) return segment;

  const tools: Manifold[] = [];
  
  // Calculate how many stamps fit
  // We want to center the pattern along the length
  const numStamps = Math.floor(length / stampSpacing);
  if (numStamps === 0) {
    tool.delete();
    return segment;
  }

  const totalPatternLength = (numStamps - 1) * stampSpacing;
  const startZ = (length - totalPatternLength) / 2;

  for (let i = 0; i < numStamps; i++) {
    const zOffset = startZ + i * stampSpacing;
    let t = tool.translate([frameWidth / 2, frameDepth, zOffset]);
    
    // If alternating, rotate the tool 180 degrees around its local Y axis (which is normal to the surface)
    // Actually, local Y is depth. Let's rotate around Y axis (which points out of the frame).
    if (stampPattern === 'alternating' && i % 2 === 1) {
      // Rotate 180 around (frameWidth/2, frameDepth, zOffset)
      // Translate back to origin, rotate, translate back
      t = t.translate([-frameWidth / 2, -frameDepth, -zOffset])
           .rotate([0, 180, 0])
           .translate([frameWidth / 2, frameDepth, zOffset]);
    }
    
    tools.push(t);
  }

  // Combine all tools into a single union
  const unionTool = M.union(tools);
  
  // Subtract tools from segment
  const result = M.difference(segment, unionTool);

  // Cleanup
  tool.delete();
  unionTool.delete();
  for (const t of tools) {
    t.delete();
  }

  return result;
}

function createStampTool(
  wasm: ManifoldToplevel,
  type: string,
  frameWidth: number,
  depth: number
): Manifold | null {
  const M = wasm.Manifold;
  // Make the tool slightly deeper than needed so it cuts cleanly
  const cutDepth = depth + 0.1;
  const toolSize = frameWidth * 0.6; // Max width of stamp is 60% of frame width

  switch (type) {
    case 'dots': {
      // Cylinder centered at origin, pointing along Y
      // We want the base of the cylinder to be at Y = -depth, top at Y = 0.1
      // By default M.cylinder creates it along Z axis.
      // cylinder(height, radiusBottom, radiusTop, circularSegments)
      const radius = toolSize / 2;
      const cyl = M.cylinder(cutDepth, radius, radius, 32);
      // Center it: currently base is at Z=0, top at Z=cutDepth.
      // Center in X and Y, and make it point along Y axis
      return cyl
        .translate([0, 0, -cutDepth]) // Top is now at Z=0, bottom at Z=-cutDepth
        .rotate([-90, 0, 0]); // Rotates Z axis to Y axis. Top is at Y=0, bottom at Y=-cutDepth
    }
    case 'stripes': {
      // Rectangular notch across the width
      // width = toolSize, height = stampSpacing/3, depth = cutDepth
      const w = frameWidth * 0.8;
      const h = frameWidth * 0.15;
      const box = M.cube([w, cutDepth, h], true);
      // Box is centered. Top face is at Y = cutDepth/2.
      // We want top face at Y=0.
      return box.translate([0, -cutDepth / 2, 0]);
    }
    case 'chevrons': {
      // A V-shape. We can make a chevron by taking a larger box and subtracting a rotated box,
      // or by creating a 2D cross section and extruding it.
      const cs = wasm.CrossSection;
      // Chevron pointing along +Z.
      const halfW = toolSize / 2;
      const thick = toolSize * 0.3;
      // Path for chevron
      const pts = [
        [-halfW, -halfW],
        [0, 0],
        [halfW, -halfW],
        [halfW, -halfW + thick],
        [0, thick],
        [-halfW, -halfW + thick]
      ];
      // Create cross section from points
      const profile = cs.ofPolygons([pts.map(p => [p[0], p[1]] as [number, number])]);
      const extruded = profile.extrude(cutDepth);
      // Extruded is along Z axis. Base at Z=0, top at Z=cutDepth.
      // We want it along Y axis, pointing "down" into the frame.
      const res = extruded
        .translate([0, 0, -cutDepth])
        .rotate([-90, 0, 0]);
      profile.delete();
      return res;
    }
    default:
      return null;
  }
}
