import type { Unit } from '../types/frame';

export const MM_PER_INCH = 25.4;

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

export function convertToUnit(mm: number, unit: Unit): number {
  return unit === 'in' ? mmToInches(mm) : mm;
}

export function convertFromUnit(value: number, unit: Unit): number {
  return unit === 'in' ? inchesToMm(value) : value;
}

export function formatDimension(mm: number, unit: Unit, decimals: number = 1): string {
  const value = convertToUnit(mm, unit);
  return `${value.toFixed(decimals)} ${unit}`;
}
