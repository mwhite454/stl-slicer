import * as THREE from 'three';
import { convertToUV, paths3DToUV, pathsUVToMakerModel, measureUVExtents } from '@/slicing/pure';
import { axisMapForPlane, planeFromAxis } from '@/slicing/plane';

describe('pure slicing utilities', () => {
  test('convertToUV uses provided axisMap', () => {
    const p = new THREE.Vector3(1, 2, 3);
    const uvXY = convertToUV(p, { u: 'x', v: 'y' });
    expect(uvXY.x).toBe(1);
    expect(uvXY.y).toBe(2);

    const uvYZ = convertToUV(p, { u: 'y', v: 'z' });
    expect(uvYZ.x).toBe(2);
    expect(uvYZ.y).toBe(3);
  });

  test('pathsUVToMakerModel uses default layerIndex 0 when undefined', () => {
    const uvPaths = [[new THREE.Vector2(0, 0), new THREE.Vector2(1, 1)]];
    const model = pathsUVToMakerModel(uvPaths);
    const keys = Object.keys(model.paths!);
    // Expect keys to include prefix with layerIndex 0
    expect(keys.some(k => k.startsWith('L_0_'))).toBe(true);
  });

  test('measureUVExtents returns zeros when model has no paths/extents', () => {
    const empty = { paths: {} } as any;
    const ext = measureUVExtents(empty);
    expect(ext).toEqual({ minU: 0, minV: 0, maxU: 0, maxV: 0 });
  });

  test('pathsUVToMakerModel with insufficient points yields no bounding rectangle', () => {
    const uvPaths = [[new THREE.Vector2(1, 1)]]; // single point, no segment
    const model = pathsUVToMakerModel(uvPaths, 1);
    expect((model as any).meta?.boundingRect).toBeUndefined();
  });

  test('paths3DToUV maps points by axis correctly', () => {
    const path3D = [
      new THREE.Vector3(1, 10, 100),
      new THREE.Vector3(2, 20, 200),
    ];

    const { plane: pZ, axisMap: mZ, vUpSign: signZ, pathsUV: uvZ } = paths3DToUV([path3D], 'z');
    expect(pZ).toBe('XY');
    expect(mZ).toEqual({ u: 'x', v: 'y' });
    expect(signZ).toBe(1);
    expect(uvZ[0][0].x).toBe(1);
    expect(uvZ[0][0].y).toBe(10);
    expect(uvZ[0][1].x).toBe(2);
    expect(uvZ[0][1].y).toBe(20);

    const { plane: pX, axisMap: mX, pathsUV: uvX } = paths3DToUV([path3D], 'x');
    expect(pX).toBe('YZ');
    expect(mX).toEqual({ u: 'y', v: 'z' });
    expect(uvX[0][0].x).toBe(10);
    expect(uvX[0][0].y).toBe(100);

    const { plane: pY, axisMap: mY, pathsUV: uvY } = paths3DToUV([path3D], 'y');
    expect(pY).toBe('XZ');
    expect(mY).toEqual({ u: 'x', v: 'z' });
    expect(uvY[0][0].x).toBe(1);
    expect(uvY[0][0].y).toBe(100);
  });

  test('pathsUVToMakerModel creates line paths and bounding rectangle meta', () => {
    const uvPaths = [
      [new THREE.Vector2(0, 0), new THREE.Vector2(10, 0), new THREE.Vector2(10, 10)],
      [new THREE.Vector2(-5, -5), new THREE.Vector2(-5, 5)],
    ];

    const model = pathsUVToMakerModel(uvPaths, 3);
    expect(model.paths).toBeTruthy();

    const keys = Object.keys(model.paths!);
    // For first path with 3 points => 2 segments, second path => 1 segment, plus 4 rectangle edges
    // Total >= 7
    expect(keys.length).toBeGreaterThanOrEqual(7);

    // Bounding rectangle metadata exists
    const meta: any = (model as any).meta;
    expect(meta).toBeTruthy();
    expect(meta.boundingRect).toBeTruthy();
    expect(meta.boundingRect.width).toBe(15); // maxX 10 - minX -5
    expect(meta.boundingRect.height).toBe(15); // maxY 10 - minY -5
  });

  test('measureUVExtents returns bounds based on model paths', () => {
    const uvPaths = [[new THREE.Vector2(-1, 2), new THREE.Vector2(4, -3)]];
    const model = pathsUVToMakerModel(uvPaths, 0);
    const ext = measureUVExtents(model);
    expect(ext.minU).toBe(-1);
    expect(ext.minV).toBe(-3);
    expect(ext.maxU).toBe(4);
    expect(ext.maxV).toBe(2);
  });
});
