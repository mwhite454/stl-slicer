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
