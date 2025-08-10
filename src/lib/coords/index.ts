// Coordinate conversions between maker.js (Y-up) and SVG (Y-down)
// We use a reference height (in mm) to flip Y values consistently.

export function svgYFromMaker(yMaker: number, refHeightMm: number): number {
  return refHeightMm - yMaker;
}

export function makerYFromSvg(ySvg: number, refHeightMm: number): number {
  return refHeightMm - ySvg;
}

// For maker.js-generated path data where local origin is at (0,0) and height extends in +Y (maker space),
// render correctly in SVG by translating by (x, y + height) without a scale flip.
export function transformForMakerPath(xMm: number, yMm: number, heightMm: number): string {
  return `translate(${xMm} ${yMm + heightMm})`;
}

export type Point = { x: number; y: number };

// Convert a point from maker space (Y-up) to SVG space (Y-down), given a reference height in mm.
export function svgPointFromMaker(p: Point, refHeightMm: number): Point {
  return { x: p.x, y: svgYFromMaker(p.y, refHeightMm) };
}

// Convert a point from SVG space (Y-down) to maker space (Y-up), given a reference height in mm.
export function makerPointFromSvg(p: Point, refHeightMm: number): Point {
  return { x: p.x, y: makerYFromSvg(p.y, refHeightMm) };
}

// Type declarations for maker.js since no official types exist
interface MakerJSPath {
  type: string;
  origin: [number, number];
  end?: [number, number];
}

export interface MakerJSModel {
  paths?: { [id: string]: MakerJSPath };
  models?: { [id: string]: MakerJSModel };
  units?: string;
}

/**
 * Converts maker.js model coordinates from Y-up to SVG Y-down coordinate system
 * @param makerJsModel - The maker.js model to convert
 * @param height - The height of the SVG canvas
 * @returns A new maker.js model with converted coordinates
 */
export const convertMakerJsToSvgCoordinates = (
  makerJsModel: MakerJSModel, 
  height: number
): MakerJSModel => {
  // Create a deep copy of the model
  const svgModel: MakerJSModel = JSON.parse(JSON.stringify(makerJsModel));
  
  // Convert all paths
  if (svgModel.paths) {
    Object.values(svgModel.paths).forEach(path => {
      if (path.origin) {
        path.origin[1] = height - path.origin[1];
      }
      if (path.end) {
        path.end[1] = height - path.end[1];
      }
    });
  }
  
  // Convert all nested models recursively
  if (svgModel.models) {
    Object.values(svgModel.models).forEach(model => {
      convertMakerJsToSvgCoordinates(model, height);
    });
  }
  
  return svgModel;
};

/**
 * Converts SVG coordinates from Y-down to maker.js Y-up coordinate system
 * @param svgModel - The SVG model to convert
 * @param height - The height of the SVG canvas
 * @returns A new maker.js model with converted coordinates
 */
export const convertSvgToMakerJsCoordinates = (
  svgModel: MakerJSModel, 
  height: number
): MakerJSModel => {
  // This is the same conversion since it's symmetric
  return convertMakerJsToSvgCoordinates(svgModel, height);
};
