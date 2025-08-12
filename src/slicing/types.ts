import * as THREE from 'three';

export type SlicePlane = 'XY' | 'XZ' | 'YZ';
export type Axis = 'x' | 'y' | 'z';

export type AxisMap = { u: Axis; v: Axis };

export type UVExtents = {
  minU: number;
  minV: number;
  maxU: number;
  maxV: number;
};

export type Layer2D = {
  index: number;
  zWorld: number; // the slicing coordinate in world units for the constant axis
  plane: SlicePlane;
  axisMap: AxisMap;
  vUpSign: 1 | -1;
  paths: Array<Array<THREE.Vector2>>; // in u/v space
  uvExtents?: UVExtents; // optional convenience extents
};

export type SlicerState = {
  geometry: THREE.BufferGeometry;
  boundingBox: THREE.Box3;
};

// Legacy LayerData type for backward compatibility
export type LayerData = {
  index: number;
  paths: Array<Array<THREE.Vector2>>;
  z: number;
};
