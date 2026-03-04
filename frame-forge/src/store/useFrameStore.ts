import { create } from 'zustand';
import type { FrameParams, Unit, ProfilePoint, ConnectorType, SplitInfo } from '../types/frame';
import { defaultPictureSizeId } from '../data/presets';
import { defaultProfileId } from '../data/profiles';

interface FrameState extends FrameParams {
  // Generation state
  isGenerating: boolean;
  progress: number;
  progressStage: string;
  error: string | null;

  // Generated mesh data (for Three.js)
  meshData: {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
  } | null;

  // STL data (for export)
  stlData: ArrayBuffer | null;

  // 3MF data (for export)
  threemfData: ArrayBuffer | null;

  // Build plate settings
  buildPlatePresetId: string;
  buildPlateCustomWidth: number;
  buildPlateCustomDepth: number;
  buildPlateEnabled: boolean;

  // Connector settings
  connectorType: ConnectorType;
  floatingTenonLength: number;
  floatingTenonWallThickness: number;
  floatingTenonToleranceXY: number;
  floatingTenonToleranceZ: number;
  floatingTenonFillFraction: number;
  tongueGrooveLength: number;
  tongueGrooveWallThickness: number;
  tongueGrooveToleranceXY: number;
  tongueGrooveToleranceZ: number;
  tongueGrooveFillFraction: number;

  // Split export state
  isSplitExporting: boolean;
  splitExportData: ArrayBuffer | null;
  splitInfo: SplitInfo | null;

  // Callback for triggering split export from ExportButton
  triggerSplitExport: (() => void) | null;

  // View reset state
  resetView: number;

  // Actions
  setParam: <K extends keyof FrameParams>(key: K, value: FrameParams[K]) => void;
  setParams: (params: Partial<FrameParams>) => void;
  setGenerating: (isGenerating: boolean) => void;
  setProgress: (percent: number, stage: string) => void;
  setError: (error: string | null) => void;
  setMeshData: (data: FrameState['meshData']) => void;
  setStlData: (data: ArrayBuffer | null) => void;
  setThreemfData: (data: ArrayBuffer | null) => void;
  setBuildPlatePresetId: (id: string) => void;
  setBuildPlateCustomWidth: (width: number) => void;
  setBuildPlateCustomDepth: (depth: number) => void;
  setBuildPlateEnabled: (enabled: boolean) => void;
  setConnectorType: (type: ConnectorType) => void;
  setFloatingTenonLength: (v: number) => void;
  setFloatingTenonWallThickness: (v: number) => void;
  setFloatingTenonToleranceXY: (v: number) => void;
  setFloatingTenonToleranceZ: (v: number) => void;
  setFloatingTenonFillFraction: (v: number) => void;
  setTongueGrooveLength: (v: number) => void;
  setTongueGrooveWallThickness: (v: number) => void;
  setTongueGrooveToleranceXY: (v: number) => void;
  setTongueGrooveToleranceZ: (v: number) => void;
  setTongueGrooveFillFraction: (v: number) => void;
  setSplitExporting: (exporting: boolean) => void;
  setSplitExportResult: (zipData: ArrayBuffer, info: SplitInfo) => void;
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
  frameWidth: 25,
  frameDepth: 15,
  profileId: defaultProfileId,

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
  progress: 0,
  progressStage: '',
  error: null,

  // Generated data
  meshData: null,
  stlData: null,
  threemfData: null,

  // Build plate settings
  buildPlatePresetId: 'ender3',
  buildPlateCustomWidth: 220,
  buildPlateCustomDepth: 220,
  buildPlateEnabled: false,

  // Connector settings
  connectorType: 'floating-tenon' as ConnectorType,
  floatingTenonLength: 15,
  floatingTenonWallThickness: 2,
  floatingTenonToleranceXY: 0.2,
  floatingTenonToleranceZ: 0.5,
  floatingTenonFillFraction: 0.8,
  tongueGrooveLength: 10,
  tongueGrooveWallThickness: 2,
  tongueGrooveToleranceXY: 0.2,
  tongueGrooveToleranceZ: 0.5,
  tongueGrooveFillFraction: 0.8,

  // Split export state
  isSplitExporting: false,
  splitExportData: null,
  splitInfo: null,
  triggerSplitExport: null,

  // View reset state
  resetView: 0,

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

  setGenerating: (isGenerating) =>
    set(isGenerating ? { isGenerating, error: null } : { isGenerating }),

  setProgress: (progress, progressStage) =>
    set({ progress, progressStage }),

  setError: (error) =>
    set({ error, isGenerating: false }),

  setMeshData: (meshData) =>
    set({ meshData, isGenerating: false }),

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

  setConnectorType: (connectorType) =>
    set({ connectorType, splitExportData: null, splitInfo: null }),

  setFloatingTenonLength: (floatingTenonLength) =>
    set({ floatingTenonLength, splitExportData: null, splitInfo: null }),

  setFloatingTenonWallThickness: (floatingTenonWallThickness) =>
    set({ floatingTenonWallThickness, splitExportData: null, splitInfo: null }),

  setFloatingTenonToleranceXY: (floatingTenonToleranceXY) =>
    set({ floatingTenonToleranceXY, splitExportData: null, splitInfo: null }),

  setFloatingTenonToleranceZ: (floatingTenonToleranceZ) =>
    set({ floatingTenonToleranceZ, splitExportData: null, splitInfo: null }),

  setFloatingTenonFillFraction: (floatingTenonFillFraction) =>
    set({ floatingTenonFillFraction, splitExportData: null, splitInfo: null }),

  setTongueGrooveLength: (tongueGrooveLength) =>
    set({ tongueGrooveLength, splitExportData: null, splitInfo: null }),

  setTongueGrooveWallThickness: (tongueGrooveWallThickness) =>
    set({ tongueGrooveWallThickness, splitExportData: null, splitInfo: null }),

  setTongueGrooveToleranceXY: (tongueGrooveToleranceXY) =>
    set({ tongueGrooveToleranceXY, splitExportData: null, splitInfo: null }),

  setTongueGrooveToleranceZ: (tongueGrooveToleranceZ) =>
    set({ tongueGrooveToleranceZ, splitExportData: null, splitInfo: null }),

  setTongueGrooveFillFraction: (tongueGrooveFillFraction) =>
    set({ tongueGrooveFillFraction, splitExportData: null, splitInfo: null }),

  setSplitExporting: (isSplitExporting) =>
    set({ isSplitExporting }),

  setSplitExportResult: (zipData, info) =>
    set({ splitExportData: zipData, splitInfo: info, isSplitExporting: false }),

  clearSplitExport: () =>
    set({ splitExportData: null, splitInfo: null }),

  setTriggerSplitExport: (fn) =>
    set({ triggerSplitExport: fn }),

  requestResetView: () =>
    set((state) => ({ resetView: state.resetView + 1 })),

  resetToDefaults: () =>
    set({
      ...defaultParams,
      isGenerating: false,
      progress: 0,
      progressStage: '',
      error: null,
      meshData: null,
      stlData: null,
      threemfData: null,
      splitExportData: null,
      splitInfo: null,
      isSplitExporting: false,
      resetView: 0,
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
    frameWidth: state.frameWidth,
    frameDepth: state.frameDepth,
    profileId: state.profileId,
    rabbetWidth: state.rabbetWidth,
    rabbetDepth: state.rabbetDepth,
    displayUnit: state.displayUnit,
    customProfilePoints: state.customProfilePoints,
  };
}
