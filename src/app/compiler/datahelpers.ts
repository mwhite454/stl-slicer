import * as svgPathParser from 'svg-path-parser';

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

export interface PolygonsToSvgPathPoint {
  X: number;
  Y: number;
}

export type PolygonsToSvgPathPolygon = PolygonsToSvgPathPoint[];

export function polygonsToSvgPath(
  polygons: PolygonsToSvgPathPolygon[],
  scaleFactor: number = 1000
): string {
  if (!polygons.length) return "";

  return polygons.map(polygon => {
    if (!polygon.length) return "";
    
    const pathData = polygon.map((point, index) => {
      const x = (point.X / scaleFactor).toFixed(3);
      const y = (point.Y / scaleFactor).toFixed(3);
      return index === 0 ? `M${x},${y}` : `L${x},${y}`;
    }).join(' ') + 'Z';
    
    return pathData;
  }).join(' ');
}