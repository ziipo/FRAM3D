import type { Manifold, ManifoldToplevel, Mesh } from 'manifold-3d';
import type { FrameParams, ComputedDimensions } from '../types/frame';
import { getPictureSize } from '../data/presets';
import { buildSimpleProfile } from './profileBuilder';

/**
 * Main frame generation function.
 * Computes dimensions, builds profiles, creates segments, and unions them.
 */
export function generateFrame(
  wasm: ManifoldToplevel,
  params: FrameParams
): { manifold: Manifold; mesh: Mesh; dimensions: ComputedDimensions } {
  // Compute actual dimensions
  const dimensions = computeDimensions(params);

  // Build the 2D cross-section profile
  // TODO: Use actual profile from params.profileId when profile builder is complete
  const crossSection = buildSimpleProfile(
    wasm,
    params.frameWidth,
    params.frameDepth,
    params.rabbetWidth,
    params.rabbetDepth
  );

  // Calculate segment lengths (including extra for miter cuts)
  // Each segment needs to be long enough to reach the full outer dimension
  // The actual length is the inner dimension + 2 * frameWidth (for the miters)
  const horizontalLength = dimensions.innerWidth + 2 * params.frameWidth;
  const verticalLength = dimensions.innerHeight + 2 * params.frameWidth;

  // Build the four frame segments
  // Each segment is extruded along Z, then miter-cut at both ends

  // Top segment
  const topSegment = buildAndPositionSegment(
    wasm,
    crossSection,
    horizontalLength,
    params.frameWidth,
    'top',
    dimensions
  );

  // Bottom segment
  const bottomSegment = buildAndPositionSegment(
    wasm,
    crossSection,
    horizontalLength,
    params.frameWidth,
    'bottom',
    dimensions
  );

  // Left segment
  const leftSegment = buildAndPositionSegment(
    wasm,
    crossSection,
    verticalLength,
    params.frameWidth,
    'left',
    dimensions
  );

  // Right segment
  const rightSegment = buildAndPositionSegment(
    wasm,
    crossSection,
    verticalLength,
    params.frameWidth,
    'right',
    dimensions
  );

  // Union all segments together
  const frame = wasm.Manifold.union([
    topSegment,
    bottomSegment,
    leftSegment,
    rightSegment,
  ]);

  // Clean up intermediate geometry
  crossSection.delete();
  topSegment.delete();
  bottomSegment.delete();
  leftSegment.delete();
  rightSegment.delete();

  // Get the mesh for rendering
  const mesh = frame.getMesh();

  return { manifold: frame, mesh, dimensions };
}

/**
 * Builds a segment and positions it for the specified edge.
 */
function buildAndPositionSegment(
  wasm: ManifoldToplevel,
  crossSection: ReturnType<typeof buildSimpleProfile>,
  length: number,
  frameWidth: number,
  edge: 'top' | 'bottom' | 'left' | 'right',
  dims: ComputedDimensions
): Manifold {
  // Extrude the profile
  let segment = crossSection.extrude(length);

  // Apply miter cuts
  segment = applyMiterCuts(wasm, segment, length, frameWidth);

  // Position based on edge
  segment = positionSegment(segment, edge, dims, frameWidth);

  return segment;
}

/**
 * Applies 45-degree miter cuts to both ends of a segment.
 */
function applyMiterCuts(
  _wasm: ManifoldToplevel,
  segment: Manifold,
  length: number,
  frameWidth: number
): Manifold {
  // The miter cuts remove triangular wedges from each end of the segment
  // This allows segments to join cleanly at 90-degree corners

  // Miter at start (Z = 0)
  // We want to cut from the inner edge (X = 0) to the outer edge (X = frameWidth)
  // The cut plane passes through (0, Y, 0) and (frameWidth, Y, frameWidth)

  // For trimByPlane: normal points toward material we KEEP
  // At start: keep material where Z > X (proportionally)
  // Normal = (1, 0, 1) / sqrt(2), offset = 0

  const sqrt2 = Math.sqrt(2);
  const startNormal: [number, number, number] = [1 / sqrt2, 0, 1 / sqrt2];
  segment = segment.trimByPlane(startNormal, 0);

  // Miter at end (Z = length)
  // Cut from inner edge to outer edge at the far end
  // Keep material where Z < length - (frameWidth - X) = Z < length - frameWidth + X
  // Rearranged: Z - X < length - frameWidth
  // Normal pointing toward what we keep: (1, 0, -1) / sqrt(2)
  // Plane passes through (0, Y, length - frameWidth) or (frameWidth, Y, length)
  // offset = dot((0, 0, length - frameWidth), (1, 0, -1)/sqrt2)
  //        = (length - frameWidth) * (-1/sqrt2)

  const endNormal: [number, number, number] = [1 / sqrt2, 0, -1 / sqrt2];
  const endOffset = -(length - frameWidth) / sqrt2;
  segment = segment.trimByPlane(endNormal, endOffset);

  return segment;
}

/**
 * Positions a segment for its designated edge of the frame.
 * The frame is centered at origin.
 */
function positionSegment(
  segment: Manifold,
  edge: 'top' | 'bottom' | 'left' | 'right',
  dims: ComputedDimensions,
  frameWidth: number
): Manifold {
  const halfInnerW = dims.innerWidth / 2;
  const halfInnerH = dims.innerHeight / 2;

  switch (edge) {
    case 'bottom':
      // Bottom segment: runs along -Y edge
      // Profile X axis should point toward center (Y+)
      // Rotate so profile faces up, then position
      return segment
        .rotate([90, 0, 0])  // X-Y plane to X-Z plane, extruded along -Y
        .translate([-halfInnerW - frameWidth, -halfInnerH, 0]);

    case 'top':
      // Top segment: runs along +Y edge
      // Rotate and flip, then position
      return segment
        .rotate([90, 0, 0])
        .rotate([0, 0, 180])  // Flip to face down
        .translate([halfInnerW + frameWidth, halfInnerH + frameWidth, 0]);

    case 'left':
      // Left segment: runs along -X edge
      return segment
        .rotate([90, 0, 0])
        .rotate([0, 0, 90])   // Rotate to vertical
        .translate([-halfInnerW, -halfInnerH - frameWidth, 0]);

    case 'right':
      // Right segment: runs along +X edge
      return segment
        .rotate([90, 0, 0])
        .rotate([0, 0, -90])  // Rotate to vertical (opposite)
        .translate([halfInnerW + frameWidth, halfInnerH + frameWidth, 0]);
  }
}

/**
 * Computes actual frame dimensions from parameters.
 */
export function computeDimensions(params: FrameParams): ComputedDimensions {
  // Get picture dimensions
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
      // Fallback to custom dimensions
      pictureWidth = params.customWidth;
      pictureHeight = params.customHeight;
    }
  }

  // Inner dimensions include tolerance
  const innerWidth = pictureWidth + 2 * params.tolerance;
  const innerHeight = pictureHeight + 2 * params.tolerance;

  // Outer dimensions add frame width on all sides
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
