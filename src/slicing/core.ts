import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { MakerJSModel } from '@/lib/coords';
import { axisMapForPlane, planeFromAxis } from './plane';
import { pathsUVToMakerModel, measureUVExtents } from './pure';
import type { Axis, SlicePlane, AxisMap, SlicerState } from './types';

// Tolerance used for detecting valid line segments
const SEG_EPS = 1e-6;

export async function parseStl(file: File): Promise<SlicerState> {
  const loader = new STLLoader();
  const arrayBuffer = await file.arrayBuffer();
  const geometry = loader.parse(arrayBuffer as ArrayBuffer);

  // Ensure index
  if (!geometry.index) {
    const positionAttribute = geometry.getAttribute('position');
    if (positionAttribute) {
      const indices: number[] = [];
      for (let i = 0; i < positionAttribute.count; i += 1) indices.push(i);
      geometry.setIndex(indices);
    }
  }

  // Ensure normals and bounding box
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  const boundingBox = geometry.boundingBox ? geometry.boundingBox.clone() : new THREE.Box3().setFromObject(mesh);

  return { geometry, boundingBox };
}

export function getDimensions(state: SlicerState): { width: number; height: number; depth: number } {
  const size = new THREE.Vector3();
  state.boundingBox.getSize(size);
  return { width: size.x, height: size.y, depth: size.z };
}

function coordAlong(v: THREE.Vector3, axis: Axis): number {
  if (axis === 'x') return v.x;
  if (axis === 'y') return v.y;
  return v.z;
}

function sliceTriangleAt(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  axis: Axis,
  k: number
): THREE.Vector3[] {
  // Find intersection of segment with plane coord(axis) = k
  const hits: THREE.Vector3[] = [];
  const testEdge = (p: THREE.Vector3, q: THREE.Vector3) => {
    const ap = coordAlong(p, axis);
    const aq = coordAlong(q, axis);
    const denom = aq - ap;
    if (Math.abs(denom) < SEG_EPS) return; // parallel to plane
    const t = (k - ap) / denom;
    if (t >= -SEG_EPS && t <= 1 + SEG_EPS) {
      const pt = new THREE.Vector3().lerpVectors(p, q, t);
      hits.push(pt);
    }
  };
  testEdge(a, b);
  testEdge(b, c);
  testEdge(c, a);
  // We only keep pairs
  if (hits.length >= 2) return [hits[0], hits[1]];
  return [];
}

function collectSegmentsAt(state: SlicerState, axis: Axis, k: number): Array<[THREE.Vector3, THREE.Vector3]> {
  const { geometry } = state;
  const pos = geometry.getAttribute('position');
  const idx = geometry.getIndex();
  const segments: Array<[THREE.Vector3, THREE.Vector3]> = [];
  if (!pos || !idx) return segments;

  for (let i = 0; i < idx.count; i += 3) {
    const i1 = idx.getX(i);
    const i2 = idx.getX(i + 1);
    const i3 = idx.getX(i + 2);
    const v1 = new THREE.Vector3(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
    const v2 = new THREE.Vector3(pos.getX(i2), pos.getY(i2), pos.getZ(i2));
    const v3 = new THREE.Vector3(pos.getX(i3), pos.getY(i3), pos.getZ(i3));
    const pair = sliceTriangleAt(v1, v2, v3, axis, k);
    if (pair.length === 2) {
      // Discard zero-length segments
      if (pair[0].distanceToSquared(pair[1]) > SEG_EPS * SEG_EPS) segments.push([pair[0], pair[1]]);
    }
  }
  return segments;
}

export function sliceGeometry(
  state: SlicerState,
  axis: Axis,
  layerThickness: number
): {
  makerJsModels: MakerJSModel[];
  layers: Array<{
    layerIndex: number;
    zCoordinate: number; // along the slicing axis
    axis: Axis;
    layerThickness: number;
    plane: SlicePlane;
    axisMap: AxisMap;
    vUpSign: 1 | -1;
    uvExtents: { minU: number; minV: number; maxU: number; maxV: number };
  }>;
} {
  const { boundingBox } = state;
  const min = boundingBox.min;
  const max = boundingBox.max;
  const start = axis === 'x' ? min.x : axis === 'y' ? min.y : min.z;
  const end = axis === 'x' ? max.x : axis === 'y' ? max.y : max.z;
  const total = Math.max(0, end - start);

  const minLayers = 2;
  const count = Math.max(minLayers, total > 0 && layerThickness > 0 ? Math.ceil(total / layerThickness) : minLayers);
  const adjusted = count > 1 ? total / (count - 1) : 0;

  const plane = planeFromAxis(axis);
  const axisMap = axisMapForPlane(plane);
  const vUpSign: 1 | -1 = 1;

  const makerJsModels: MakerJSModel[] = [];
  const layers: Array<{
    layerIndex: number;
    zCoordinate: number;
    axis: Axis;
    layerThickness: number;
    plane: SlicePlane;
    axisMap: AxisMap;
    vUpSign: 1 | -1;
    uvExtents: { minU: number; minV: number; maxU: number; maxV: number };
  }> = [];

  for (let i = 0; i < count; i += 1) {
    const k = start + i * adjusted;
    const segs = collectSegmentsAt(state, axis, k);

    // Convert segments to UV path list (each segment -> a 2-point path)
    const pathsUV: Array<Array<THREE.Vector2>> = [];
    for (const [p, q] of segs) {
      const u1 = (p as any)[axisMap.u] as number;
      const v1 = (p as any)[axisMap.v] as number;
      const u2 = (q as any)[axisMap.u] as number;
      const v2 = (q as any)[axisMap.v] as number;
      pathsUV.push([new THREE.Vector2(u1, v1), new THREE.Vector2(u2, v2)]);
    }

    const model = pathsUVToMakerModel(pathsUV, i);
    makerJsModels.push(model);
    const uvExtents = measureUVExtents(model);

    layers.push({
      layerIndex: i,
      zCoordinate: k,
      axis,
      layerThickness,
      plane,
      axisMap,
      vUpSign,
      uvExtents,
    });
  }

  return { makerJsModels, layers };
}
