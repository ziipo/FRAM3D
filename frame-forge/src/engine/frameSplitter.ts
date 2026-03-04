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
  safeWidth: number;
  safeHeight: number;
  maxRadius: number;
  buildCenterX: number;
  buildCenterY: number;
}

/**
 * Find the "pole of inaccessibility"
 */
function findPoleOfInaccessibility(
  safeZoneSection: CrossSection
): { centerX: number; centerY: number; maxRadius: number } {
  const STEP = 1.0;
  const MIN_AREA = 0.01;

  let current = safeZoneSection.offset(0); // clone
  let maxRadius = 0;

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
 * Generate a diagnostic SVG showing the profile cross-section, safe zone, etc.
 */
function generateDiagnosticSVG(
  originalSection: CrossSection,
  safeZoneSection: CrossSection,
  mortise: { cx: number; cy: number; w: number; h: number },
  pole: { centerX: number; centerY: number; maxRadius: number }
): string {
  const PAD = 2;

  function sectionToPath(section: CrossSection): string {
    const polys = section.toPolygons();
    const parts: string[] = [];
    for (const poly of polys) {
      if (poly.length === 0) continue;
      const commands: string[] = [];
      for (let i = 0; i < poly.length; i++) {
        const x = poly[i][0];
        const y = -poly[i][1];
        commands.push(i === 0 ? `M${x},${y}` : `L${x},${y}`);
      }
      commands.push('Z');
      parts.push(commands.join(' '));
    }
    return parts.join(' ');
  }

  const ob = originalSection.bounds();
  const vx = ob.min[0] - PAD;
  const vy = -(ob.max[1] + PAD);
  const vw = ob.max[0] - ob.min[0] + 2 * PAD;
  const vh = ob.max[1] - ob.min[1] + 2 * PAD;

  const profilePath = sectionToPath(originalSection);
  const safeZonePath = sectionToPath(safeZoneSection);

  const rx = mortise.cx - mortise.w / 2;
  const ry = -(mortise.cy + mortise.h / 2);
  const rw = mortise.w;
  const rh = mortise.h;

  const px = pole.centerX;
  const py = -pole.centerY;

  const strokeW = Math.max(vw, vh) * 0.005;
  const dotR = strokeW * 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}">`,
    `  <path d="${profilePath}" fill="#ccc" stroke="#666" stroke-width="${strokeW}" />`,
    `  <path d="${safeZonePath}" fill="rgba(0,180,0,0.4)" stroke="green" stroke-width="${strokeW}" />`,
    `  <circle cx="${px}" cy="${py}" r="${pole.maxRadius}" fill="none" stroke="blue" stroke-width="${strokeW}" stroke-dasharray="${strokeW * 4} ${strokeW * 2}" />`,
    `  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="rgba(255,0,0,0.6)" stroke="red" stroke-width="${strokeW}" />`,
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
  direction: 1 | -1,
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
    const splitOffset = direction === 1 ? (totalLen / 2 - overlap) : -(totalLen / 2 - overlap);
    const tongueBox = createJoineryBox(
      wasm, splitAxis, cutOffset, splitOffset,
      totalLen, tongueW, tongueH,
      safeZone.perpCenter, safeZone.zCenter
    );

    const result = wasm.Manifold.union(piece, tongueBox);
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
    const splitOffset = direction === 1 ? (totalLen / 2 - overlap) : -(totalLen / 2 - overlap);
    const grooveBox = createJoineryBox(
      wasm, splitAxis, cutOffset, splitOffset,
      totalLen, grooveW, grooveH,
      safeZone.perpCenter, safeZone.zCenter
    );

    const result = wasm.Manifold.difference(piece, grooveBox);
    grooveBox.delete();
    return result;
  }
}

/**
 * Build individual frame sides and split them.
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

  // Apply corner joinery for Stamped Butt joints
  if (params.frameStyle === 'stamp' && connector.type !== 'none') {
    if (params.stampCornerStyle === 'butt-h') {
      const wallThickness = connector.type === 'floating-tenon' ? connector.floatingTenon.wallThickness : connector.tongueGroove.wallThickness;
      const res = computeSafeZone(crossSection, wallThickness, 'bottom', params, dims);
      if (res) {
        const { safeZone, shrunkSection } = res;
        const blX = -dims.innerWidth / 2 - fw / 2;
        const brX = dims.innerWidth / 2 + fw / 2;
        
        // bl - bottom cap gets tongue pointing UP (+y) into left side
        const [b1, l1] = applyCornerJoinery(wasm, bottomSide, leftSide, 'y', -dims.innerHeight / 2, true, { ...safeZone, perpCenter: blX }, connector, crossSection, shrunkSection, diagnosticSvgs, 'corner-bl', tenonParts);
        bottomSide.delete(); leftSide.delete(); bottomSide = b1; leftSide = l1;
        
        // br - bottom cap gets tongue pointing UP (+y) into right side
        const [b2, r1] = applyCornerJoinery(wasm, bottomSide, rightSide, 'y', -dims.innerHeight / 2, true, { ...safeZone, perpCenter: brX }, connector, crossSection, shrunkSection, diagnosticSvgs, 'corner-br', tenonParts);
        bottomSide.delete(); rightSide.delete(); bottomSide = b2; rightSide = r1;
        
        // tl - top cap gets tongue pointing DOWN (-y) into left side
        const [t1, l2] = applyCornerJoinery(wasm, topSide, leftSide, 'y', dims.innerHeight / 2, false, { ...safeZone, perpCenter: blX }, connector, crossSection, shrunkSection, diagnosticSvgs, 'corner-tl', tenonParts);
        topSide.delete(); leftSide.delete(); topSide = t1; leftSide = l2;
        
        // tr - top cap gets tongue pointing DOWN (-y) into right side
        const [t2, r2] = applyCornerJoinery(wasm, topSide, rightSide, 'y', dims.innerHeight / 2, false, { ...safeZone, perpCenter: brX }, connector, crossSection, shrunkSection, diagnosticSvgs, 'corner-tr', tenonParts);
        topSide.delete(); rightSide.delete(); topSide = t2; rightSide = r2;
      }
    } else if (params.stampCornerStyle === 'butt-v') {
      const wallThickness = connector.type === 'floating-tenon' ? connector.floatingTenon.wallThickness : connector.tongueGroove.wallThickness;
      const res = computeSafeZone(crossSection, wallThickness, 'left', params, dims);
      if (res) {
        const { safeZone, shrunkSection } = res;
        const tlY = dims.innerHeight / 2 + fw / 2;
        const blY = -dims.innerHeight / 2 - fw / 2;
        
        // tl - left cap gets tongue pointing RIGHT (+x) into top side
        const [l1, t1] = applyCornerJoinery(wasm, leftSide, topSide, 'x', -dims.innerWidth / 2, true, { ...safeZone, perpCenter: tlY }, connector, crossSection, shrunkSection, diagnosticSvgs, 'corner-tl', tenonParts);
        leftSide.delete(); topSide.delete(); leftSide = l1; topSide = t1;
        
        // bl - left cap gets tongue pointing RIGHT (+x) into bottom side
        const [l2, b1] = applyCornerJoinery(wasm, leftSide, bottomSide, 'x', -dims.innerWidth / 2, true, { ...safeZone, perpCenter: blY }, connector, crossSection, shrunkSection, diagnosticSvgs, 'corner-bl', tenonParts);
        leftSide.delete(); bottomSide.delete(); leftSide = l2; bottomSide = b1;
        
        // tr - right cap gets tongue pointing LEFT (-x) into top side
        const [r1, t2] = applyCornerJoinery(wasm, rightSide, topSide, 'x', dims.innerWidth / 2, false, { ...safeZone, perpCenter: tlY }, connector, crossSection, shrunkSection, diagnosticSvgs, 'corner-tr', tenonParts);
        rightSide.delete(); topSide.delete(); rightSide = r1; topSide = t2;
        
        // br - right cap gets tongue pointing LEFT (-x) into bottom side
        const [r2, b2] = applyCornerJoinery(wasm, rightSide, bottomSide, 'x', dims.innerWidth / 2, false, { ...safeZone, perpCenter: blY }, connector, crossSection, shrunkSection, diagnosticSvgs, 'corner-br', tenonParts);
        rightSide.delete(); bottomSide.delete(); rightSide = r2; bottomSide = b2;
      }
    }
  }

  processSide(wasm, bottomSide, 'bottom', plan.bottom, 'x',
    -dims.outerWidth / 2, dims.outerWidth / 2, dims, params, connector, crossSection, parts, tenonParts, diagnosticSvgs);
  processSide(wasm, topSide, 'top', plan.top, 'x',
    -dims.outerWidth / 2, dims.outerWidth / 2, dims, params, connector, crossSection, parts, tenonParts, diagnosticSvgs);
  processSide(wasm, leftSide, 'left', plan.left, 'y',
    -dims.outerHeight / 2, dims.outerHeight / 2, dims, params, connector, crossSection, parts, tenonParts, diagnosticSvgs);
  processSide(wasm, rightSide, 'right', plan.right, 'y',
    -dims.outerHeight / 2, dims.outerHeight / 2, dims, params, connector, crossSection, parts, tenonParts, diagnosticSvgs);

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
 * Apply joinery between two corner segments. Returns the two new pieces.
 */
function applyCornerJoinery(
  wasm: ManifoldToplevel,
  pieceA: Manifold,
  pieceB: Manifold,
  splitAxis: 'x' | 'y',
  cutOffset: number,
  pieceAIsNegative: boolean,
  safeZone: SafeZone,
  connector: ConnectorSettings,
  crossSection: CrossSection,
  shrunkSection: CrossSection,
  diagnosticSvgs: DiagnosticSvg[],
  diagName: string,
  tenonParts: SplitPart[]
): [Manifold, Manifold] {
  if (connector.type === 'floating-tenon') {
    const { piece: resA, tenon, tenonWorldPos } = applyFloatingTenon(
      wasm, wasm.Manifold.union([pieceA]), splitAxis, cutOffset, safeZone,
      connector.floatingTenon, true,
      crossSection, shrunkSection, diagnosticSvgs, diagName
    );
    
    if (tenon && tenonWorldPos) {
      tenonParts.push({ name: `tenon-${diagName}.stl`, manifold: tenon, worldPos: tenonWorldPos });
    }
    
    const { piece: resB } = applyFloatingTenon(
      wasm, wasm.Manifold.union([pieceB]), splitAxis, cutOffset, safeZone,
      connector.floatingTenon, false, null, null, [], ''
    );
    
    return [resA, resB];
    
  } else if (connector.type === 'tongue-groove') {
    const direction = pieceAIsNegative ? 1 : -1;
    const resA = applyTongueGroove(
      wasm, wasm.Manifold.union([pieceA]), 'tongue', splitAxis, cutOffset, direction,
      safeZone, connector.tongueGroove, crossSection, shrunkSection, diagnosticSvgs, diagName
    );
    
    const resB = applyTongueGroove(
      wasm, wasm.Manifold.union([pieceB]), 'groove', splitAxis, cutOffset, direction,
      safeZone, connector.tongueGroove, null, null, [], ''
    );
    
    return [resA, resB];
  }
  return [wasm.Manifold.union([pieceA]), wasm.Manifold.union([pieceB])];
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
          wasm, piece, 'tongue', splitAxis, cutPositions[j], 1,
          safeZone, connector.tongueGroove,
          crossSection, shrunkSection, diagnosticSvgs,
          `diagnostic-${sideName}-${j + 1}.svg`
        );
      }

      if (j > 0) {
        piece = applyTongueGroove(
          wasm, piece, 'groove', splitAxis, cutPositions[j - 1], 1,
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
