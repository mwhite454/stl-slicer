import makerjs from 'makerjs';

export type WorkspaceMeta = {
  operation: 'meta';
  metaType: 'workspace';
};

/**
 * Generate a maker.js model for the workspace frame (border) in centered Y-up coordinates.
 * Origin at (0,0), border follows [-w/2,-h/2]..[w/2,h/2].
 */
export function generateMakerWorkspaceModel(
  widthMm: number,
  heightMm: number,
): makerjs.IModel {
  const model: makerjs.IModel = { paths: {}, models: {}, units: 'mm' } as any;

  const xMin = -widthMm / 2;
  const xMax = widthMm / 2;
  const yMin = -heightMm / 2;
  const yMax = heightMm / 2;

  // TODO(workspace-chrome): Add optional background fill panel behind grid/items.
  // Consider a thin rectangle path or model with fill only and no stroke.
  // (Render ordering handled by zIndex of the 'workspace' meta item.)

  const border: makerjs.IModel = { paths: {}, units: 'mm' } as any;
  (border.paths as any)['border-top'] = new makerjs.paths.Line([xMin, yMax], [xMax, yMax]);
  (border.paths as any)['border-right'] = new makerjs.paths.Line([xMax, yMax], [xMax, yMin]);
  (border.paths as any)['border-bottom'] = new makerjs.paths.Line([xMax, yMin], [xMin, yMin]);
  (border.paths as any)['border-left'] = new makerjs.paths.Line([xMin, yMin], [xMin, yMax]);
  (model.models as any)['border'] = border;

  // TODO(workspace-chrome): Add rulers as submodels (e.g., 'ruler-top', 'ruler-left') with tick marks and labels.
  // These should also be centered Y-up and respect units. Keep labels out of Maker.js (SVG text in stage) or
  // define as paths if you prefer path-based text.

  // TODO(workspace-chrome): Add origin marker (e.g., small crosshair) at (0,0) as a separate submodel 'origin'.

  // TODO(workspace-chrome): Add safe-margins or printable area overlays as submodels (e.g., 'printable-area'),
  // possibly dashed lines or semi-transparent fills.

  (model as any).meta = {
    operation: 'meta',
    metaType: 'workspace',
  } as WorkspaceMeta;

  return model;
}
