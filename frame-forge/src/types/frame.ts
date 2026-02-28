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
}

// === Worker Messages ===
export interface GenerateMessage {
  type: 'generate';
  params: FrameParams;
}

export interface ResultMessage {
  type: 'result';
  mesh: {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
  };
  stlData: ArrayBuffer;
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

export type WorkerMessage = GenerateMessage;
export type WorkerResponse = ResultMessage | ErrorMessage | ProgressMessage;

// === Computed Dimensions ===
export interface ComputedDimensions {
  pictureWidth: number;
  pictureHeight: number;
  innerWidth: number;   // Picture + tolerance
  innerHeight: number;
  outerWidth: number;   // Inner + 2 * frameWidth
  outerHeight: number;
}
