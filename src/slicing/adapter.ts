import makerjs from 'makerjs';
import type { MakerJSModel } from '@/lib/coords';
import { parseStl, sliceGeometry } from './core';
import { buildSliceLayerMetadata } from './metadata';
import type { Axis } from './types';
import { generateTextModel } from '@/lib/maker/generateTextModel';

function validateMakerModelNumeric(model: any): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const checkPoint = (p: any, label: string) => {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || Number.isNaN(p.x) || Number.isNaN(p.y)) {
      issues.push(`${label} is invalid: ${JSON.stringify(p)}`);
    }
  };
  const walkPaths = (paths: any) => {
    if (!paths) return;
    Object.entries(paths as Record<string, any>).forEach(([key, path]) => {
      if (path?.origin) checkPoint(path.origin, `paths.${key}.origin`);
      if (path?.end) checkPoint(path.end, `paths.${key}.end`);
      if (Array.isArray(path?.controls)) {
        path.controls.forEach((c: any, i: number) => checkPoint(c, `paths.${key}.controls[${i}]`));
      }
      if (Array.isArray(path?.points)) {
        path.points.forEach((pt: any, i: number) => checkPoint(pt, `paths.${key}.points[${i}]`));
      }
    });
  };
  const walkModel = (m: any) => {
    if (!m) return;
    if (m.paths) walkPaths(m.paths);
    if (m.models) Object.values(m.models).forEach((child: any) => walkModel(child));
  };
  walkModel(model);
  return { ok: issues.length === 0, issues };
}

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
  labels: Array<{
    layerIndex: number;
    text: string;
    fontSizeMm: number;
    makerJsModel: MakerJSModel;
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
  
  // Generate label models per layer (e.g., "Z 12.0mm") using default font size
  const defaultFontSizeMm = 12; // bump size for visibility
  const labels = await Promise.all(
    enrichedLayers.map(async (layer) => {
      const axisLetter = axis.toUpperCase();
      const text = `${axisLetter} ${layer.zCoordinate.toFixed(1)}mm`;
      const model = await generateTextModel(text, { fontSizeMm: defaultFontSizeMm });
      return {
        layerIndex: layer.layerIndex,
        text,
        fontSizeMm: defaultFontSizeMm,
        makerJsModel: model as unknown as MakerJSModel,
      };
    })
  );

  // Merge label models into their corresponding slice layer models.
  // Position label near the lower-left corner inside each layer's extents with a small margin.
  const labelByIndex = new Map<number, { text: string; fontSizeMm: number; makerJsModel: MakerJSModel }>();
  labels.forEach((l) => labelByIndex.set(l.layerIndex, { text: l.text, fontSizeMm: l.fontSizeMm, makerJsModel: l.makerJsModel }));

  const combinedModels: MakerJSModel[] = makerJsModels.map((layerModel, i) => {
    const meta = enrichedLayers[i];
    const label = labelByIndex.get(meta.layerIndex);
    if (!label) return layerModel;

    // Compute extents of the layer to place the label inside.
    const ext = makerjs.measure.modelExtents(layerModel as any);
    if (!ext) return layerModel;

    const margin = 2; // mm

    // Clone the label model to avoid mutating the source generated model
    const labelClone = JSON.parse(JSON.stringify(label.makerJsModel)) as MakerJSModel;

    // Compute label extents (for potential future fitting) - not strictly required for simple placement
    // const labelExt = makerjs.measure.modelExtents(labelClone as any);

    // Place label near bottom-left (minX, minY) in Y-up coordinates
    const targetX = ext.low[0] + margin;
    const targetY = ext.low[1] + margin;
    if ((makerjs.model as any).move) {
      (makerjs.model as any).move(labelClone as any, [targetX, targetY]);
    }

    // Debug: measure label extents after placement
    try {
      const lExt = makerjs.measure.modelExtents(labelClone as any);
      const validation = validateMakerModelNumeric(labelClone as any);
      // eslint-disable-next-line no-console
      console.log('[label:placed]', {
        layerIndex: meta.layerIndex,
        text: label.text,
        fontSizeMm: label.fontSizeMm,
        labelExtents: lExt ? { w: lExt.high[0] - lExt.low[0], h: lExt.high[1] - lExt.low[1] } : null,
        target: { x: targetX, y: targetY },
        invalid: validation.ok ? null : validation.issues.slice(0, 10),
        invalidCount: validation.ok ? 0 : validation.issues.length,
      });
      if (!validation.ok) {
        // eslint-disable-next-line no-console
        console.warn('[label:invalid-points]', { layerIndex: meta.layerIndex, text: label.text, issuesCount: validation.issues.length });
      }
    } catch {}

    // Wrap as a parent model with both sub-models so exporter renders both sets of paths
    const composed: MakerJSModel = {
      models: {
        slice: layerModel as any,
        label: labelClone as any,
      },
    } as unknown as MakerJSModel;
    // Preserve units if present
    (composed as any).units = (layerModel as any).units ?? 'mm';
    return composed;
  });

  return { makerJsModels: combinedModels, layers: enrichedLayers, labels };
}
