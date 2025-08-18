import { parseStl, sliceGeometry } from '@/slicing/core';
import * as THREE from 'three';

describe('core.parseStl', () => {
  function makeFile(bytes: Uint8Array) {
    return {
      arrayBuffer: async () => bytes.buffer,
    } as any;
  }

  test('creates index from position attribute when missing; computes normals; uses provided boundingBox', async () => {
    // Override STLLoader.parse to return geometry without index, with position attr and boundingBox
    const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
    const loader = new STLLoader();
    const geom: any = {
      _index: undefined,
      index: undefined,
      _normal: undefined,
      getAttribute: (name: string) =>
        name === 'position'
          ? { count: 6 } // pretend 6 vertices
          : name === 'normal'
          ? undefined
          : null,
      setIndex: function (arr: number[]) {
        this._index = arr;
        this.index = arr as any;
      },
      getIndex: () => null,
      computeVertexNormals: function () {
        this._normal = true;
      },
      computeBoundingBox: () => {},
      boundingBox: { clone: () => ({ min: { x: 1, y: 2, z: 3 }, max: { x: 4, y: 6, z: 8 } }) },
    };
    // Ensure new STLLoader() instances use our parse result
    (STLLoader as any).prototype.parse = () => geom;

    // Create a real file
    const file = makeFile(new Uint8Array([0, 1, 2, 3]));
    // Call parseStl (it will new STLLoader() internally)
    const state = await parseStl(file);

    expect(Array.isArray((state.geometry as any).index)).toBe(true);
    expect((state.geometry as any).index.length).toBe(6);
    // normals computed because none existed
    expect((state.geometry as any)._normal).toBe(true);
    // bounding box came from clone()
    expect(state.boundingBox.min).toEqual({ x: 1, y: 2, z: 3 });
    expect(state.boundingBox.max).toEqual({ x: 4, y: 6, z: 8 });
  });

  test('does not create index when position attribute is missing', async () => {
    const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
    const geom: any = {
      index: undefined,
      getAttribute: (_name: string) => null, // no position, no normal
      setIndex: function (arr: number[]) {
        this.index = arr as any;
      },
      getIndex: () => null,
      computeVertexNormals: () => {},
      computeBoundingBox: () => {},
      boundingBox: { clone: () => ({ min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }) },
    };
    (STLLoader as any).prototype.parse = () => geom;

    const file = { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer } as any;
    const state = await parseStl(file);
    // Since there was no position attribute, index should remain undefined
    expect((state.geometry as any).index).toBeUndefined();
  });

  test('falls back to Box3.setFromObject when no boundingBox present', async () => {
    const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
    const geom: any = {
      index: [0, 1, 2],
      getAttribute: (name: string) => (name === 'normal' ? {} : null),
      setIndex: (_arr: number[]) => {},
      getIndex: () => ({ count: 3, getX: (i: number) => [0, 1, 2][i] }),
      computeVertexNormals: () => {},
      computeBoundingBox: () => {},
      // no boundingBox property
    };
    (STLLoader as any).prototype.parse = () => geom;

    const file = makeFile(new Uint8Array([5, 6]));
    const state = await parseStl(file);
    // Our THREE.Box3 mock returns default 0 bounds when setFromObject() is used
    expect(state.boundingBox.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(state.boundingBox.max).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('collectSegmentsAt short-circuits when position attribute missing', () => {
  test('returns empty models/layers safely', () => {
    const geometry: any = {
      getAttribute: (_name: string) => null,
      getIndex: () => ({ count: 3, getX: (i: number) => [0, 1, 2][i] }),
    };
    const boundingBox: any = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 10 } };
    const { makerJsModels, layers } = sliceGeometry({ geometry, boundingBox } as any, 'z', 5);
    expect(makerJsModels.length).toBe(2);
    expect(layers.length).toBe(2);
    expect(layers[0].uvExtents).toEqual({ minU: 0, minV: 0, maxU: 0, maxV: 0 });
  });
});
