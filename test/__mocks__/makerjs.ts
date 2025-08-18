// Minimal makerjs mock for measurement used in tests
const makerjs = {
  measure: {
    modelExtents(model: any) {
      // Compute bounds from line paths with origin/end points
      if (!model || !model.paths) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const key of Object.keys(model.paths)) {
        const p = (model.paths as any)[key];
        if (p && p.type === 'line' && Array.isArray(p.origin) && Array.isArray(p.end)) {
          const [x1, y1] = p.origin;
          const [x2, y2] = p.end;
          minX = Math.min(minX, x1, x2);
          minY = Math.min(minY, y1, y2);
          maxX = Math.max(maxX, x1, x2);
          maxY = Math.max(maxY, y1, y2);
        }
      }
      if (minX === Infinity) return null;
      return { low: [minX, minY], high: [maxX, maxY] } as any;
    },
  },
  paths: {
    Line: function (origin: [number, number], end: [number, number]) {
      (this as any).type = 'line';
      (this as any).origin = origin;
      (this as any).end = end;
    },
  },
  models: {
    Rectangle: function (width: number, height: number) {
      (this as any).__rect = { width, height };
    },
  },
  exporter: {
    toSVGPathData(model: any, _options?: any): any {
      if (model && model.__rect) {
        const { width, height } = model.__rect;
        // Simple rectangular path string
        return `M0 0 L${width} 0 L${width} ${height} L0 ${height} Z`;
      }
      // For non-rectangle models, return empty path data in this mock
      return '';
    },
  },
};

export default makerjs as any;
export { makerjs };
