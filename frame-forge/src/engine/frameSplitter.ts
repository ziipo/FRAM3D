import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d';
import type { FrameParams, ComputedDimensions, ConnectorSettings, FloatingTenonSettings, TongueGrooveSettings } from '../types/frame';
import { computeDimensions } from './frameGenerator';
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

export interface SplitPlan {
  bottom: number; // 1 = no split, 2+ = number of pieces
  top: number;
  left: number;
  right: number;
}

export interface SplitPart {
  name: string;
  manifold: Manifold;
  worldPos?: [number, number, number];
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

// --- Safe zone computation ---

export interface DiagnosticSvg {
  name: string;
  svg: string;
}

interface SafeZone {
  perpCenter: number;
  zCenter: number;
  safeWidth: number;  // extent in the perpendicular-to-split direction (bounding box upper limit)
  safeHeight: number; // extent in the Z (depth) direction (bounding box upper limit)
  maxRadius: number;  // from pole of inaccessibility — max inscribed circle radius
  // Build-space coords for SVG diagnostic:
  buildCenterX: number;
  buildCenterY: number;
}

/**
 * Find the "pole of inaccessibility" — the point furthest from all edges
 * of the cross-section. This is found by successively shrinking the polygon
 * until it collapses; the center of the last surviving polygon is the pole.
 */
function findPoleOfInaccessibility(
  safeZoneSection: CrossSection
): { centerX: number; centerY: number; maxRadius: number } {
  const STEP = 1.0; // Increased from 0.25mm for performance
  const MIN_AREA = 0.01; // mm² — stop when polygon nearly vanishes

  let current = safeZoneSection.offset(0); // clone
  let maxRadius = 0;

  // Start with bounds center of the input as default
  const initBounds = current.bounds();
  let bestCenterX = (initBounds.min[0] + initBounds.max[0]) / 2;
  let bestCenterY = (initBounds.min[1] + initBounds.max[1]) / 2;

  for (;;) {
    const next = current.offset(-STEP, 'Round', undefined, 2);
    if (next.area() < MIN_AREA) {
      next.delete();
      break;
    }
    maxRadius += STEP;
    const b = next.bounds();
    bestCenterX = (b.min[0] + b.max[0]) / 2;
    bestCenterY = (b.min[1] + b.max[1]) / 2;
    current.delete();
    current = next;
  }

  current.delete();
  return { centerX: bestCenterX, centerY: bestCenterY, maxRadius };
}

/**
 * Generate a diagnostic SVG showing the profile cross-section, safe zone,
 * pole of inaccessibility, and mortise rectangle.
 */
function generateDiagnosticSVG(
  originalSection: CrossSection,
  safeZoneSection: CrossSection,
  mortise: { cx: number; cy: number; w: number; h: number },
  pole: { centerX: number; centerY: number; maxRadius: number }
): string {
  const PAD = 2; // mm padding around viewBox

  // Helper: convert CrossSection polygons to SVG path data (Y-flipped)
  function sectionToPath(section: CrossSection): string {
    const polys = section.toPolygons();
    const parts: string[] = [];
    for (const poly of polys) {
      if (poly.length === 0) continue;
      const commands: string[] = [];
      for (let i = 0; i < poly.length; i++) {
        const x = poly[i][0];
        const y = -poly[i][1]; // flip Y
        commands.push(i === 0 ? `M${x},${y}` : `L${x},${y}`);
      }
      commands.push('Z');
      parts.push(commands.join(' '));
    }
    return parts.join(' ');
  }

  // Compute viewBox from original section bounds
  const ob = originalSection.bounds();
  const vx = ob.min[0] - PAD;
  const vy = -(ob.max[1] + PAD); // flipped
  const vw = ob.max[0] - ob.min[0] + 2 * PAD;
  const vh = ob.max[1] - ob.min[1] + 2 * PAD;

  const profilePath = sectionToPath(originalSection);
  const safeZonePath = sectionToPath(safeZoneSection);

  // Mortise rect coords (Y-flipped)
  const rx = mortise.cx - mortise.w / 2;
  const ry = -(mortise.cy + mortise.h / 2); // flip Y
  const rw = mortise.w;
  const rh = mortise.h;

  // Pole center (Y-flipped)
  const px = pole.centerX;
  const py = -pole.centerY;

  const strokeW = Math.max(vw, vh) * 0.005; // scale stroke to view size
  const dotR = strokeW * 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}">`,
    `  <!-- Profile cross-section -->`,
    `  <path d="${profilePath}" fill="#ccc" stroke="#666" stroke-width="${strokeW}" />`,
    `  <!-- Safe zone (offset inward by wallThickness) -->`,
    `  <path d="${safeZonePath}" fill="rgba(0,180,0,0.4)" stroke="green" stroke-width="${strokeW}" />`,
    `  <!-- Max inscribed circle at pole -->`,
    `  <circle cx="${px}" cy="${py}" r="${pole.maxRadius}" fill="none" stroke="blue" stroke-width="${strokeW}" stroke-dasharray="${strokeW * 4} ${strokeW * 2}" />`,
    `  <!-- Mortise rectangle -->`,
    `  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="rgba(255,0,0,0.6)" stroke="red" stroke-width="${strokeW}" />`,
    `  <!-- Pole center -->`,
    `  <circle cx="${px}" cy="${py}" r="${dotR}" fill="black" />`,
    `</svg>`,
  ].join('\n');
}

/**
 * Compute the safe zone for joinery at a given side.
 */
function computeSafeZone(
  crossSection: CrossSection,
  wallThickness: number,
  sideName: string,
  params: FrameParams,
  dims: ComputedDimensions
): { safeZone: SafeZone; shrunkSection: CrossSection } | null {
  const shrunk = crossSection.offset(-wallThickness, 'Round', undefined, 2);
  if (shrunk.area() < 0.01) {
    shrunk.delete();
    return null;
  }

  const bounds = shrunk.bounds();
  const safeWidth = bounds.max[0] - bounds.min[0];
  const safeHeight = bounds.max[1] - bounds.min[1];

  const pole = findPoleOfInaccessibility(shrunk);

  const buildCenterX = pole.centerX;
  const buildCenterY = pole.centerY;

  let perpCenter: number;
  switch (sideName) {
    case 'bottom':
      perpCenter = -buildCenterX - dims.innerHeight / 2;
      break;
    case 'top':
      perpCenter = buildCenterX + dims.innerHeight / 2;
      break;
    case 'left':
      perpCenter = -buildCenterX - dims.innerWidth / 2;
      break;
    case 'right':
      perpCenter = buildCenterX + dims.innerWidth / 2;
      break;
    default:
      shrunk.delete();
      return null;
  }

  const zCenter = buildCenterY - params.frameDepth / 2;

  return {
    safeZone: {
      perpCenter, zCenter, safeWidth, safeHeight,
      maxRadius: pole.maxRadius,
      buildCenterX,
      buildCenterY,
    },
    shrunkSection: shrunk,
  };
}

// --- Joinery box creation ---

function createJoineryBox(
  wasm: ManifoldToplevel,
  splitAxis: 'x' | 'y',
  cutOffset: number,
  splitOffset: number,
  splitExtent: number,
  perpExtent: number,
  zExtent: number,
  perpCenter: number,
  zCenter: number
): Manifold {
  if (splitAxis === 'x') {
    const box = wasm.Manifold.cube([splitExtent, perpExtent, zExtent], true);
    return box.translate([cutOffset + splitOffset, perpCenter, zCenter]);
  } else {
    const box = wasm.Manifold.cube([perpExtent, splitExtent, zExtent], true);
    return box.translate([perpCenter, cutOffset + splitOffset, zCenter]);
  }
}

// --- Floating tenon ---

interface FloatingTenonResult {
  piece: Manifold;
  tenon: Manifold | null;
  tenonWorldPos?: [number, number, number];
}

function applyFloatingTenon(
  wasm: ManifoldToplevel,
  piece: Manifold,
  splitAxis: 'x' | 'y',
  cutOffset: number,
  safeZone: SafeZone,
  settings: FloatingTenonSettings,
  generateTenon: boolean,
  originalSection: CrossSection | null,
  shrunkSection: CrossSection | null,
  diagnosticSvgs: DiagnosticSvg[],
  diagnosticName: string
): FloatingTenonResult {
  const { tenonLength, toleranceXY, toleranceZ, fillFraction } = settings;

  const maxMortiseSide = safeZone.maxRadius * Math.SQRT2;
  const maxTenonSide = maxMortiseSide - 2 * toleranceXY;
  const tenonW = Math.min(safeZone.safeWidth * fillFraction, maxTenonSide);
  const tenonH = Math.min(safeZone.safeHeight * fillFraction, maxTenonSide);

  const mortiseW = tenonW + 2 * toleranceXY;
  const mortiseH = tenonH + 2 * toleranceXY;
  const mortiseDepth = tenonLength / 2 + toleranceZ;

  const totalMortiseLen = 2 * mortiseDepth;
  const mortise = createJoineryBox(
    wasm, splitAxis, cutOffset, 0,
    totalMortiseLen, mortiseW, mortiseH,
    safeZone.perpCenter, safeZone.zCenter
  );

  const result = wasm.Manifold.difference(piece, mortise);
  piece.delete();
  mortise.delete();

  if (originalSection && shrunkSection) {
    const svg = generateDiagnosticSVG(originalSection, shrunkSection, 
      { cx: safeZone.buildCenterX, cy: safeZone.buildCenterY, w: mortiseW, h: mortiseH },
      { centerX: safeZone.buildCenterX, centerY: safeZone.buildCenterY, maxRadius: safeZone.maxRadius }
    );
    diagnosticSvgs.push({ name: diagnosticName, svg });
  }

  let tenon: Manifold | null = null;
  let tenonWorldPos: [number, number, number] | undefined = undefined;
  if (generateTenon) {
    // For X-split, tenon orientation is [L, W, H]
    // For Y-split, tenon orientation is [W, L, H]
    if (splitAxis === 'x') {
      tenon = wasm.Manifold.cube([tenonLength, tenonW, tenonH], true);
      tenonWorldPos = [cutOffset, safeZone.perpCenter, safeZone.zCenter];
    } else {
      tenon = wasm.Manifold.cube([tenonW, tenonLength, tenonH], true);
      tenonWorldPos = [safeZone.perpCenter, cutOffset, safeZone.zCenter];
    }
  }

  return { piece: result, tenon, tenonWorldPos };
}

// --- Tongue & groove ---

function applyTongueGroove(
  wasm: ManifoldToplevel,
  piece: Manifold,
  side: 'tongue' | 'groove',
  splitAxis: 'x' | 'y',
  cutOffset: number,
  safeZone: SafeZone,
  settings: TongueGrooveSettings,
  originalSection: CrossSection | null,
  shrunkSection: CrossSection | null,
  diagnosticSvgs: DiagnosticSvg[],
  diagnosticName: string
): Manifold {
  const { tongueLength, toleranceXY, toleranceZ, fillFraction } = settings;

  const maxGrooveSide = safeZone.maxRadius * Math.SQRT2;
  const maxTongueSide = maxGrooveSide - 2 * toleranceXY;
  const tongueW = Math.min(safeZone.safeWidth * fillFraction, maxTongueSide);
  const tongueH = Math.min(safeZone.safeHeight * fillFraction, maxTongueSide);

  if (side === 'tongue') {
    const overlap = 1;
    const totalLen = tongueLength + overlap;
    const tongueBox = createJoineryBox(
      wasm, splitAxis, cutOffset, totalLen / 2 - overlap,
      totalLen, tongueW, tongueH,
      safeZone.perpCenter, safeZone.zCenter
    );

    const result = wasm.Manifold.union(piece, tongueBox);
    piece.delete();
    tongueBox.delete();

    if (originalSection && shrunkSection) {
      const grooveW = tongueW + 2 * toleranceXY;
      const grooveH = tongueH + 2 * toleranceXY;
      const svg = generateDiagnosticSVG(originalSection, shrunkSection,
        { cx: safeZone.buildCenterX, cy: safeZone.buildCenterY, w: grooveW, h: grooveH },
        { centerX: safeZone.buildCenterX, centerY: safeZone.buildCenterY, maxRadius: safeZone.maxRadius }
      );
      diagnosticSvgs.push({ name: diagnosticName, svg });
    }

    return result;
  } else {
    const grooveW = tongueW + 2 * toleranceXY;
    const grooveH = tongueH + 2 * toleranceXY;
    const grooveLen = tongueLength + toleranceZ;
    const overlap = 1;
    const totalLen = grooveLen + overlap;
    const grooveBox = createJoineryBox(
      wasm, splitAxis, cutOffset, totalLen / 2 - overlap,
      totalLen, grooveW, grooveH,
      safeZone.perpCenter, safeZone.zCenter
    );

    const result = wasm.Manifold.difference(piece, grooveBox);
    piece.delete();
    grooveBox.delete();
    return result;
  }
}

/**
 * Build individual frame sides and split oversized ones for build plate fitting.
 */
export function splitFrameForExport(
  wasm: ManifoldToplevel,
  params: FrameParams,
  plateWidth: number,
  plateDepth: number,
  connector: ConnectorSettings
): { parts: SplitPart[]; splitInfo: SplitPlan & { totalParts: number }; diagnosticSvgs: DiagnosticSvg[] } {
  const dims = computeDimensions(params);
  const plan = computeSplitPlan(dims, plateWidth, plateDepth);
  const profile = getProfileForParams(params);

  // Build the 2D cross-section
  let crossSection: CrossSection;
  if (params.frameStyle === 'stamp') {
    crossSection = buildRectangularCrossSection(wasm, params.frameWidth, params.frameDepth);
  } else {
    crossSection = buildProfileCrossSection(
      wasm,
      profile,
      params.frameWidth,
      params.frameDepth,
      params.rabbetWidth,
      params.rabbetDepth
    );
  }

  const fw = params.frameWidth;
  let bottomRaw: Manifold, topRaw: Manifold, leftRaw: Manifold, rightRaw: Manifold;
  let bottomLen: number, topLen: number, leftLen: number, rightLen: number;

  if (params.frameStyle === 'stamp') {
    if (params.stampCornerStyle === 'butt-h') {
      bottomLen = dims.outerWidth;
      topLen = dims.outerWidth;
      leftLen = dims.innerHeight;
      rightLen = dims.innerHeight;
    } else if (params.stampCornerStyle === 'butt-v') {
      bottomLen = dims.innerWidth;
      topLen = dims.innerWidth;
      leftLen = dims.outerHeight;
      rightLen = dims.outerHeight;
    } else {
      bottomLen = dims.outerWidth - fw;
      topLen = dims.outerWidth - fw;
      leftLen = dims.outerHeight - fw;
      rightLen = dims.outerHeight - fw;
    }
    bottomRaw = buildFlatSegment(wasm, crossSection, bottomLen);
    topRaw = buildFlatSegment(wasm, crossSection, topLen);
    leftRaw = buildFlatSegment(wasm, crossSection, leftLen);
    rightRaw = buildFlatSegment(wasm, crossSection, rightLen);

    // Apply stamps
    bottomRaw = applyStampPattern(wasm, bottomRaw, bottomLen, params);
    topRaw = applyStampPattern(wasm, topRaw, topLen, params);
    leftRaw = applyStampPattern(wasm, leftRaw, leftLen, params);
    rightRaw = applyStampPattern(wasm, rightRaw, rightLen, params);
  } else {
    bottomRaw = buildFrameSegment(wasm, crossSection, dims.outerWidth, fw);
    topRaw = buildFrameSegment(wasm, crossSection, dims.outerWidth, fw);
    leftRaw = buildFrameSegment(wasm, crossSection, dims.outerHeight, fw);
    rightRaw = buildFrameSegment(wasm, crossSection, dims.outerHeight, fw);
  }

  let bottomSide = positionBottomSegment(bottomRaw, dims, params);
  let topSide = positionTopSegment(topRaw, dims, params);
  let leftSide = positionLeftSegment(leftRaw, dims, params);
  let rightSide = positionRightSegment(rightRaw, dims, params);

  // Adjust positioning for stamps
  if (params.frameStyle === 'stamp') {
    if (params.stampCornerStyle === 'butt-h') {
      leftSide = leftSide.translate([0, fw, 0]);
      rightSide = rightSide.translate([0, -fw, 0]);
    } else if (params.stampCornerStyle === 'butt-v') {
      bottomSide = bottomSide.translate([-fw, 0, 0]);
      topSide = topSide.translate([fw, 0, 0]);
    }
  }

  // If stamp mode, subtract rabbet from each side
  if (params.frameStyle === 'stamp') {
    const { Manifold: M } = wasm;
    const rabbetW = dims.innerWidth + 2 * params.rabbetWidth;
    const rabbetH = dims.innerHeight + 2 * params.rabbetWidth;
    const rabbetBox = M.cube([rabbetW, rabbetH, params.rabbetDepth], false);
    const rabbetPositioned = rabbetBox.translate([
      -rabbetW / 2,
      -rabbetH / 2,
      -params.frameDepth / 2,
    ]);

    const b = M.difference(bottomSide, rabbetPositioned);
    const t = M.difference(topSide, rabbetPositioned);
    const l = M.difference(leftSide, rabbetPositioned);
    const r = M.difference(rightSide, rabbetPositioned);

    bottomSide.delete();
    topSide.delete();
    leftSide.delete();
    rightSide.delete();
    rabbetBox.delete();
    rabbetPositioned.delete();

    bottomSide = b;
    topSide = t;
    leftSide = l;
    rightSide = r;
  }

  const parts: SplitPart[] = [];
  const tenonParts: SplitPart[] = [];
  const diagnosticSvgs: DiagnosticSvg[] = [];

  processSide(wasm, bottomSide, 'bottom', plan.bottom, 'x',
    -dims.outerWidth / 2, dims.outerWidth / 2, dims, params, connector, crossSection, parts, tenonParts, diagnosticSvgs);
  processSide(wasm, topSide, 'top', plan.top, 'x',
    -dims.outerWidth / 2, dims.outerWidth / 2, dims, params, connector, crossSection, parts, tenonParts, diagnosticSvgs);
  processSide(wasm, leftSide, 'left', plan.left, 'y',
    -dims.outerHeight / 2, dims.outerHeight / 2, dims, params, connector, crossSection, parts, tenonParts, diagnosticSvgs);
  processSide(wasm, rightSide, 'right', plan.right, 'y',
    -dims.outerHeight / 2, dims.outerHeight / 2, dims, params, connector, crossSection, parts, tenonParts, diagnosticSvgs);

  // Append tenon parts to output
  parts.push(...tenonParts);

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
    diagnosticSvgs,
  };
}

/**
 * Process a single side: split into N pieces if needed, apply joinery at each cut.
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
  crossSection: CrossSection,
  parts: SplitPart[],
  tenonParts: SplitPart[],
  diagnosticSvgs: DiagnosticSvg[]
): void {
  if (pieceCount <= 1) {
    parts.push({ name: `${sideName}-1.stl`, manifold: wasm.Manifold.union([side]) });
    return;
  }

  const normal: [number, number, number] =
    splitAxis === 'x' ? [1, 0, 0] : [0, 1, 0];

  const span = axisMax - axisMin;
  const cutPositions: number[] = [];
  for (let i = 1; i < pieceCount; i++) {
    cutPositions.push(axisMin + (span * i) / pieceCount);
  }

  let safeZone: SafeZone | null = null;
  let shrunkSection: CrossSection | null = null;
  if (connector.type !== 'none') {
    const wallThickness = connector.type === 'floating-tenon'
      ? connector.floatingTenon.wallThickness
      : connector.tongueGroove.wallThickness;
    const result = computeSafeZone(crossSection, wallThickness, sideName, params, dims);
    if (result) {
      safeZone = result.safeZone;
      shrunkSection = result.shrunkSection;
    }
  }

  for (let j = 0; j < pieceCount; j++) {
    let piece = wasm.Manifold.union([side]); // clone

    if (j < pieceCount - 1) {
      piece = piece.trimByPlane(normal, cutPositions[j]);
    }

    if (j > 0) {
      const negNormal: [number, number, number] = [-normal[0], -normal[1], -normal[2]];
      piece = piece.trimByPlane(negNormal, -cutPositions[j - 1]);
    }

    if (connector.type === 'floating-tenon' && safeZone) {
      if (j < pieceCount - 1) {
        const { piece: withMortise, tenon, tenonWorldPos } = applyFloatingTenon(
          wasm, piece, splitAxis, cutPositions[j], safeZone,
          connector.floatingTenon, true,
          crossSection, shrunkSection, diagnosticSvgs,
          `diagnostic-${sideName}-${j + 1}.svg`
        );
        piece = withMortise;
        if (tenon && tenonWorldPos) {
          tenonParts.push({
            name: `tenon-${sideName}-${j + 1}.stl`,
            manifold: tenon,
            worldPos: tenonWorldPos,
          });
        }
      }

      if (j > 0) {
        const { piece: withMortise } = applyFloatingTenon(
          wasm, piece, splitAxis, cutPositions[j - 1], safeZone,
          connector.floatingTenon, false,
          null, null, diagnosticSvgs,
          `diagnostic-${sideName}-${j}-low.svg`
        );
        piece = withMortise;
      }
    } else if (connector.type === 'tongue-groove' && safeZone) {
      if (j < pieceCount - 1) {
        piece = applyTongueGroove(
          wasm, piece, 'tongue', splitAxis, cutPositions[j],
          safeZone, connector.tongueGroove,
          crossSection, shrunkSection, diagnosticSvgs,
          `diagnostic-${sideName}-${j + 1}.svg`
        );
      }

      if (j > 0) {
        piece = applyTongueGroove(
          wasm, piece, 'groove', splitAxis, cutPositions[j - 1],
          safeZone, connector.tongueGroove,
          null, null, diagnosticSvgs,
          `diagnostic-${sideName}-${j}-low.svg`
        );
      }
    }

    const name = `${sideName}-${j + 1}.stl`;
    parts.push({ name, manifold: piece });
  }

  if (shrunkSection) {
    shrunkSection.delete();
  }
}
