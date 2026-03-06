import { create } from 'zustand';
import type { FrameParams, Unit, ProfilePoint, SplitInfo, ConnectorSettings } from '../types/frame';
import { defaultPictureSizeId } from '../data/presets';
import { defaultProfileId } from '../data/profiles';

interface FrameState extends FrameParams {
  // Generation state
  isGenerating: boolean;
  isProcessingCustomStamp: boolean;
  progress: number;
  progressStage: string;
  error: string | null;

  // Generated mesh data (for Three.js)
  meshData: {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
  } | null;

  // Split parts data
  splitParts: Array<{
    name: string;
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
    worldPos?: [number, number, number];
  }> | null;

  // STL data (for export)
  stlData: ArrayBuffer | null;

  // 3MF data (for export)
  threemfData: ArrayBuffer | null;

  // Build plate settings
  buildPlatePresetId: string;
  buildPlateCustomWidth: number;
  buildPlateCustomDepth: number;
  buildPlateEnabled: boolean;

  // Split export state
  isSplitExporting: boolean;
  splitExportData: ArrayBuffer | null;
  splitExportFormat: 'stl' | '3mf' | null;
  splitInfo: SplitInfo | null;

  // Callback for triggering split export from ExportButton
  triggerSplitExport: ((format: 'stl' | '3mf') => void) | null;

  // View reset state
  resetView: number;
  explosionGap: number;

  // Actions
  setParam: <K extends keyof FrameParams>(key: K, value: FrameParams[K]) => void;
  setParams: (params: Partial<FrameParams>) => void;
  setConnector: (connector: Partial<ConnectorSettings>) => void;
  setGenerating: (isGenerating: boolean) => void;
  setProcessingCustomStamp: (isProcessing: boolean) => void;
  setProgress: (percent: number, stage: string) => void;
  setError: (error: string | null) => void;
  setMeshData: (data: FrameState['meshData']) => void;
  setSplitParts: (data: FrameState['splitParts']) => void;
  setStlData: (data: ArrayBuffer | null) => void;
  setThreemfData: (data: ArrayBuffer | null) => void;
  setBuildPlatePresetId: (id: string) => void;
  setBuildPlateCustomWidth: (width: number) => void;
  setBuildPlateCustomDepth: (depth: number) => void;
  setBuildPlateEnabled: (enabled: boolean) => void;
  setExplosionGap: (v: number) => void;
  setSplitExporting: (exporting: boolean) => void;
  setSplitExportResult: (zipData: ArrayBuffer, format: 'stl' | '3mf', info: SplitInfo) => void;
  clearSplitExport: () => void;
  setTriggerSplitExport: (fn: (() => void) | null) => void;
  requestResetView: () => void;
  resetToDefaults: () => void;
}

const defaultParams: FrameParams = {
  // Picture
  pictureSizeId: defaultPictureSizeId,
  customWidth: 150,
  customHeight: 200,
  tolerance: 1.0,

  // Frame
  frameStyle: 'profile',
  stampType: 'dots',
  stampSpacing: 10,
  stampDepth: 2,
  stampCornerStyle: 'butt-h',
  stampPattern: 'repeating',
  customStampPolygons: [],
  stampSize: 1.0,
  stampRotation: 0,

  // Global Texture
  textureType: 'v-stripes',
  textureSpacing: 10,
  textureDepth: 2,
  textureRotation: 0,
  customTexturePolygons: [],

  frameWidth: 25,
  frameDepth: 15,
  profileId: defaultProfileId,

  // Joinery
  connector: {
    type: 'none',
    floatingTenon: {
      tenonLength: 8,
      wallThickness: 2,
      toleranceXY: 0.2,
      toleranceZ: 0.5,
      fillFraction: 0.8,
    },
    tongueGroove: {
      tongueLength: 4,
      wallThickness: 2,
      toleranceXY: 0.2,
      toleranceZ: 0.5,
      fillFraction: 0.8,
    },
  },

  // Rabbet
  rabbetWidth: 8,
  rabbetDepth: 5,

  // Display
  displayUnit: 'mm' as Unit,

  // Custom profile
  customProfilePoints: [{ x: 0, y: 1 }, { x: 1, y: 1 }] as ProfilePoint[],
};

export const useFrameStore = create<FrameState>((set) => ({
  // Initial parameter values
  ...defaultParams,

  // Generation state
  isGenerating: false,
  isProcessingCustomStamp: false,
  progress: 0,
  progressStage: '',
  error: null,

  // Generated data
  meshData: null,
  splitParts: null,
  stlData: null,
  threemfData: null,

  // Build plate settings
  buildPlatePresetId: 'ender3',
  buildPlateCustomWidth: 220,
  buildPlateCustomDepth: 220,
  buildPlateEnabled: false,

  // Split export state
  isSplitExporting: false,
  splitExportData: null,
  splitExportFormat: null,
  splitInfo: null,
  triggerSplitExport: null,

  // View reset state
  resetView: 0,
  explosionGap: 0,

  // Actions
  setParam: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
      // Clear any previous error and split export when params change
      error: null,
      splitExportData: null,
      splitInfo: null,
    })),

  setParams: (params) =>
    set((state) => ({
      ...state,
      ...params,
      error: null,
      splitExportData: null,
      splitInfo: null,
    })),

  setConnector: (connector) =>
    set((state) => ({
      ...state,
      connector: {
        ...state.connector,
        ...connector,
      },
      error: null,
      splitExportData: null,
      splitInfo: null,
    })),

  setGenerating: (isGenerating) =>
    set(isGenerating ? { isGenerating, error: null } : { isGenerating }),

  setProcessingCustomStamp: (isProcessingCustomStamp) =>
    set({ isProcessingCustomStamp }),

  setProgress: (progress, progressStage) =>
    set({ progress, progressStage }),

  setError: (error) =>
    set({ error, isGenerating: false }),

  setMeshData: (meshData) =>
    set({ meshData, isGenerating: false }),

  setSplitParts: (splitParts) =>
    set({ splitParts }),

  setStlData: (stlData) =>
    set({ stlData }),

  setThreemfData: (threemfData) =>
    set({ threemfData }),

  setBuildPlatePresetId: (buildPlatePresetId) =>
    set({ buildPlatePresetId, splitExportData: null, splitInfo: null }),

  setBuildPlateCustomWidth: (buildPlateCustomWidth) =>
    set({ buildPlateCustomWidth, splitExportData: null, splitInfo: null }),

  setBuildPlateCustomDepth: (buildPlateCustomDepth) =>
    set({ buildPlateCustomDepth, splitExportData: null, splitInfo: null }),

  setBuildPlateEnabled: (buildPlateEnabled) =>
    set({ buildPlateEnabled }),

  setExplosionGap: (explosionGap) =>
    set({ explosionGap }),

  setSplitExporting: (isSplitExporting) =>
    set({ isSplitExporting }),

  setSplitExportResult: (zipData, format, info) =>
    set({ splitExportData: zipData, splitExportFormat: format, splitInfo: info, isSplitExporting: false }),

  clearSplitExport: () =>
    set({ splitExportData: null, splitExportFormat: null, splitInfo: null }),

  setTriggerSplitExport: (fn) =>
    set({ triggerSplitExport: fn }),

  requestResetView: () =>
    set((state) => ({ resetView: state.resetView + 1 })),

  resetToDefaults: () =>
    set({
      ...defaultParams,
      isGenerating: false,
      isProcessingCustomStamp: false,
      progress: 0,
      progressStage: '',
      error: null,
      meshData: null,
      splitParts: null,
      stlData: null,
      threemfData: null,
      splitExportData: null,
      splitExportFormat: null,
      splitInfo: null,
      isSplitExporting: false,
      resetView: 0,
      explosionGap: 0,
    }),
}));

// DEBUG: expose store for console access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__frameStore = useFrameStore;

// Selector for getting all params as a FrameParams object
export function selectFrameParams(state: FrameState): FrameParams {
  return {
    pictureSizeId: state.pictureSizeId,
    customWidth: state.customWidth,
    customHeight: state.customHeight,
    tolerance: state.tolerance,
    frameStyle: state.frameStyle,
    stampType: state.stampType,
    stampSpacing: state.stampSpacing,
    stampDepth: state.stampDepth,
    stampCornerStyle: state.stampCornerStyle,
    stampPattern: state.stampPattern,
    customStampPolygons: state.customStampPolygons,
    stampSize: state.stampSize,
    stampRotation: state.stampRotation,
    textureType: state.textureType,
    textureSpacing: state.textureSpacing,
    textureDepth: state.textureDepth,
    textureRotation: state.textureRotation,
    customTexturePolygons: state.customTexturePolygons,
    frameWidth: state.frameWidth,
    frameDepth: state.frameDepth,
    profileId: state.profileId,
    connector: state.connector,
    rabbetWidth: state.rabbetWidth,
    rabbetDepth: state.rabbetDepth,
    displayUnit: state.displayUnit,
    customProfilePoints: state.customProfilePoints,
  };
}
