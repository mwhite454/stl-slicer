import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

export type Axis = 'x' | 'y' | 'z';
export type LayerData = {
  index: number;
  paths: Array<Array<THREE.Vector2>>;
  z: number;
};

export class StlSlicer {
  private geometry: THREE.BufferGeometry | null = null;
  private mesh: THREE.Mesh | null = null;
  private boundingBox: THREE.Box3 | null = null;

  constructor() {}

  /**
   * Load an STL file and prepare it for slicing
   */
  async loadSTL(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new STLLoader();
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          if (event.target?.result) {
            const geometry = loader.parse(event.target.result as ArrayBuffer);
            this.geometry = geometry;
            
            // Create a mesh from the geometry
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            this.mesh = new THREE.Mesh(geometry, material);
            
            // Compute the bounding box
            this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
            
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Get the dimensions of the loaded model
   */
  getDimensions(): { width: number; height: number; depth: number } | null {
    if (!this.boundingBox) return null;
    
    const size = new THREE.Vector3();
    this.boundingBox.getSize(size);
    
    return {
      width: size.x,
      height: size.y,
      depth: size.z
    };
  }

  /**
   * Slice the STL model along the specified axis with the given layer thickness
   */
  sliceModel(axis: Axis, layerThickness: number): LayerData[] {
    if (!this.geometry || !this.boundingBox) {
      throw new Error('No model loaded');
    }

    // Prepare the model for slicing
    const position = this.geometry.getAttribute('position');
    const indices = this.geometry.getIndex();
    
    if (!position || !indices) {
      throw new Error('Invalid geometry');
    }

    // Determine the slicing range based on the chosen axis
    const min = this.boundingBox.min;
    const max = this.boundingBox.max;
    
    let start: number, end: number;
    
    if (axis === 'x') {
      start = min.x;
      end = max.x;
    } else if (axis === 'y') {
      start = min.y;
      end = max.y;
    } else {
      start = min.z;
      end = max.z;
    }

    // Generate slice planes
    const layers: LayerData[] = [];
    let layerIndex = 0;
    
    for (let z = start; z <= end; z += layerThickness) {
      const paths = this.createSlice(z, axis);
      layers.push({
        index: layerIndex++,
        paths,
        z
      });
    }
    
    return layers;
  }

  /**
   * Create a slice at the specified position along the given axis
   */
  private createSlice(position: number, axis: Axis): Array<Array<THREE.Vector2>> {
    if (!this.geometry) {
      throw new Error('No model loaded');
    }

    const posAttr = this.geometry.getAttribute('position');
    const indices = this.geometry.getIndex();
    
    if (!posAttr || !indices) {
      throw new Error('Invalid geometry');
    }

    const vertices: number[] = [];
    const intersectedEdges: Array<Array<THREE.Vector3>> = [];

    // Check each triangle for intersection with the slice plane
    for (let i = 0; i < indices.count; i += 3) {
      const idx1 = indices.getX(i);
      const idx2 = indices.getX(i + 1);
      const idx3 = indices.getX(i + 2);

      const v1 = new THREE.Vector3(
        posAttr.getX(idx1),
        posAttr.getY(idx1),
        posAttr.getZ(idx1)
      );
      
      const v2 = new THREE.Vector3(
        posAttr.getX(idx2),
        posAttr.getY(idx2),
        posAttr.getZ(idx2)
      );
      
      const v3 = new THREE.Vector3(
        posAttr.getX(idx3),
        posAttr.getY(idx3),
        posAttr.getZ(idx3)
      );

      // Check if the triangle intersects with the slice plane
      const intersectionPoints: THREE.Vector3[] = [];

      // Helper function to check if an edge intersects with the slice plane
      const checkEdge = (start: THREE.Vector3, end: THREE.Vector3) => {
        let a, b;
        if (axis === 'x') {
          a = start.x;
          b = end.x;
        } else if (axis === 'y') {
          a = start.y;
          b = end.y;
        } else {
          a = start.z;
          b = end.z;
        }

        // Check if the edge crosses the slice plane
        if ((a <= position && b >= position) || (a >= position && b <= position)) {
          const t = Math.abs((position - a) / (b - a));
          if (!isNaN(t) && isFinite(t)) {
            const point = new THREE.Vector3().lerpVectors(start, end, t);
            intersectionPoints.push(point);
          }
        }
      };

      // Check each edge of the triangle
      checkEdge(v1, v2);
      checkEdge(v2, v3);
      checkEdge(v3, v1);

      // If we have exactly 2 intersection points, we have a valid line segment
      if (intersectionPoints.length === 2) {
        intersectedEdges.push(intersectionPoints);
      }
    }

    // Convert intersected edges into 2D paths
    return this.buildPaths(intersectedEdges, axis);
  }

  /**
   * Convert 3D intersection points to 2D paths
   */
  private buildPaths(edges: Array<Array<THREE.Vector3>>, axis: Axis): Array<Array<THREE.Vector2>> {
    if (edges.length === 0) return [];

    // Convert 3D points to 2D based on the slicing axis
    const points2D: Array<Array<THREE.Vector2>> = edges.map(edge => {
      return edge.map(point => {
        if (axis === 'x') {
          return new THREE.Vector2(point.y, point.z);
        } else if (axis === 'y') {
          return new THREE.Vector2(point.x, point.z);
        } else {
          return new THREE.Vector2(point.x, point.y);
        }
      });
    });

    // Connect the edges to form closed paths
    const paths: Array<Array<THREE.Vector2>> = [];
    const remainingEdges = [...points2D];

    while (remainingEdges.length > 0) {
      const currentPath: Array<THREE.Vector2> = [];
      let currentEdge = remainingEdges.pop();
      
      if (!currentEdge) break;

      currentPath.push(currentEdge[0], currentEdge[1]);

      let foundConnection = true;
      while (foundConnection && remainingEdges.length > 0) {
        foundConnection = false;
        
        for (let i = 0; i < remainingEdges.length; i++) {
          const edge = remainingEdges[i];
          const lastPoint = currentPath[currentPath.length - 1];
          
          const distance1 = lastPoint.distanceTo(edge[0]);
          const distance2 = lastPoint.distanceTo(edge[1]);
          
          const EPSILON = 0.0001;
          
          if (distance1 < EPSILON) {
            currentPath.push(edge[1]);
            remainingEdges.splice(i, 1);
            foundConnection = true;
            break;
          } else if (distance2 < EPSILON) {
            currentPath.push(edge[0]);
            remainingEdges.splice(i, 1);
            foundConnection = true;
            break;
          }
        }
      }

      // Add the path if it has at least 3 points (to form a polygon)
      if (currentPath.length >= 3) {
        paths.push(currentPath);
      }
    }

    return paths;
  }

  /**
   * Generate an SVG string from layer data
   */
  generateSVG(layer: LayerData): string {
    if (!this.boundingBox) {
      throw new Error('No model loaded');
    }

    const size = new THREE.Vector3();
    this.boundingBox.getSize(size);

    const width = Math.ceil(Math.max(size.x, size.y));
    const height = Math.ceil(Math.max(size.x, size.y));

    // SVG header
    let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" 
     xmlns="http://www.w3.org/2000/svg">
<g transform="translate(${width/2}, ${height/2})">`;

    // Add each path as a polyline
    for (const path of layer.paths) {
      const pathData = path.map((point, index) => 
        `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`
      ).join(' ') + 'Z';

      svg += `
  <path d="${pathData}" fill="none" stroke="black" stroke-width="0.1" />`;
    }

    // SVG footer
    svg += `
</g>
</svg>`;

    return svg;
  }
} 