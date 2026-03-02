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
  dowelDiameter: number;
  dowelDepth: number;
  dowelCount: number;

  // Split export state
  isSplitExporting: boolean;
  splitExportData: ArrayBuffer | null;
  splitInfo: SplitInfo | null;

  // Callback for triggering split export from ExportButton
  triggerSplitExport: (() => void) | null;

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
  setDowelDiameter: (diameter: number) => void;
  setDowelDepth: (depth: number) => void;
  setDowelCount: (count: number) => void;
  setSplitExporting: (exporting: boolean) => void;
  setSplitExportResult: (zipData: ArrayBuffer, info: SplitInfo) => void;
  clearSplitExport: () => void;
  setTriggerSplitExport: (fn: (() => void) | null) => void;
  resetToDefaults: () => void;
}

const defaultParams: FrameParams = {
  // Picture
  pictureSizeId: defaultPictureSizeId,
  customWidth: 150,
  customHeight: 200,
  tolerance: 1.0,

  // Frame
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
  connectorType: 'dowel' as ConnectorType,
  dowelDiameter: 6,
  dowelDepth: 10,
  dowelCount: 2,

  // Split export state
  isSplitExporting: false,
  splitExportData: null,
  splitInfo: null,
  triggerSplitExport: null,

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

  setDowelDiameter: (dowelDiameter) =>
    set({ dowelDiameter, splitExportData: null, splitInfo: null }),

  setDowelDepth: (dowelDepth) =>
    set({ dowelDepth, splitExportData: null, splitInfo: null }),

  setDowelCount: (dowelCount) =>
    set({ dowelCount, splitExportData: null, splitInfo: null }),

  setSplitExporting: (isSplitExporting) =>
    set({ isSplitExporting }),

  setSplitExportResult: (zipData, info) =>
    set({ splitExportData: zipData, splitInfo: info, isSplitExporting: false }),

  clearSplitExport: () =>
    set({ splitExportData: null, splitInfo: null }),

  setTriggerSplitExport: (fn) =>
    set({ triggerSplitExport: fn }),

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
    }),
}));

// Selector for getting all params as a FrameParams object
export function selectFrameParams(state: FrameState): FrameParams {
  return {
    pictureSizeId: state.pictureSizeId,
    customWidth: state.customWidth,
    customHeight: state.customHeight,
    tolerance: state.tolerance,
    frameWidth: state.frameWidth,
    frameDepth: state.frameDepth,
    profileId: state.profileId,
    rabbetWidth: state.rabbetWidth,
    rabbetDepth: state.rabbetDepth,
    displayUnit: state.displayUnit,
    customProfilePoints: state.customProfilePoints,
  };
}
