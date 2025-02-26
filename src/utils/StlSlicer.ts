import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

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
            // Parse the STL file
            const geometry = loader.parse(event.target.result as ArrayBuffer);
            
            // Ensure the geometry has indices - STLLoader doesn't always create them
            if (!geometry.index) {
              // Create an index buffer if not present
              const positionAttribute = geometry.getAttribute('position');
              if (positionAttribute) {
                const indices = [];
                for (let i = 0; i < positionAttribute.count; i++) {
                  indices.push(i);
                }
                geometry.setIndex(indices);
              }
            }
            
            // Ensure normals are computed
            if (!geometry.getAttribute('normal')) {
              geometry.computeVertexNormals();
            }
            
            this.geometry = geometry;
            
            // Create a mesh from the geometry
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            this.mesh = new THREE.Mesh(geometry, material);
            
            // Compute the bounding box
            geometry.computeBoundingBox();
            this.boundingBox = geometry.boundingBox ? geometry.boundingBox.clone() : new THREE.Box3().setFromObject(this.mesh);
            
            resolve();
          }
        } catch (error) {
          console.error('Error loading STL:', error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
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
    
    if (!position) {
      throw new Error('Invalid geometry: missing position attribute');
    }

    // If no indices, we need to create them (although we should have done this in loadSTL)
    if (!indices) {
      console.warn('No indices found on geometry, creating them automatically');
      const newIndices = [];
      for (let i = 0; i < position.count; i++) {
        newIndices.push(i);
      }
      this.geometry.setIndex(newIndices);
    }

    // Validate again after potential fix
    if (!this.geometry.getIndex()) {
      throw new Error('Failed to create geometry indices');
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

    // Calculate total height and adjust for even layer distribution
    const totalHeight = end - start;
    
    // Ensure we have at least 2 layers (start and end)
    const minLayers = 2;
    
    // Calculate how many layers we need
    const calculatedLayerCount = Math.max(
      minLayers, 
      Math.ceil(totalHeight / layerThickness)
    );
    
    // Recalculate layer thickness to evenly distribute layers
    // This ensures we have slices that perfectly match the model bounds
    const adjustedLayerThickness = totalHeight / (calculatedLayerCount - 1);
    
    // Generate slice planes
    const layers: LayerData[] = [];
    
    // Create evenly distributed slices from start to end (inclusive)
    for (let i = 0; i < calculatedLayerCount; i++) {
      const z = start + (i * adjustedLayerThickness);
      const paths = this.createSlice(z, axis);
      
      layers.push({
        index: i,
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
    let indices = this.geometry.getIndex();
    
    if (!posAttr) {
      throw new Error('Invalid geometry: missing position attribute');
    }

    // If no indices, create them (although this should have been handled already)
    if (!indices) {
      console.warn('No indices found in createSlice, creating them automatically');
      const newIndices = [];
      for (let i = 0; i < posAttr.count; i += 3) {
        newIndices.push(i, i + 1, i + 2);
      }
      this.geometry.setIndex(newIndices);
      indices = this.geometry.getIndex();
      
      if (!indices) {
        throw new Error('Failed to create indices in createSlice');
      }
    }

    const intersectedEdges: Array<Array<THREE.Vector3>> = [];

    // Ensure we're dealing with triangles
    if (indices.count % 3 !== 0) {
      console.warn('Geometry is not made up of triangles');
    }

    // Check each triangle for intersection with the slice plane
    for (let i = 0; i < indices.count; i += 3) {
      try {
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
      } catch (error) {
        console.error('Error processing triangle:', error);
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
        if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
          console.warn('Invalid point encountered:', point);
          return new THREE.Vector2(0, 0); // Fallback to avoid errors
        }
        
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

    // Safety check for empty edges or invalid data
    if (remainingEdges.length === 0) {
      return [];
    }

    let safetyCounter = 0;
    const MAX_ITERATIONS = 10000; // Prevent infinite loops

    while (remainingEdges.length > 0 && safetyCounter < MAX_ITERATIONS) {
      safetyCounter++;
      
      const currentPath: Array<THREE.Vector2> = [];
      let currentEdge = remainingEdges.pop();
      
      if (!currentEdge || currentEdge.length < 2) {
        continue; // Skip invalid edges
      }

      currentPath.push(currentEdge[0], currentEdge[1]);

      let foundConnection = true;
      let pathSafetyCounter = 0;
      const MAX_PATH_ITERATIONS = 1000; // Prevent excessive path building
      
      while (foundConnection && remainingEdges.length > 0 && pathSafetyCounter < MAX_PATH_ITERATIONS) {
        pathSafetyCounter++;
        foundConnection = false;
        
        // Try to find the closest edge to connect
        let closestIndex = -1;
        let closestDistance = Number.MAX_VALUE;
        let useFirstPoint = false; // Whether to use first or second point of the edge
        
        const lastPoint = currentPath[currentPath.length - 1];
        if (!lastPoint) continue; // Skip if no last point
        
        for (let i = 0; i < remainingEdges.length; i++) {
          const edge = remainingEdges[i];
          if (!edge || edge.length < 2) continue; // Skip invalid edges
          
          try {
            const distance1 = lastPoint.distanceTo(edge[0]);
            const distance2 = lastPoint.distanceTo(edge[1]);
            
            const EPSILON = 0.0001;
            
            if (distance1 < EPSILON && distance1 < closestDistance) {
              closestIndex = i;
              closestDistance = distance1;
              useFirstPoint = true;
            } else if (distance2 < EPSILON && distance2 < closestDistance) {
              closestIndex = i;
              closestDistance = distance2;
              useFirstPoint = false;
            }
          } catch (error) {
            console.error('Error connecting paths:', error);
            continue;
          }
        }
        
        // If we found a close edge, connect it
        if (closestIndex !== -1) {
          const edge = remainingEdges[closestIndex];
          if (useFirstPoint) {
            currentPath.push(edge[1]);
          } else {
            currentPath.push(edge[0]);
          }
          remainingEdges.splice(closestIndex, 1);
          foundConnection = true;
        }
      }

      // Check if the path is closed (last point is close to first point)
      const firstPoint = currentPath[0];
      const lastPoint = currentPath[currentPath.length - 1];
      
      if (firstPoint && lastPoint) {
        const EPSILON = 0.0001;
        const isPathClosed = firstPoint.distanceTo(lastPoint) < EPSILON;
        
        // Add the path if it has at least 3 points and is closed
        if (currentPath.length >= 3 && isPathClosed) {
          paths.push(currentPath);
        }
      }
    }

    if (safetyCounter >= MAX_ITERATIONS) {
      console.warn('Maximum iterations reached when building paths');
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
      // Skip paths with less than 3 points (they can't form proper polygons)
      if (path.length < 3) continue;
      
      // Check if path is properly closed (first and last points are close)
      const firstPoint = path[0];
      const lastPoint = path[path.length - 1];
      const EPSILON = 0.0001;
      
      if (firstPoint.distanceTo(lastPoint) > EPSILON) {
        // Skip unclosed paths
        continue;
      }
      
      const pathData = path.map((point, index) => 
        `${index === 0 ? 'M' : 'L'}${point.x.toFixed(3)},${point.y.toFixed(3)}`
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