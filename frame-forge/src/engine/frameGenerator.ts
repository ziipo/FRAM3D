import type { Manifold, ManifoldToplevel, Mesh } from 'manifold-3d';
import type { FrameParams, ComputedDimensions } from '../types/frame';
import { getPictureSize } from '../data/presets';
import { getProfileForParams } from '../data/profiles';
import { buildProfileCrossSection, buildRectangularCrossSection } from './profileBuilder';
import {
  buildFrameSegment,
  buildFlatSegment,
  applyStampPattern,
  positionBottomSegment,
  positionTopSegment,
  positionLeftSegment,
  positionRightSegment,
} from './segmentBuilder';

/**
 * Main frame generation function.
 * Builds a picture frame from 4 individually extruded+mitered profile segments.
 * Falls back to box-CSG if profile-based generation fails.
 */
export function generateFrame(
  wasm: ManifoldToplevel,
  params: FrameParams
): { manifold: Manifold; mesh: Mesh; dimensions: ComputedDimensions } {
  const dims = computeDimensions(params);

  try {
    if (params.frameStyle === 'stamp') {
      return generateStampedFrame(wasm, params, dims);
    }
    return generateProfiledFrame(wasm, params, dims);
  } catch {
    return generateBoxFrame(wasm, params, dims);
  }
}

/**
 * Stamp-based frame generation using 4 flat segments with specified corner style.
 */
function generateStampedFrame(
  wasm: ManifoldToplevel,
  params: FrameParams,
  dims: ComputedDimensions
): { manifold: Manifold; mesh: Mesh; dimensions: ComputedDimensions } {
  const { Manifold: M } = wasm;

  // For stamp mode, we use a basic rectangular profile.
  // The rabbet is applied later as a 3D subtraction to ensure it doesn't
  // bleed out of the corners in butt/cyclic joinery.
  const crossSection = buildRectangularCrossSection(
    wasm,
    params.frameWidth,
    params.frameDepth
  );

  const fw = params.frameWidth;
  let bottomLen: number, topLen: number, leftLen: number, rightLen: number;

  if (params.stampCornerStyle === 'butt-h') {
    // Butt joints (Top/Bottom overlap)
    // Top & Bottom are full length (outerWidth)
    // Left & Right are shortened (innerHeight)
    bottomLen = dims.outerWidth;
    topLen = dims.outerWidth;
    leftLen = dims.innerHeight;
    rightLen = dims.innerHeight;
  } else if (params.stampCornerStyle === 'butt-v') {
    // Butt joints (Left/Right overlap)
    // Left & Right are full length (outerHeight)
    // Top & Bottom are shortened (innerWidth)
    bottomLen = dims.innerWidth;
    topLen = dims.innerWidth;
    leftLen = dims.outerHeight;
    rightLen = dims.outerHeight;
  } else {
    // Cyclic (Pinwheel)
    // All 4 segments shortened by frameWidth (outerWidth - fw, outerHeight - fw)
    bottomLen = dims.outerWidth - fw;
    topLen = dims.outerWidth - fw;
    leftLen = dims.outerHeight - fw;
    rightLen = dims.outerHeight - fw;
  }

  let bottomRaw = buildFlatSegment(wasm, crossSection, bottomLen);
  let topRaw = buildFlatSegment(wasm, crossSection, topLen);
  let leftRaw = buildFlatSegment(wasm, crossSection, leftLen);
  let rightRaw = buildFlatSegment(wasm, crossSection, rightLen);

  // Apply stamps
  bottomRaw = applyStampPattern(wasm, bottomRaw, bottomLen, params);
  topRaw = applyStampPattern(wasm, topRaw, topLen, params);
  leftRaw = applyStampPattern(wasm, leftRaw, leftLen, params);
  rightRaw = applyStampPattern(wasm, rightRaw, rightLen, params);

  // Position each segment around the frame
  let bottom = positionBottomSegment(bottomRaw, dims, params);
  let top = positionTopSegment(topRaw, dims, params);
  let left = positionLeftSegment(leftRaw, dims, params);
  let right = positionRightSegment(rightRaw, dims, params);

  // Adjust positioning based on butt/cyclic
  if (params.stampCornerStyle === 'butt-h') {
    // Top/Bottom are already correct since they use outerWidth.
    // Left segment naturally spans [0, leftLen] in Z before rotation. 
    // segmentBuilder places the start of Z at -outerHeight/2 for Left, and end of Z at +outerHeight/2 for Right.
    // We need to shift them to center them along the Y axis.
    left = left.translate([0, fw, 0]);
    right = right.translate([0, -fw, 0]);
  } else if (params.stampCornerStyle === 'butt-v') {
    // Left/Right are already correct since they use outerHeight.
    // Top/Bottom need to be shifted along world X to center them.
    bottom = bottom.translate([-fw, 0, 0]);
    top = top.translate([fw, 0, 0]);
  } else if (params.stampCornerStyle === 'cyclic') {
    // Top runs to Right edge. Short of Left edge.
    top = top.translate([fw / 2, 0, 0]);
    // Right runs to Bottom edge. Short of Top edge.
    right = right.translate([0, -fw / 2, 0]);
    // Bottom runs to Left edge. Short of Right edge.
    bottom = bottom.translate([-fw / 2, 0, 0]);
    // Left runs to Top edge. Short of Bottom edge.
    left = left.translate([0, fw / 2, 0]);
  }

  // Union all 4 segments
  const frame = M.union([bottom, top, left, right]);

  // Apply rabbet as a 3D subtraction. This ensures the rabbet notch
  // is only where the picture sits and doesn't extend to the outer edges.
  const rabbetW = dims.innerWidth + 2 * params.rabbetWidth;
  const rabbetH = dims.innerHeight + 2 * params.rabbetWidth;
  const rabbetBox = M.cube([rabbetW, rabbetH, params.rabbetDepth], false);

  const rabbetPositioned = rabbetBox.translate([
    -rabbetW / 2,
    -rabbetH / 2,
    -params.frameDepth / 2,
  ]);

  const finalFrame = M.difference(frame, rabbetPositioned);

  // Cleanup
  crossSection.delete();
  bottomRaw.delete();
  topRaw.delete();
  leftRaw.delete();
  rightRaw.delete();
  bottom.delete();
  top.delete();
  left.delete();
  right.delete();
  rabbetBox.delete();
  rabbetPositioned.delete();
  frame.delete();

  const mesh = finalFrame.getMesh();
  return { manifold: finalFrame, mesh, dimensions: dims };
}

/**
 * Profile-based frame generation using 4 extruded+mitered segments.
 */
function generateProfiledFrame(
  wasm: ManifoldToplevel,
  params: FrameParams,
  dims: ComputedDimensions
): { manifold: Manifold; mesh: Mesh; dimensions: ComputedDimensions } {
  const profile = getProfileForParams(params);

  // Build the 2D cross-section from profile data
  const crossSection = buildProfileCrossSection(
    wasm,
    profile,
    params.frameWidth,
    params.frameDepth,
    params.rabbetWidth,
    params.rabbetDepth
  );

  // Build 4 mitered segments (2 horizontal at outerWidth, 2 vertical at outerHeight)
  const fw = params.frameWidth;
  const bottomRaw = buildFrameSegment(wasm, crossSection, dims.outerWidth, fw);
  const topRaw = buildFrameSegment(wasm, crossSection, dims.outerWidth, fw);
  const leftRaw = buildFrameSegment(wasm, crossSection, dims.outerHeight, fw);
  const rightRaw = buildFrameSegment(wasm, crossSection, dims.outerHeight, fw);

  // Position each segment around the frame
  const bottom = positionBottomSegment(bottomRaw, dims, params);
  const top = positionTopSegment(topRaw, dims, params);
  const left = positionLeftSegment(leftRaw, dims, params);
  const right = positionRightSegment(rightRaw, dims, params);

  // Union all 4 segments
  const frame = wasm.Manifold.union([bottom, top, left, right]);

  // Clean up intermediates
  crossSection.delete();
  bottomRaw.delete();
  topRaw.delete();
  leftRaw.delete();
  rightRaw.delete();
  bottom.delete();
  top.delete();
  left.delete();
  right.delete();

  const mesh = frame.getMesh();
  return { manifold: frame, mesh, dimensions: dims };
}

/**
 * Fallback box-CSG frame generation (flat profile only).
 * Original approach: outerBox - innerBox - rabbet.
 */
function generateBoxFrame(
  wasm: ManifoldToplevel,
  params: FrameParams,
  dims: ComputedDimensions
): { manifold: Manifold; mesh: Mesh; dimensions: ComputedDimensions } {
  const { Manifold: M } = wasm;

  const outerBox = M.cube(
    [dims.outerWidth, dims.outerHeight, params.frameDepth],
    true
  );

  const innerBox = M.cube(
    [dims.innerWidth, dims.innerHeight, params.frameDepth + 2],
    true
  );

  let frame = M.difference(outerBox, innerBox);

  const rabbetW = dims.innerWidth + 2 * params.rabbetWidth;
  const rabbetH = dims.innerHeight + 2 * params.rabbetWidth;
  const rabbetBox = M.cube([rabbetW, rabbetH, params.rabbetDepth], false);

  const rabbetPositioned = rabbetBox.translate([
    -rabbetW / 2,
    -rabbetH / 2,
    -params.frameDepth / 2,
  ]);

  frame = M.difference(frame, rabbetPositioned);

  outerBox.delete();
  innerBox.delete();
  rabbetBox.delete();
  rabbetPositioned.delete();

  const mesh = frame.getMesh();
  return { manifold: frame, mesh, dimensions: dims };
}

/**
 * Computes actual frame dimensions from parameters.
 */
export function computeDimensions(params: FrameParams): ComputedDimensions {
  let pictureWidth: number;
  let pictureHeight: number;

  if (params.pictureSizeId === 'custom') {
    pictureWidth = params.customWidth;
    pictureHeight = params.customHeight;
  } else {
    const preset = getPictureSize(params.pictureSizeId);
    if (preset) {
      pictureWidth = preset.dimensions.width;
      pictureHeight = preset.dimensions.height;
    } else {
      pictureWidth = params.customWidth;
      pictureHeight = params.customHeight;
    }
  }

  const innerWidth = pictureWidth + 2 * params.tolerance;
  const innerHeight = pictureHeight + 2 * params.tolerance;
  const outerWidth = innerWidth + 2 * params.frameWidth;
  const outerHeight = innerHeight + 2 * params.frameWidth;

  return {
    pictureWidth,
    pictureHeight,
    innerWidth,
    innerHeight,
    outerWidth,
    outerHeight,
  };
}
