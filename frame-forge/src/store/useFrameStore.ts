import { create } from 'zustand';
import type { FrameParams, Unit } from '../types/frame';
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

  // Actions
  setParam: <K extends keyof FrameParams>(key: K, value: FrameParams[K]) => void;
  setParams: (params: Partial<FrameParams>) => void;
  setGenerating: (isGenerating: boolean) => void;
  setProgress: (percent: number, stage: string) => void;
  setError: (error: string | null) => void;
  setMeshData: (data: FrameState['meshData']) => void;
  setStlData: (data: ArrayBuffer | null) => void;
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

  // Actions
  setParam: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
      // Clear any previous error when params change
      error: null,
    })),

  setParams: (params) =>
    set((state) => ({
      ...state,
      ...params,
      error: null,
    })),

  setGenerating: (isGenerating) =>
    set({ isGenerating, error: isGenerating ? null : undefined }),

  setProgress: (progress, progressStage) =>
    set({ progress, progressStage }),

  setError: (error) =>
    set({ error, isGenerating: false }),

  setMeshData: (meshData) =>
    set({ meshData, isGenerating: false }),

  setStlData: (stlData) =>
    set({ stlData }),

  resetToDefaults: () =>
    set({
      ...defaultParams,
      isGenerating: false,
      progress: 0,
      progressStage: '',
      error: null,
      meshData: null,
      stlData: null,
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
  };
}
