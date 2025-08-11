export type SlicePlane = 'XY' | 'XZ' | 'YZ';
export type Axis = 'x' | 'y' | 'z';

export type AxisMap = { u: Axis; v: Axis };

export function planeFromAxis(axis: Axis): SlicePlane {
  switch (axis) {
    case 'x':
      return 'YZ';
    case 'y':
      return 'XZ';
    case 'z':
    default:
      return 'XY';
  }
}

export function axisMapForPlane(plane: SlicePlane): AxisMap {
  switch (plane) {
    case 'XY':
      return { u: 'x', v: 'y' };
    case 'XZ':
      return { u: 'x', v: 'z' };
    case 'YZ':
      return { u: 'y', v: 'z' };
    default:
      return { u: 'x', v: 'y' };
  }
}

export function getProjectionInfo(axis: Axis): { plane: SlicePlane; axisMap: AxisMap; vUpSign: 1 | -1 } {
  const plane = planeFromAxis(axis);
  const axisMap = axisMapForPlane(plane);
  // We treat maker.js Y as the model's v-axis. Default to +1 (up) for now.
  const vUpSign: 1 | -1 = 1;
  return { plane, axisMap, vUpSign };
}
