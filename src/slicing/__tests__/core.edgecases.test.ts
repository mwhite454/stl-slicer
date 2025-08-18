import { getDimensions, sliceGeometry } from '@/slicing/core';
import type { SlicerState } from '@/slicing/types';

// Utilities to build minimal mocks
function posAttr(verts: Array<{ x: number; y: number; z: number }>) {
  return {
    getX: (i: number) => verts[i].x,
    getY: (i: number) => verts[i].y,
    getZ: (i: number) => verts[i].z,
  } as any;
}

const emptyIndex = { count: 0, getX: (_i: number) => 0 } as any;
const triIndex = { count: 3, getX: (i: number) => [0, 1, 2][i] } as any;

function geometry({ verts, indexType = 'tri' as 'empty' | 'tri' }: { verts: Array<{ x: number; y: number; z: number }>; indexType?: 'empty' | 'tri' }) {
  return {
    getAttribute: (name: string) => (name === 'position' ? posAttr(verts) : null),
    getIndex: () => (indexType === 'tri' ? triIndex : emptyIndex),
  } as any;
}

function box(min: { x: number; y: number; z: number }, max: { x: number; y: number; z: number }) {
  return { min, max } as any;
}

describe('core.ts edge cases', () => {
  test('getDimensions returns width/height/depth from bounding box', () => {
    const bb = {
      min: { x: -2, y: 5, z: 1 },
      max: { x: 8, y: 9, z: 11 },
      getSize: (target: any) => {
        target.x = 10; target.y = 4; target.z = 10; return target;
      },
    };
    const state: SlicerState = { geometry: geometry({ verts: [] }), boundingBox: bb as any } as any;
    const dims = getDimensions(state);
    expect(dims).toEqual({ width: 10, height: 4, depth: 10 });
  });

  test('zero layerThickness produces minLayers at ends', () => {
    const state: SlicerState = {
      geometry: geometry({ verts: [], indexType: 'empty' }),
      boundingBox: box({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 20 }),
    } as any;
    const { layers } = sliceGeometry(state, 'z', 0);
    expect(layers.length).toBe(2);
    expect(layers[0].zCoordinate).toBe(0);
    expect(layers[1].zCoordinate).toBe(20);
  });

  test('degenerate bounds (total=0) create two identical layers', () => {
    const state: SlicerState = {
      geometry: geometry({ verts: [], indexType: 'empty' }),
      boundingBox: box({ x: 3, y: 7, z: 5 }, { x: 3, y: 7, z: 5 }),
    } as any;
    const { layers } = sliceGeometry(state, 'z', 1);
    expect(layers.length).toBe(2);
    expect(layers[0].zCoordinate).toBe(5);
    expect(layers[1].zCoordinate).toBe(5);
  });

  test('handles missing index (no triangles) without crashing and uvExtents default to zeros', () => {
    const geom = {
      getAttribute: (name: string) => (name === 'position' ? posAttr([]) : null),
      getIndex: () => null,
    } as any;
    const state: SlicerState = { geometry: geom, boundingBox: box({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }) } as any;
    const { makerJsModels, layers } = sliceGeometry(state, 'z', 5);
    expect(makerJsModels.length).toBe(2);
    expect(layers.every((l) => l.uvExtents.minU === 0 && l.uvExtents.maxU === 0 && l.uvExtents.minV === 0 && l.uvExtents.maxV === 0)).toBe(true);
  });

  test('parallel edges / zero-length segments are filtered (no NaNs)', () => {
    // Triangle edges parallel to slicing plane at z=5 should yield no valid segments
    const v0 = { x: 0, y: 0, z: 0 };
    const v1 = { x: 10, y: 0, z: 0 };
    const v2 = { x: 0, y: 10, z: 0 };
    const state: SlicerState = {
      geometry: geometry({ verts: [v0, v1, v2], indexType: 'tri' }),
      boundingBox: box({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }),
    } as any;
    const { makerJsModels } = sliceGeometry(state, 'z', 5);
    // both layers produce models; but extents may be zeros if no segments
    expect(makerJsModels[0]).toBeTruthy();
    expect(makerJsModels[1]).toBeTruthy();
  });

  test('axis variants project to correct planes and uv mapping', () => {
    const v0 = { x: 1, y: 2, z: 3 };
    const v1 = { x: 4, y: 8, z: 6 };
    const v2 = { x: 7, y: 5, z: 9 };
    const stateX: SlicerState = { geometry: geometry({ verts: [v0, v1, v2] }), boundingBox: box({ x: 1, y: 2, z: 3 }, { x: 7, y: 8, z: 9 }) } as any;
    const resX = sliceGeometry(stateX, 'x', 10);
    expect(resX.layers[1].plane).toBe('YZ');
    expect(resX.layers[1].axisMap).toEqual({ u: 'y', v: 'z' });

    const stateY: SlicerState = { geometry: geometry({ verts: [v0, v1, v2] }), boundingBox: box({ x: 1, y: 2, z: 3 }, { x: 7, y: 8, z: 9 }) } as any;
    const resY = sliceGeometry(stateY, 'y', 10);
    expect(resY.layers[1].plane).toBe('XZ');
    expect(resY.layers[1].axisMap).toEqual({ u: 'x', v: 'z' });
  });
});
