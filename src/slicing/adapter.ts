import type { MakerJSModel } from '@/lib/coords';
import { parseStl, sliceGeometry } from './core';
import { buildSliceLayerMetadata } from './metadata';
import type { Axis } from './types';

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
  // Parse STL file using functional pipeline
  const slicerState = await parseStl(file);
  
  // Slice geometry using functional pipeline
  const { makerJsModels, layers } = sliceGeometry(slicerState, axis, layerThickness);
  
  // Build metadata for each layer
  const enrichedLayers = layers.map((layer, idx) => {
    const model = makerJsModels[idx];
    const meta = buildSliceLayerMetadata(axis, model);
    return {
      layerIndex: layer.layerIndex,
      zCoordinate: layer.zCoordinate,
      axis,
      layerThickness,
      plane: meta.plane,
      axisMap: meta.axisMap,
      vUpSign: meta.vUpSign,
      uvExtents: layer.uvExtents,
    };
  });
  
  return { makerJsModels, layers: enrichedLayers };
}
