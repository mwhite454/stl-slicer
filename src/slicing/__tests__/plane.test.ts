import { planeFromAxis, axisMapForPlane, getProjectionInfo } from '@/slicing/plane';

describe('plane utils', () => {
  test('planeFromAxis maps correctly', () => {
    expect(planeFromAxis('x')).toBe('YZ');
    expect(planeFromAxis('y')).toBe('XZ');
    expect(planeFromAxis('z')).toBe('XY');
  });

  test('axisMapForPlane maps correctly', () => {
    expect(axisMapForPlane('XY')).toEqual({ u: 'x', v: 'y' });
    expect(axisMapForPlane('XZ')).toEqual({ u: 'x', v: 'z' });
    expect(axisMapForPlane('YZ')).toEqual({ u: 'y', v: 'z' });
  });

  test('getProjectionInfo returns plane, axisMap, and vUpSign', () => {
    const zInfo = getProjectionInfo('z');
    expect(zInfo.plane).toBe('XY');
    expect(zInfo.axisMap).toEqual({ u: 'x', v: 'y' });
    expect(zInfo.vUpSign).toBe(1);

    const xInfo = getProjectionInfo('x');
    expect(xInfo.plane).toBe('YZ');
    expect(xInfo.axisMap).toEqual({ u: 'y', v: 'z' });
    expect(xInfo.vUpSign).toBe(1);
  });

  test('axisMapForPlane default branch returns XY mapping for invalid plane', () => {
    expect(axisMapForPlane('NOPE' as any)).toEqual({ u: 'x', v: 'y' });
  });
});
