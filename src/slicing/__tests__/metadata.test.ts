import { buildSliceLayerMetadata } from '@/slicing/metadata';

describe('metadata builder', () => {
  test('builds metadata with correct plane/axisMap and extents', () => {
    const model: any = { paths: { a: { type: 'line', origin: [0, 0], end: [10, 10] } } };
    const meta = buildSliceLayerMetadata('z', model);
    expect(meta.plane).toBe('XY');
    expect(meta.axisMap).toEqual({ u: 'x', v: 'y' });
    expect(meta.vUpSign).toBe(1);
    expect(meta.uvExtents).toEqual({ minU: 0, minV: 0, maxU: 10, maxV: 10 });
  });

  test('returns zeroed uvExtents when makerjs returns null extents', () => {
    const model: any = { paths: {} }; // our makerjs mock returns null for no paths
    const meta = buildSliceLayerMetadata('x', model);
    expect(meta.uvExtents).toEqual({ minU: 0, minV: 0, maxU: 0, maxV: 0 });
  });
});
