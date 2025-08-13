import * as THREE from 'three';
import makerjs from 'makerjs';
import type { MakerJSModel } from '@/lib/coords';
import { axisMapForPlane, planeFromAxis } from './plane';
import { initializeBounds } from '@/components/workspace/workspaceDataHelpers';

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
  
  // First, collect all points to find bounding box
  const bounds = initializeBounds();
  
  for (let i = 0; i < paths.length; i += 1) {
    const path = paths[i];
    if (path.length < 2) continue;
    
    for (let j = 0; j < path.length; j += 1) {
      const point = path[j];
      bounds.minX = Math.min(bounds.minX, point.x);
      bounds.minY = Math.min(bounds.minY, point.y);
      bounds.maxX = Math.max(bounds.maxX, point.x);
      bounds.maxY = Math.max(bounds.maxY, point.y);
    }
    
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
  
  // Add bounding rectangle if we have valid bounds
  if (bounds.minX !== Infinity && bounds.minY !== Infinity && bounds.maxX !== -Infinity && bounds.maxY !== -Infinity) {
    const rectId = `RECT_${layerIndex ?? 0}`;
    
    // Add rectangle metadata to the model for identification
    (model as any).meta = {
      ...((model as any).meta || {}),
      boundingRect: {
        id: rectId,
        type: 'bounding-rectangle',
        bounds: { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY },
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
        center: [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2]
      }
    };
    
    // Create rectangle from min to max bounds with consistent naming
    (model.paths as any)[`${rectId}_bottom`] = {
      type: 'line',
      origin: [bounds.minX, bounds.minY],
      end: [bounds.maxX, bounds.minY],
      id: `${rectId}_bottom`,
      rectType: 'bounding-rectangle-edge'
    };
    (model.paths as any)[`${rectId}_right`] = {
      type: 'line',
      origin: [bounds.maxX, bounds.minY],
      end: [bounds.maxX, bounds.maxY],
      id: `${rectId}_right`,
      rectType: 'bounding-rectangle-edge'
    };
    (model.paths as any)[`${rectId}_top`] = {
      type: 'line',
      origin: [bounds.maxX, bounds.maxY],
      end: [bounds.minX, bounds.maxY],
      id: `${rectId}_top`,
      rectType: 'bounding-rectangle-edge'
    };
    (model.paths as any)[`${rectId}_left`] = {
      type: 'line',
      origin: [bounds.minX, bounds.maxY],
      end: [bounds.minX, bounds.minY],
      id: `${rectId}_left`,
      rectType: 'bounding-rectangle-edge'
    };
  }
  
  return model;
}

export function measureUVExtents(model: MakerJSModel): { minU: number; minV: number; maxU: number; maxV: number } {
  const ext = makerjs.measure.modelExtents(model);
  if (!ext) return { minU: 0, minV: 0, maxU: 0, maxV: 0 };
  return { minU: ext.low[0], minV: ext.low[1], maxU: ext.high[0], maxV: ext.high[1] };
}
