import opentype from "opentype.js";

export async function textToSvgPath(text, fontUrl="fonts/SpaceMono-Regular.ttf", fontSize = 12, x = 0, y = 0) {
  try {
    // Load the font asynchronously
    const font = await opentype.load(fontUrl);

    // Generate the path data for the text
    const pathData = font.getPath(text, x, y, fontSize).toPathData();

    // Return an SVG path element
    return (
      <path
        d={pathData}
        fill="none"
        stroke="blue"
      />
    );
  } catch (error) {
    console.error("Error loading font or generating path:", error);
    return null;
  }
}


function pathToPolygon(path) {
    const points = path.map(({x, y}) => [x, y]);
    return points;
  }

function isPointInPolygon(point, polygon) {
    const [px, py] = point;
    let inside = false;
  
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
  
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
  
      if (intersect) inside = !inside;
    }
  
    return inside;
  }
  

function isContained(innerPolygon, outerPolygon) {
  return innerPolygon.every(point => isPointInPolygon(point, outerPolygon));
}

export function categorizePaths(paths) {
  console.log(`[Path Helpers] categorizing paths for layer`)
  const pathPolygons = paths.map(pathToPolygon);
  const categories = paths.map(() => 'external'); // Default to external

  pathPolygons.forEach((outerPolygon, i) => {
    pathPolygons.forEach((innerPolygon, j) => {
      if (i !== j && isContained(innerPolygon, outerPolygon)) {
        categories[j] = 'internal';
      }
    });
  });

  return categories;
}

  




  