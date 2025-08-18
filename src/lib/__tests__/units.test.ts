import { MM_PER_IN, mmToIn, inToMm, formatLength } from '@/lib/units';

describe('units', () => {
  test('mmToIn and inToMm are inverses', () => {
    const mm = 25.4;
    const inches = mmToIn(mm);
    expect(inches).toBeCloseTo(1, 6);
    expect(inToMm(inches)).toBeCloseTo(mm, 6);
  });

  test('formatLength in mm uses default digits', () => {
    expect(formatLength(12.34567, 'mm')).toBe('12.346 mm');
  });

  test('formatLength in inches formats using converted value and custom digits', () => {
    const mm = 50.8; // 2 inches
    expect(formatLength(mm, 'in', 2)).toBe('2.00 in');
  });
});
