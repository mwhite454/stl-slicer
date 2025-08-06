import * as svgPathParser from 'svg-path-parser';
import {ClipperLib} from "../../utils/clipper";

export function parseSvgPaths(svgArray: string[]) {
    const paths: any[] = [];
    svgArray.forEach(svg => {
        const matches = svg.match(/<path[^>]*d="([^"]*)"/g); // Extract all 'd' attributes
        if (matches) {
            matches.forEach(match => {
                const execResult = /d="([^"]*)"/.exec(match);
                if (execResult && execResult[1]) {
                    const pathData = execResult[1];
                    const parsed = svgPathParser.parseSVG(pathData);
                    paths.push(parsed);
                }
            });
        }
    });
    return paths;
}

export type SvgPathCommand = {
    x?: number;
    y?: number;
    [key: string]: any;
};

export function svgPathToPolygons(parsedPaths: any[], scaleFactor = 1000) {
    const polygons: any[] = [];
    parsedPaths.forEach(parsedPath => {
        const polygon: any[] = [];
        parsedPath.forEach((command: SvgPathCommand) => {
            if (command.x !== undefined && command.y !== undefined) {
          polygon.push({
              X: Math.round(command.x * scaleFactor),
              Y: Math.round(command.y * scaleFactor),
          });
            }
        });
        if (polygon.length) polygons.push(polygon);
    });
    return polygons;
}

// Moved types and interfaces from compiler page
export interface IntPointType {
  X: number;
  Y: number;
}

export type Polygon = IntPointType[];
export type Polygons = Polygon[];

export interface PolygonsToSvgPathPoint {
  X: number;
  Y: number;
}

export type PolygonsToSvgPathPolygon = PolygonsToSvgPathPoint[];

// This function unions all polygons into one, then offsets the result by offsetDistance.
// The result is a single perimeter polygon that overlaps all input polygons by at least offsetDistance.
export function createOffsetPath(
  polygons: Polygons,
  offsetDistance: number,
  scaleFactor: number = 1000
): Polygons {
  if (!polygons.length) return [];

  // Union all polygons into a single shape
  const clipper = new ClipperLib.Clipper();
  const solution: Polygons = [];
  clipper.AddPaths(polygons, ClipperLib.PolyType.ptSubject, true);
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );

  // Simplify the unioned shape to remove overlaps
  const simplifiedSolution = ClipperLib.Clipper.SimplifyPolygons(solution, ClipperLib.PolyFillType.pftNonZero);

  // Offset the unioned shape outward by offsetDistance
  const offsetter = new ClipperLib.ClipperOffset();
  offsetter.AddPaths(simplifiedSolution, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const offsetSolution: Polygons = [];
  offsetter.Execute(offsetSolution, offsetDistance * scaleFactor);

  // Apply additional offset passes to ensure minimum width
  const expandedOffsetter = new ClipperLib.ClipperOffset();
  expandedOffsetter.AddPaths(offsetSolution, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const expandedSolution: Polygons = [];
  expandedOffsetter.Execute(expandedSolution, offsetDistance * scaleFactor * 2);

  return ClipperLib.Clipper.SimplifyPolygons(expandedSolution, ClipperLib.PolyFillType.pftNonZero);
}

export function polygonsToSvgPath(
  polygons: PolygonsToSvgPathPolygon[],
  scaleFactor: number = 1000
): string {
  return polygons
    .map((polygon: PolygonsToSvgPathPolygon) => {
      return polygon
        .map((point: PolygonsToSvgPathPoint) => `${point.X / scaleFactor},${point.Y / scaleFactor}`)
        .join(' L ');
    })
    .join(' ');
}