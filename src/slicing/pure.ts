import * as THREE from 'three';
import makerjs from 'makerjs';
import type { MakerJSModel } from '@/lib/coords';
import { axisMapForPlane, planeFromAxis } from './plane';

export type Axis = 'x' | 'y' | 'z';

export function convertToUV(p: THREE.Vector3, axisMap: { u: Axis; v: Axis }): THREE.Vector2 {
  const u = p[axisMap.u];
  const v = p[axisMap.v];
  return new THREE.Vector2(u, v);
}

export function paths3DToUV(
  paths3D: Array<Array<THREE.Vector3>>,
  axis: Axis
): {
  plane: 'XY' | 'XZ' | 'YZ';
  axisMap: { u: Axis; v: Axis };
  vUpSign: 1 | -1;
  pathsUV: Array<Array<THREE.Vector2>>;
} {
  const plane = planeFromAxis(axis);
  const axisMap = axisMapForPlane(plane);
  const vUpSign: 1 | -1 = 1; // maker.js assumes Y-up for model coordinates
  const pathsUV = paths3D.map((path) => path.map((p) => convertToUV(p, axisMap)));
  return { plane, axisMap, vUpSign, pathsUV };
}

export function pathsUVToMakerModel(paths: Array<Array<THREE.Vector2>>, layerIndex?: number): MakerJSModel {
  const model: MakerJSModel = { paths: {} };
  let id = 0;
  for (let i = 0; i < paths.length; i += 1) {
    const path = paths[i];
    if (path.length < 2) continue;
    for (let j = 0; j < path.length - 1; j += 1) {
      const a = path[j];
      const b = path[j + 1];
      const key = `L_${layerIndex ?? 0}_${i}_${j}_${id++}`;
      (model.paths as any)[key] = {
        type: 'line',
        origin: [a.x, a.y],
        end: [b.x, b.y],
      };
    }
  }
  return model;
}

export function measureUVExtents(model: MakerJSModel): { minU: number; minV: number; maxU: number; maxV: number } {
  const ext = (makerjs as any).measure.modelExtents(model);
  if (!ext) return { minU: 0, minV: 0, maxU: 0, maxV: 0 };
  return { minU: ext.low[0], minV: ext.low[1], maxU: ext.high[0], maxV: ext.high[1] };
}
