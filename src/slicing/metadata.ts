import makerjs from 'makerjs';
import { planeFromAxis, axisMapForPlane } from './plane';

export type Axis = 'x' | 'y' | 'z';

export function buildSliceLayerMetadata(
  axis: Axis,
  makerJsModel: any
): {
  plane: 'XY' | 'XZ' | 'YZ';
  axisMap: { u: 'x' | 'y' | 'z'; v: 'x' | 'y' | 'z' };
  vUpSign: 1 | -1;
  uvExtents: { minU: number; minV: number; maxU: number; maxV: number };
} {
  const plane = planeFromAxis(axis);
  const axisMap = axisMapForPlane(plane);
  const ext = makerjs.measure.modelExtents(makerJsModel);
  const minU = ext?.low?.[0] ?? 0;
  const minV = ext?.low?.[1] ?? 0;
  const maxU = ext?.high?.[0] ?? 0;
  const maxV = ext?.high?.[1] ?? 0;
  return {
    plane,
    axisMap,
    vUpSign: 1,
    uvExtents: { minU, minV, maxU, maxV },
  };
}
