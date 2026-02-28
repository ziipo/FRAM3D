import type { PictureSize } from '../types/frame';

// Conversion constant
const INCH_TO_MM = 25.4;

export const pictureSizePresets: PictureSize[] = [
  // Common US sizes (inches)
  {
    id: '4x6',
    label: '4×6 in',
    dimensions: { width: 4 * INCH_TO_MM, height: 6 * INCH_TO_MM },
    isCustom: false,
  },
  {
    id: '5x7',
    label: '5×7 in',
    dimensions: { width: 5 * INCH_TO_MM, height: 7 * INCH_TO_MM },
    isCustom: false,
  },
  {
    id: '8x10',
    label: '8×10 in',
    dimensions: { width: 8 * INCH_TO_MM, height: 10 * INCH_TO_MM },
    isCustom: false,
  },
  {
    id: '8x12',
    label: '8×12 in',
    dimensions: { width: 8 * INCH_TO_MM, height: 12 * INCH_TO_MM },
    isCustom: false,
  },
  {
    id: '11x14',
    label: '11×14 in',
    dimensions: { width: 11 * INCH_TO_MM, height: 14 * INCH_TO_MM },
    isCustom: false,
  },
  // Square sizes
  {
    id: '4x4',
    label: '4×4 in',
    dimensions: { width: 4 * INCH_TO_MM, height: 4 * INCH_TO_MM },
    isCustom: false,
  },
  {
    id: '6x6',
    label: '6×6 in',
    dimensions: { width: 6 * INCH_TO_MM, height: 6 * INCH_TO_MM },
    isCustom: false,
  },
  {
    id: '8x8',
    label: '8×8 in',
    dimensions: { width: 8 * INCH_TO_MM, height: 8 * INCH_TO_MM },
    isCustom: false,
  },
  // ISO paper sizes (mm)
  {
    id: 'a5',
    label: 'A5 (148×210 mm)',
    dimensions: { width: 148, height: 210 },
    isCustom: false,
  },
  {
    id: 'a4',
    label: 'A4 (210×297 mm)',
    dimensions: { width: 210, height: 297 },
    isCustom: false,
  },
  {
    id: 'a3',
    label: 'A3 (297×420 mm)',
    dimensions: { width: 297, height: 420 },
    isCustom: false,
  },
  // Custom placeholder
  {
    id: 'custom',
    label: 'Custom',
    dimensions: { width: 150, height: 200 },
    isCustom: true,
  },
];

export const defaultPictureSizeId = '4x6';

export function getPictureSize(id: string): PictureSize | undefined {
  return pictureSizePresets.find((p) => p.id === id);
}
