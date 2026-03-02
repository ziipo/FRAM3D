import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import type { FrameParams, ComputedDimensions, ConnectorSettings } from '../types/frame';
import { computeDimensions } from './frameGenerator';
import { getProfileForParams } from '../data/profiles';
import { buildProfileCrossSection } from './profileBuilder';
import {
  buildFrameSegment,
  positionBottomSegment,
  positionTopSegment,
  positionLeftSegment,
  positionRightSegment,
} from './segmentBuilder';

export interface SplitPlan {
  bottom: boolean;
  top: boolean;
  left: boolean;
  right: boolean;
}

export interface SplitPart {
  name: string;
  manifold: Manifold;
}

/**
 * Determine which sides need splitting based on build plate size.
 * A part can be rotated on the plate, so we compare against the longest plate dimension.
 */
export function computeSplitPlan(
  dims: ComputedDimensions,
  plateWidth: number,
  plateDepth: number
): SplitPlan {
  const maxPlate = Math.max(plateWidth, plateDepth);

  return {
    bottom: dims.outerWidth > maxPlate,
    top: dims.outerWidth > maxPlate,
    left: dims.outerHeight > maxPlate,
    right: dims.outerHeight > maxPlate,
  };
}

/**
 * Build individual frame sides and split oversized ones for build plate fitting.
 * Returns an array of named parts ready for STL export.
 */
export function splitFrameForExport(
  wasm: ManifoldToplevel,
  params: FrameParams,
  plateWidth: number,
  plateDepth: number,
  connector: ConnectorSettings
): { parts: SplitPart[]; splitInfo: SplitPlan & { totalParts: number } } {
  const dims = computeDimensions(params);
  const plan = computeSplitPlan(dims, plateWidth, plateDepth);
  const profile = getProfileForParams(params);

  // Build the 2D cross-section
  const crossSection = buildProfileCrossSection(
    wasm,
    profile,
    params.frameWidth,
    params.frameDepth,
    params.rabbetWidth,
    params.rabbetDepth
  );

  const fw = params.frameWidth;

  // Build and position each side individually
  const bottomRaw = buildFrameSegment(wasm, crossSection, dims.outerWidth, fw);
  const topRaw = buildFrameSegment(wasm, crossSection, dims.outerWidth, fw);
  const leftRaw = buildFrameSegment(wasm, crossSection, dims.outerHeight, fw);
  const rightRaw = buildFrameSegment(wasm, crossSection, dims.outerHeight, fw);

  const bottomSide = positionBottomSegment(bottomRaw, dims, params);
  const topSide = positionTopSegment(topRaw, dims, params);
  const leftSide = positionLeftSegment(leftRaw, dims, params);
  const rightSide = positionRightSegment(rightRaw, dims, params);

  const parts: SplitPart[] = [];

  // Process each side: split if needed, otherwise export whole
  processSide(wasm, bottomSide, 'bottom', plan.bottom, 'x', dims, params, connector, parts);
  processSide(wasm, topSide, 'top', plan.top, 'x', dims, params, connector, parts);
  processSide(wasm, leftSide, 'left', plan.left, 'y', dims, params, connector, parts);
  processSide(wasm, rightSide, 'right', plan.right, 'y', dims, params, connector, parts);

  // Clean up
  crossSection.delete();
  bottomRaw.delete();
  topRaw.delete();
  leftRaw.delete();
  rightRaw.delete();
  bottomSide.delete();
  topSide.delete();
  leftSide.delete();
  rightSide.delete();

  return {
    parts,
    splitInfo: {
      ...plan,
      totalParts: parts.length,
    },
  };
}

/**
 * Process a single side: split at midpoint if needed, subtract dowel holes.
 */
function processSide(
  wasm: ManifoldToplevel,
  side: Manifold,
  sideName: string,
  needsSplit: boolean,
  splitAxis: 'x' | 'y',
  dims: ComputedDimensions,
  params: FrameParams,
  connector: ConnectorSettings,
  parts: SplitPart[]
): void {
  if (!needsSplit) {
    // Export the whole side — create a new manifold so caller can safely delete the original
    parts.push({ name: `${sideName}.stl`, manifold: wasm.Manifold.union([side]) });
    return;
  }

  // Split at midpoint using splitByPlane
  // For horizontal sides (bottom/top), split along X (normal=[1,0,0], offset=0 → at X=0)
  // For vertical sides (left/right), split along Y (normal=[0,1,0], offset=0 → at Y=0)
  const normal: [number, number, number] =
    splitAxis === 'x' ? [1, 0, 0] : [0, 1, 0];

  const splitResult = side.splitByPlane(normal, 0);
  // splitByPlane returns [positive_half, negative_half]
  // positive_half: where dot(pos, normal) >= 0
  // negative_half: where dot(pos, normal) < 0
  const positiveHalf = splitResult[0];
  const negativeHalf = splitResult[1];

  // Create dowel holes centered on the cut plane
  const dowelHoles = createDowelHoles(wasm, sideName, splitAxis, dims, params, connector);

  // Subtract dowel holes from both halves
  let positiveWithHoles = positiveHalf;
  let negativeWithHoles = negativeHalf;

  if (dowelHoles) {
    positiveWithHoles = wasm.Manifold.difference(positiveHalf, dowelHoles);
    // Need a fresh copy of dowelHoles since difference consumed it
    const dowelHoles2 = createDowelHoles(wasm, sideName, splitAxis, dims, params, connector);
    if (dowelHoles2) {
      negativeWithHoles = wasm.Manifold.difference(negativeHalf, dowelHoles2);
      dowelHoles2.delete();
    }
    dowelHoles.delete();
    positiveHalf.delete();
    negativeHalf.delete();
  }

  // Name based on split axis direction
  if (splitAxis === 'x') {
    // X split: positive = right half, negative = left half
    parts.push({ name: `${sideName}-right.stl`, manifold: positiveWithHoles });
    parts.push({ name: `${sideName}-left.stl`, manifold: negativeWithHoles });
  } else {
    // Y split: positive = top half, negative = bottom half
    parts.push({ name: `${sideName}-top.stl`, manifold: positiveWithHoles });
    parts.push({ name: `${sideName}-bottom.stl`, manifold: negativeWithHoles });
  }
}

/**
 * Create dowel alignment holes at the cut face.
 * Cylinders are aligned with the split normal and centered on the cut plane,
 * so they span both halves equally.
 */
function createDowelHoles(
  wasm: ManifoldToplevel,
  sideName: string,
  splitAxis: 'x' | 'y',
  dims: ComputedDimensions,
  params: FrameParams,
  connector: ConnectorSettings
): Manifold | null {
  const { diameter, depth, count } = connector.dowel;
  if (count <= 0) return null;

  const radius = diameter / 2;
  const totalLength = depth * 2; // spans both halves

  // Z range of frame: [-frameDepth/2, +frameDepth/2]
  // Place dowels evenly along Z within the frame depth
  const fd = params.frameDepth;
  const zPositions: number[] = [];
  for (let i = 0; i < count; i++) {
    zPositions.push(-fd / 2 + (fd * (i + 1)) / (count + 1));
  }

  // Perpendicular position: center of the frame wall
  // For bottom/top sides, the frame wall center Y:
  //   bottom: -(outerHeight + innerHeight) / 4
  //   top:    +(outerHeight + innerHeight) / 4
  // For left/right sides, the frame wall center X:
  //   left:   -(outerWidth + innerWidth) / 4
  //   right:  +(outerWidth + innerWidth) / 4
  let perpPos: number;
  switch (sideName) {
    case 'bottom':
      perpPos = -(dims.outerHeight + dims.innerHeight) / 4;
      break;
    case 'top':
      perpPos = (dims.outerHeight + dims.innerHeight) / 4;
      break;
    case 'left':
      perpPos = -(dims.outerWidth + dims.innerWidth) / 4;
      break;
    case 'right':
      perpPos = (dims.outerWidth + dims.innerWidth) / 4;
      break;
    default:
      perpPos = 0;
  }

  const cylinders: Manifold[] = [];

  for (const z of zPositions) {
    // Create cylinder along the split axis
    // Default cylinder is along Z, so we need to rotate it
    const cyl = wasm.Manifold.cylinder(totalLength, radius, radius, 16, true);

    let positioned: Manifold;
    if (splitAxis === 'x') {
      // Rotate to align along X axis: rotate 90° around Y
      positioned = cyl
        .rotate([0, 90, 0])
        .translate([0, perpPos, z]);
    } else {
      // Rotate to align along Y axis: rotate 90° around X
      positioned = cyl
        .rotate([90, 0, 0])
        .translate([perpPos, 0, z]);
    }

    cylinders.push(positioned);
    cyl.delete();
  }

  if (cylinders.length === 0) return null;

  const result = wasm.Manifold.union(cylinders);
  for (const c of cylinders) c.delete();

  return result;
}
