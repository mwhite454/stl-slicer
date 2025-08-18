import { sliceGeometry } from '@/slicing/core';
import type { SlicerState } from '@/slicing/types';

// Minimal mock BufferAttribute-like object
function makePositionAttribute(vertices: Array<{ x: number; y: number; z: number }>) {
  return {
    getX: (i: number) => vertices[i].x,
    getY: (i: number) => vertices[i].y,
    getZ: (i: number) => vertices[i].z,
  } as any;
}

// Minimal mock index buffer for a single triangle [0,1,2]
const singleTriangleIndex = {
  count: 3,
  getX: (i: number) => [0, 1, 2][i],
} as any;

// Empty index for geometry with no triangles
const emptyIndex = {
  count: 0,
  getX: (_i: number) => 0,
} as any;

function makeGeometry(vertices: Array<{ x: number; y: number; z: number }>, useEmptyIndex = false) {
  return {
    getAttribute: (name: string) => (name === 'position' ? makePositionAttribute(vertices) : null),
    getIndex: () => (useEmptyIndex ? emptyIndex : singleTriangleIndex),
  } as any;
}

function makeBox(min: { x: number; y: number; z: number }, max: { x: number; y: number; z: number }) {
  return { min, max } as any;
}

describe('core.sliceGeometry', () => {
  test('computes layer count and zCoordinates based on thickness and bounds', () => {
    const state: SlicerState = {
      geometry: makeGeometry([], true), // no triangles needed for this test
      boundingBox: makeBox({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }),
    } as any;

    // thickness exactly fits -> 2 layers (minLayers) at 0 and 10
    let res = sliceGeometry(state, 'z', 5);
    expect(res.layers.length).toBe(2);
    expect(res.layers[0].zCoordinate).toBe(0);
    expect(res.layers[1].zCoordinate).toBe(10);

    // thinner slices -> more layers
    res = sliceGeometry(state, 'z', 3);
    expect(res.layers.length).toBe(4); // ceil(10/3)=4
    const coords = res.layers.map((l) => l.zCoordinate);
    // adjusted spacing is 10/(4-1)=3.333...
    expect(coords[0]).toBeCloseTo(0, 6);
    expect(coords[1]).toBeCloseTo(10 / 3, 6);
    expect(coords[2]).toBeCloseTo(20 / 3, 6);
    expect(coords[3]).toBeCloseTo(10, 6);

    // plane/axisMap propagation
    expect(res.layers[0].plane).toBe('XY');
    expect(res.layers[0].axisMap).toEqual({ u: 'x', v: 'y' });
  });

  test('slices a single triangle along z and projects to XY plane with correct UV extents', () => {
    // Triangle vertices
    const v0 = { x: 0, y: 0, z: 0 };
    const v1 = { x: 10, y: 0, z: 10 };
    const v2 = { x: 0, y: 10, z: 10 };
    const geometry = makeGeometry([v0, v1, v2]);

    const state: SlicerState = {
      geometry,
      boundingBox: makeBox({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }),
    } as any;

    // Choose thickness to produce layers at z=0 and z=10
    const { makerJsModels, layers } = sliceGeometry(state, 'z', 10);
    expect(layers).toHaveLength(2);

    // The top layer at z=10 should intersect edges v0-v1 and v0-v2
    const top = layers[1];
    expect(top.zCoordinate).toBe(10);
    expect(top.plane).toBe('XY');
    expect(top.axisMap).toEqual({ u: 'x', v: 'y' });

    // Extents should span between (0,10) and (10,0) in UV
    const ext = top.uvExtents;
    expect(ext.minU).toBe(0);
    expect(ext.minV).toBe(0);
    expect(ext.maxU).toBe(10);
    expect(ext.maxV).toBe(10);

    // Also ensure a maker model was produced for this layer
    expect(makerJsModels[1]).toBeTruthy();
  });
});
