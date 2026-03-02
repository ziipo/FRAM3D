import type { BuildPlatePreset } from '../types/frame';

export const buildPlatePresets: BuildPlatePreset[] = [
  { id: 'ender3', label: 'Ender 3 (220×220)', width: 220, depth: 220 },
  { id: 'bambu-a1', label: 'Bambu A1 / P1S / X1 (256×256)', width: 256, depth: 256 },
  { id: 'prusa-mk4', label: 'Prusa MK4/S (250×210)', width: 250, depth: 210 },
  { id: 'bambu-a1-mini', label: 'Bambu A1 Mini (180×180)', width: 180, depth: 180 },
  { id: 'prusa-mini', label: 'Prusa Mini (180×180)', width: 180, depth: 180 },
  { id: 'cr10', label: 'CR-10 / K1 Max (300×300)', width: 300, depth: 300 },
  { id: 'prusa-xl', label: 'Prusa XL (360×360)', width: 360, depth: 360 },
  { id: 'voron-2-350', label: 'Voron 2.4 350 (350×350)', width: 350, depth: 350 },
  { id: 'custom', label: 'Custom', width: 0, depth: 0 },
];

export const defaultBuildPlatePresetId = 'ender3';

export function getBuildPlatePreset(id: string): BuildPlatePreset | undefined {
  return buildPlatePresets.find((p) => p.id === id);
}
