import type { Manifold, ManifoldToplevel, Mesh } from 'manifold-3d';
import type { FrameParams, ComputedDimensions } from '../types/frame';
import { getPictureSize } from '../data/presets';

/**
 * Main frame generation function.
 * Creates a picture frame using CSG boolean operations:
 * 1. Outer box - Inner box = basic frame shell
 * 2. Subtract rabbet channel for the picture/glass to sit in
 */
export function generateFrame(
  wasm: ManifoldToplevel,
  params: FrameParams
): { manifold: Manifold; mesh: Mesh; dimensions: ComputedDimensions } {
  const dims = computeDimensions(params);
  const { Manifold: M } = wasm;

  // Create outer box (full frame outline)
  const outerBox = M.cube(
    [dims.outerWidth, dims.outerHeight, params.frameDepth],
    true // center at origin
  );

  // Create inner cutout (the opening for the picture)
  const innerBox = M.cube(
    [dims.innerWidth, dims.innerHeight, params.frameDepth + 2],
    true
  );

  // Subtract inner from outer to get the basic frame shape
  let frame = M.difference(outerBox, innerBox);

  // Create rabbet channel - a shallow ledge around the inside edge
  // where the glass/picture/backing sits
  const rabbetW = dims.innerWidth + 2 * params.rabbetWidth;
  const rabbetH = dims.innerHeight + 2 * params.rabbetWidth;
  const rabbetBox = M.cube([rabbetW, rabbetH, params.rabbetDepth], false);

  // Position rabbet at the back of the frame (bottom in Z)
  const rabbetPositioned = rabbetBox.translate([
    -rabbetW / 2,
    -rabbetH / 2,
    -params.frameDepth / 2,
  ]);

  // Subtract rabbet from frame
  frame = M.difference(frame, rabbetPositioned);

  // Clean up intermediate geometry
  outerBox.delete();
  innerBox.delete();
  rabbetBox.delete();
  rabbetPositioned.delete();

  // Get the mesh for rendering
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
