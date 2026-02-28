import type { Manifold, ManifoldToplevel, Mesh } from 'manifold-3d';
import type { FrameParams, ComputedDimensions } from '../types/frame';
import { getPictureSize } from '../data/presets';
import { getProfile } from '../data/profiles';
import { buildProfileCrossSection } from './profileBuilder';
import {
  buildFrameSegment,
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
    return generateProfiledFrame(wasm, params, dims);
  } catch {
    return generateBoxFrame(wasm, params, dims);
  }
}

/**
 * Profile-based frame generation using 4 extruded+mitered segments.
 */
function generateProfiledFrame(
  wasm: ManifoldToplevel,
  params: FrameParams,
  dims: ComputedDimensions
): { manifold: Manifold; mesh: Mesh; dimensions: ComputedDimensions } {
  const profile = getProfile(params.profileId) || getProfile('flat')!;

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
