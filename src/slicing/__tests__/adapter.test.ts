import { sliceToMakerModels } from '@/slicing/adapter';

// Mock core pipeline
jest.mock('@/slicing/core', () => ({
  parseStl: jest.fn(async () => ({ geometry: {} as any, boundingBox: {} as any })),
  sliceGeometry: jest.fn(() => ({
    makerJsModels: [
      { paths: { a: { type: 'line', origin: [0, 0], end: [1, 1] } } },
      { paths: { b: { type: 'line', origin: [2, 2], end: [3, 5] } } },
    ],
    layers: [
      {
        layerIndex: 0,
        zCoordinate: 0,
        axis: 'z',
        layerThickness: 1,
        plane: 'XY',
        axisMap: { u: 'x', v: 'y' },
        vUpSign: 1,
        uvExtents: { minU: 0, minV: 0, maxU: 1, maxV: 1 },
      },
      {
        layerIndex: 1,
        zCoordinate: 1,
        axis: 'z',
        layerThickness: 1,
        plane: 'XY',
        axisMap: { u: 'x', v: 'y' },
        vUpSign: 1,
        uvExtents: { minU: 2, minV: 2, maxU: 3, maxV: 5 },
      },
    ],
  })),
}));

describe('adapter.sliceToMakerModels', () => {
  test('returns maker models and enriched layers with metadata', async () => {
    const f = new File([new Uint8Array([1, 2, 3])], 'demo.stl');
    const { makerJsModels, layers } = await sliceToMakerModels(f, 'z', 1);

    expect(makerJsModels).toHaveLength(2);
    expect(layers).toHaveLength(2);
    // Verify extents are carried through and axis/plane match
    expect(layers[0].plane).toBe('XY');
    expect(layers[0].axisMap).toEqual({ u: 'x', v: 'y' });
    expect(layers[0].uvExtents).toEqual({ minU: 0, minV: 0, maxU: 1, maxV: 1 });

    expect(layers[1].uvExtents).toEqual({ minU: 2, minV: 2, maxU: 3, maxV: 5 });
  });
});
