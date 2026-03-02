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
  bottom: number; // 1 = no split, 2+ = number of pieces
  top: number;
  left: number;
  right: number;
}

export interface SplitPart {
  name: string;
  manifold: Manifold;
}

/**
 * Determine how many pieces each side needs based on build plate size.
 * A part can be rotated on the plate, so we compare against the longest plate dimension.
 */
export function computeSplitPlan(
  dims: ComputedDimensions,
  plateWidth: number,
  plateDepth: number
): SplitPlan {
  const maxPlate = Math.max(plateWidth, plateDepth);

  return {
    bottom: Math.ceil(dims.outerWidth / maxPlate),
    top: Math.ceil(dims.outerWidth / maxPlate),
    left: Math.ceil(dims.outerHeight / maxPlate),
    right: Math.ceil(dims.outerHeight / maxPlate),
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
  // Bottom/top span X: [-outerWidth/2, +outerWidth/2]
  // Left/right span Y: [-outerHeight/2, +outerHeight/2]
  processSide(wasm, bottomSide, 'bottom', plan.bottom, 'x',
    -dims.outerWidth / 2, dims.outerWidth / 2, dims, params, connector, parts);
  processSide(wasm, topSide, 'top', plan.top, 'x',
    -dims.outerWidth / 2, dims.outerWidth / 2, dims, params, connector, parts);
  processSide(wasm, leftSide, 'left', plan.left, 'y',
    -dims.outerHeight / 2, dims.outerHeight / 2, dims, params, connector, parts);
  processSide(wasm, rightSide, 'right', plan.right, 'y',
    -dims.outerHeight / 2, dims.outerHeight / 2, dims, params, connector, parts);

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
 * Process a single side: split into N pieces if needed, subtract dowel holes at each cut.
 */
function processSide(
  wasm: ManifoldToplevel,
  side: Manifold,
  sideName: string,
  pieceCount: number,
  splitAxis: 'x' | 'y',
  axisMin: number,
  axisMax: number,
  dims: ComputedDimensions,
  params: FrameParams,
  connector: ConnectorSettings,
  parts: SplitPart[]
): void {
  if (pieceCount <= 1) {
    // Export the whole side — create a new manifold so caller can safely delete the original
    parts.push({ name: `${sideName}.stl`, manifold: wasm.Manifold.union([side]) });
    return;
  }

  const normal: [number, number, number] =
    splitAxis === 'x' ? [1, 0, 0] : [0, 1, 0];

  // Compute N-1 evenly spaced cut positions
  const span = axisMax - axisMin;
  const cutPositions: number[] = [];
  for (let i = 1; i < pieceCount; i++) {
    cutPositions.push(axisMin + (span * i) / pieceCount);
  }

  // Generate each piece by trimming the full side with bounding planes
  for (let j = 0; j < pieceCount; j++) {
    let piece = wasm.Manifold.union([side]); // clone

    // Trim the positive (high) end — all pieces except the last
    if (j < pieceCount - 1) {
      const cutHigh = cutPositions[j];
      // trimByPlane keeps the region where dot(pos, normal) <= offset
      // i.e. normal=[1,0,0], offset=cutHigh keeps everything with x <= cutHigh
      const trimmed = piece.trimByPlane(normal, cutHigh);
      piece.delete();
      piece = trimmed;
    }

    // Trim the negative (low) end — all pieces except the first
    if (j > 0) {
      const cutLow = cutPositions[j - 1];
      // Negate the normal and negate the offset to keep the region above cutLow
      // negNormal with offset -cutLow keeps everything where dot(pos, -normal) <= -cutLow
      // i.e. -x <= -cutLow → x >= cutLow
      const negNormal: [number, number, number] = [
        -normal[0], -normal[1], -normal[2],
      ];
      const trimmed = piece.trimByPlane(negNormal, -cutLow);
      piece.delete();
      piece = trimmed;
    }

    // Subtract dowel holes at each interior cut face bordering this piece
    // Piece j borders: cutPositions[j-1] (low face) and cutPositions[j] (high face)
    const adjacentCuts: number[] = [];
    if (j > 0) adjacentCuts.push(cutPositions[j - 1]);
    if (j < pieceCount - 1) adjacentCuts.push(cutPositions[j]);

    for (const cutOffset of adjacentCuts) {
      const holes = createDowelHolesAtOffset(
        wasm, sideName, splitAxis, cutOffset, dims, params, connector
      );
      if (holes) {
        const withHoles = wasm.Manifold.difference(piece, holes);
        piece.delete();
        holes.delete();
        piece = withHoles;
      }
    }

    // Name: {side}.stl if 1 piece, {side}-1.stl through {side}-N.stl if multi-split
    const name = `${sideName}-${j + 1}.stl`;
    parts.push({ name, manifold: piece });
  }
}

/**
 * Create dowel alignment holes at a specific cut offset along the split axis.
 * Cylinders are aligned with the split normal and centered on the cut plane,
 * so they span both halves equally.
 */
function createDowelHolesAtOffset(
  wasm: ManifoldToplevel,
  sideName: string,
  splitAxis: 'x' | 'y',
  axisOffset: number,
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
      // Rotate to align along X axis: rotate 90deg around Y
      positioned = cyl
        .rotate([0, 90, 0])
        .translate([axisOffset, perpPos, z]);
    } else {
      // Rotate to align along Y axis: rotate 90deg around X
      positioned = cyl
        .rotate([90, 0, 0])
        .translate([perpPos, axisOffset, z]);
    }

    cylinders.push(positioned);
    cyl.delete();
  }

  if (cylinders.length === 0) return null;

  const result = wasm.Manifold.union(cylinders);
  for (const c of cylinders) c.delete();

  return result;
}
