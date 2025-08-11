import type { MakerJSModel } from '@/lib/coords';
import { StlSlicer, type Axis as ClassAxis, type LayerData as ClassLayerData } from '@/utils/StlSlicer';
import { buildSliceLayerMetadata } from './metadata';

export type Axis = 'x' | 'y' | 'z';

export async function sliceToMakerModels(
  file: File,
  axis: Axis,
  layerThickness: number
): Promise<{
  makerJsModels: MakerJSModel[];
  layers: Array<{
    layerIndex: number;
    zCoordinate: number;
    axis: Axis;
    layerThickness: number;
    plane: 'XY' | 'XZ' | 'YZ';
    axisMap: { u: 'x' | 'y' | 'z'; v: 'x' | 'y' | 'z' };
    vUpSign: 1 | -1;
    uvExtents: { minU: number; minV: number; maxU: number; maxV: number };
  }>;
}> {
  const slicer = new StlSlicer();
  await slicer.loadSTL(file);
  const layers2D: ClassLayerData[] = slicer.sliceModel(axis as ClassAxis, layerThickness);
  const makerJsModels = slicer.generateMakerJSModels(layers2D);
  const layers = layers2D.map((layer, idx) => {
    const model = makerJsModels[idx];
    const meta = buildSliceLayerMetadata(axis, model);
    return {
      layerIndex: layer.index,
      zCoordinate: layer.z,
      axis,
      layerThickness,
      plane: meta.plane,
      axisMap: meta.axisMap,
      vUpSign: meta.vUpSign,
      uvExtents: meta.uvExtents,
    };
  });
  return { makerJsModels, layers };
}
