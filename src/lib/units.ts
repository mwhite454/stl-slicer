export const MM_PER_IN = 25.4;

export function mmToIn(mm: number): number {
  return mm / MM_PER_IN;
}

export function inToMm(inches: number): number {
  return inches * MM_PER_IN;
}

export function formatLength(valueMm: number, units: 'mm' | 'in', digits = 3): string {
  if (units === 'mm') return `${valueMm.toFixed(digits)} mm`;
  const inches = mmToIn(valueMm);
  return `${inches.toFixed(digits)} in`;
}
