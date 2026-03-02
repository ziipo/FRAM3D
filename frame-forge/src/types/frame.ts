// === Units & Dimensions ===
export type Unit = 'mm' | 'in';

export interface Dimensions {
  width: number;  // Always stored in mm internally
  height: number; // Always stored in mm
}

// === Picture Size ===
export interface PictureSize {
  id: string;
  label: string;
  dimensions: Dimensions;
  isCustom: boolean;
}

// === Profile ===
export interface ProfilePoint {
  x: number; // 0..1 normalized (0 = inner edge, 1 = outer edge)
  y: number; // 0..1 normalized (0 = bottom, 1 = top)
  hx?: number; // handle offset X (relative to point, for the "out" direction)
  hy?: number; // handle offset Y (symmetric: "in" handle is mirrored)
}

export interface FrameProfile {
  id: string;
  name: string;
  points: ProfilePoint[];
  description: string;
}

// === Frame Parameters (complete state) ===
export interface FrameParams {
  // Picture
  pictureSizeId: string;
  customWidth: number;  // mm
  customHeight: number; // mm
  tolerance: number;    // mm, clearance around picture

  // Frame
  frameWidth: number;   // mm, width of the molding
  frameDepth: number;   // mm, total thickness
  profileId: string;

  // Rabbet
  rabbetWidth: number;  // mm
  rabbetDepth: number;  // mm

  // Display
  displayUnit: Unit;

  // Custom profile
  customProfilePoints: ProfilePoint[];
}

// === Build Plate ===
export interface BuildPlatePreset {
  id: string;
  label: string;
  width: number;  // mm
  depth: number;  // mm
}

// === Connectors ===
export type ConnectorType = 'none' | 'floating-tenon' | 'tongue-groove';

export interface FloatingTenonSettings {
  tenonLength: number;    // total length of loose insert (default 15)
  wallThickness: number;  // min wall around mortise (default 2)
  toleranceXY: number;    // XY clearance for sliding fit (default 0.2)
  toleranceZ: number;     // extra depth for glue pocket (default 0.5)
  fillFraction: number;   // fraction of safe zone to fill (default 0.8)
}

export interface TongueGrooveSettings {
  tongueLength: number;   // how far tongue protrudes past cut (default 10)
  wallThickness: number;  // min wall around joint (default 2)
  toleranceXY: number;    // XY clearance (default 0.2)
  toleranceZ: number;     // extra depth for groove (default 0.5)
  fillFraction: number;   // fraction of safe zone (default 0.8)
}

export interface ConnectorSettings {
  type: ConnectorType;
  floatingTenon: FloatingTenonSettings;
  tongueGroove: TongueGrooveSettings;
}

// === Split Info ===
export interface SplitInfo {
  bottomPieces: number;  // 1 = whole, 2+ = split into N pieces
  topPieces: number;
  leftPieces: number;
  rightPieces: number;
  totalParts: number;
}

// === Worker Messages ===
export interface GenerateMessage {
  type: 'generate';
  params: FrameParams;
}

export interface SplitExportMessage {
  type: 'split-export';
  params: FrameParams;
  buildPlate: { width: number; depth: number };
  connector: ConnectorSettings;
}

export interface ResultMessage {
  type: 'result';
  mesh: {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
  };
  stlData: ArrayBuffer;
  threemfData: ArrayBuffer;
}

export interface SplitExportResultMessage {
  type: 'split-export-result';
  zipData: ArrayBuffer;
  splitInfo: SplitInfo;
  diagnosticSvgs?: Array<{ name: string; svg: string }>;
}

export interface ErrorMessage {
  type: 'error';
  error: string;
}

export interface ProgressMessage {
  type: 'progress';
  stage: string;
  percent: number;
}

export type WorkerMessage = GenerateMessage | SplitExportMessage;
export type WorkerResponse = ResultMessage | SplitExportResultMessage | ErrorMessage | ProgressMessage;

// === Computed Dimensions ===
export interface ComputedDimensions {
  pictureWidth: number;
  pictureHeight: number;
  innerWidth: number;   // Picture + tolerance
  innerHeight: number;
  outerWidth: number;   // Inner + 2 * frameWidth
  outerHeight: number;
}
