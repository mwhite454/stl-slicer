import makerjs from 'makerjs';

export type GridMeta = {
  operation: 'meta';
  metaType: 'grid';
  gridSize: number;
};

/**
 * Generate a maker.js model for a centered grid and axes in Y-up coordinates.
 * - Origin (0,0) at center.
 * - X right positive, Y up positive.
 * - Vertical and horizontal grid lines at multiples of `gridSize` within extents.
 * - Includes axis lines tagged in separate layers.
 */
export function generateMakerGridModel(
  widthMm: number,
  heightMm: number,
  gridSizeMm: number
): makerjs.IModel {
  const model: makerjs.IModel = { paths: {}, models: {}, units: 'mm' } as any;

  const cx = 0; // centered model
  const cy = 0;
  const xMin = -widthMm / 2;
  const xMax = widthMm / 2;
  const yMin = -heightMm / 2;
  const yMax = heightMm / 2;

  // Helper to add a line path
  const addLine = (id: string, p1: [number, number], p2: [number, number]) => {
    (model.paths as any)[id] = new makerjs.paths.Line(p1, p2);
  };

  // Grid lines
  if (gridSizeMm > 0 && isFinite(gridSizeMm)) {
    // verticals
    for (let x = 0; cx + x <= xMax; x += gridSizeMm) {
      const xPos = cx + x;
      const xNeg = cx - x;
      const keyP = `gv+${xPos.toFixed(3)}`;
      addLine(keyP, [xPos, yMin], [xPos, yMax]);
      if (x > 0) {
        const keyN = `gv-${Math.abs(xNeg).toFixed(3)}`;
        addLine(keyN, [xNeg, yMin], [xNeg, yMax]);
      }
    }
    // horizontals
    for (let y = 0; cy + y <= yMax; y += gridSizeMm) {
      const yPos = cy + y;
      const yNeg = cy - y;
      const keyP = `gh+${yPos.toFixed(3)}`;
      addLine(keyP, [xMin, yPos], [xMax, yPos]);
      if (y > 0) {
        const keyN = `gh-${Math.abs(yNeg).toFixed(3)}`;
        addLine(keyN, [xMin, yNeg], [xMax, yNeg]);
      }
    }
  }

  // Axes (tag into sub-models for styling downstream)
  const axes: makerjs.IModel = { paths: {}, units: 'mm' } as any;
  (axes.paths as any)['axis-x'] = new makerjs.paths.Line([xMin, 0], [xMax, 0]);
  (axes.paths as any)['axis-y'] = new makerjs.paths.Line([0, yMin], [0, yMax]);
  (model.models as any)['axes'] = axes;

  // Border moved to separate workspace meta model

  // Meta tag for later exclusion on export
  (model as any).meta = {
    operation: 'meta',
    metaType: 'grid',
    gridSize: gridSizeMm,
  } as GridMeta;

  return model;
}
