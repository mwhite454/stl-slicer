import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { categorizePaths, textToSvgPath } from './pathHelpers'

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
    if (edges.length === 0) {
      console.warn('No edges found for this slice');
      return [];
    }
    
    console.log(`[StlSlicer] Building paths from ${edges.length} edges`);

    // Convert 3D points to 2D based on the slicing axis
    const segments: Array<[THREE.Vector2, THREE.Vector2]> = [];
    
    // Process each edge and convert to 2D segment
    for (const edge of edges) {
      // Ensure the edge has exactly two points
      if (edge.length !== 2 || !edge[0] || !edge[1]) {
        console.warn('Skipping invalid edge:', edge);
        continue;
      }
      
      const p1 = this.convertTo2D(edge[0], axis);
      const p2 = this.convertTo2D(edge[1], axis);
      
      // Avoid zero-length segments
      if (p1.distanceTo(p2) > 0.0001) {
        segments.push([p1, p2]);
      }
    }

    if (segments.length === 0) {
      console.warn('No valid 2D segments generated');
      return [];
    }

    // Construct a graph structure for intelligent path finding
    interface Node {
      position: THREE.Vector2;
      connections: Set<number>; // Indices of connected nodes
      used: boolean; // Flag to mark if this node has been used in a path
    }

    const nodes: Node[] = [];
    const nodeMap = new Map<string, number>(); // Map point hash to index in nodes array
    const TOLERANCE = 0.01;
    
    // Function to get a unique key for a point (for detecting duplicates)
    const getPointKey = (point: THREE.Vector2) => {
      return `${Math.round(point.x / TOLERANCE)},${Math.round(point.y / TOLERANCE)}`;
    };
    
    // Function to get or create a node index
    const getNodeIndex = (point: THREE.Vector2): number => {
      const key = getPointKey(point);
      if (nodeMap.has(key)) {
        return nodeMap.get(key)!;
      }
      
      const index = nodes.length;
      nodes.push({
        position: point.clone(),
        connections: new Set<number>(),
        used: false
      });
      nodeMap.set(key, index);
      return index;
    };
    
    // Build the graph from segments
    for (const [p1, p2] of segments) {
      const i1 = getNodeIndex(p1);
      const i2 = getNodeIndex(p2);
      
      if (i1 !== i2) {  // Avoid self-loops
        nodes[i1].connections.add(i2);
        nodes[i2].connections.add(i1);
      }
    }
    
    console.log(`[StlSlicer] Built graph with ${nodes.length} nodes`);
    
    const paths: Array<Array<THREE.Vector2>> = [];
    
    // Specialized algorithm for detecting closed contours first
    const findClosedContours = () => {
      // First pass - try to find clean closed loops without any branches
      for (let startIdx = 0; startIdx < nodes.length; startIdx++) {
        if (nodes[startIdx].used) continue;
        
        // Only consider nodes with exactly 2 connections as starting points
        // These are ideal for loops/circles
        if (nodes[startIdx].connections.size !== 2) continue;
        
        const path: Array<THREE.Vector2> = [nodes[startIdx].position.clone()];
        nodes[startIdx].used = true;
        
        let currentIdx = startIdx;
        let complete = false;
        let length = 0;
        
        // Keep following the path until we return to start or hit a dead-end
        while (!complete) {
          const currentNode = nodes[currentIdx];
          let nextIdx: number | null = null;
          
          // Find an unused connection
          for (const connIdx of currentNode.connections) {
            if (!nodes[connIdx].used) {
              nextIdx = connIdx;
              break;
            }
          }
          
          // If no next node or we've visited all neighbors, check if path forms a loop
          if (nextIdx === null) {
            // Check if we can close the loop - are we connected to the start?
            for (const connIdx of currentNode.connections) {
              if (connIdx === startIdx) {
                complete = true;
                break;
              }
            }
            break; // Exit the while loop, we're done with this path
          }
          
          // Add the next point to the path and mark it as used
          currentIdx = nextIdx;
          path.push(nodes[currentIdx].position.clone());
          nodes[currentIdx].used = true;
          
          // Calculate length so far
          if (path.length > 1) {
            length += path[path.length - 1].distanceTo(path[path.length - 2]);
          }
          
          // If we found our way back to the start, we have a closed loop
          if (currentIdx === startIdx) {
            complete = true;
          }
          
          // Safety check - don't let paths get too long
          if (path.length > segments.length * 2) {
            console.warn('Path is too long, breaking loop');
            break;
          }
        }
        
        // If we completed a loop and it's not too small, add it to paths
        if (complete && path.length >= 3 && length > 0.5) {
          // Ensure the path is closed
          if (path[0].distanceTo(path[path.length - 1]) > TOLERANCE) {
            path.push(path[0].clone());
          }
          paths.push(path);
        } else {
          // If we didn't complete a loop, unmark these nodes so they can be used in other paths
          for (let i = 0; i < path.length; i++) {
            const nodeIdx = nodeMap.get(getPointKey(path[i]));
            if (nodeIdx !== undefined) {
              nodes[nodeIdx].used = false;
            }
          }
        }
      }
    };
    
    // Run the specialized contour detection
    findClosedContours();
    
    // Second pass - handle any remaining segments
    const handleRemainingSegments = () => {
      const remaining = nodes.filter(node => !node.used);
      if (remaining.length === 0) return;
      
      console.log(`[StlSlicer] Processing ${remaining.length} remaining nodes`);
      
      // Helper function to find the best next node
      const findBestNextNode = (currentIdx: number, visited: Set<number>): number | null => {
        const currentNode = nodes[currentIdx];
        let bestNextIdx: number | null = null;
        let bestScore = Infinity;
        
        for (const nextIdx of currentNode.connections) {
          if (visited.has(nextIdx)) continue;
          if (nodes[nextIdx].used) continue;
          
          // Score based on number of connections (fewer is better)
          const score = nodes[nextIdx].connections.size;
          if (score < bestScore) {
            bestScore = score;
            bestNextIdx = nextIdx;
          }
        }
        
        return bestNextIdx;
      };
      
      // Process remaining nodes
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].used) continue;
        
        const path: Array<THREE.Vector2> = [nodes[i].position.clone()];
        nodes[i].used = true;
        
        const visited = new Set<number>([i]);
        let currentIdx = i;
        let length = 0;
        
        // Extend the path in both directions
        
        // Forward direction
        while (true) {
          const nextIdx = findBestNextNode(currentIdx, visited);
          if (nextIdx === null) break;
          
          path.push(nodes[nextIdx].position.clone());
          nodes[nextIdx].used = true;
          visited.add(nextIdx);
          
          // Calculate length
          length += path[path.length - 1].distanceTo(path[path.length - 2]);
          
          currentIdx = nextIdx;
        }
        
        // Backward direction (start from the original node again)
        currentIdx = i;
        const reversePath: Array<THREE.Vector2> = [];
        
        while (true) {
          const nextIdx = findBestNextNode(currentIdx, visited);
          if (nextIdx === null) break;
          
          reversePath.unshift(nodes[nextIdx].position.clone());
          nodes[nextIdx].used = true;
          visited.add(nextIdx);
          
          // Calculate length
          if (reversePath.length > 0) {
            length += nodes[nextIdx].position.distanceTo(
              reversePath.length > 0 ? reversePath[0] : nodes[currentIdx].position
            );
          }
          
          currentIdx = nextIdx;
        }
        
        // Combine paths: reversePath + original point + forward path
        const fullPath = [...reversePath, ...path];
        
        // Only add paths with reasonable size and length
        if (fullPath.length >= 3 && length > 0.5) {
          // Check if it's a closed path
          const first = fullPath[0];
          const last = fullPath[fullPath.length - 1];
          
          if (first.distanceTo(last) < TOLERANCE) {
            // Already closed
            paths.push(fullPath);
          } else {
            // Check if we can close this path
            const startNodeIdx = nodeMap.get(getPointKey(first));
            const endNodeIdx = nodeMap.get(getPointKey(last));
            
            if (startNodeIdx !== undefined && endNodeIdx !== undefined &&
                nodes[startNodeIdx].connections.has(endNodeIdx)) {
              // Can be closed - it's a contour
              paths.push([...fullPath, first.clone()]);
            } else {
              // Can't be closed properly - but still add as an open path if it's long enough
              paths.push(fullPath);
            }
          }
        }
      }
    };
    
    // Process any remaining segments
    handleRemainingSegments();
    
    // If we didn't find any paths, try again with a simpler method
    if (paths.length === 0) {
      console.warn('[StlSlicer] Failed to find paths with advanced algorithm, trying fallback method');
      
      // Simple method: connect nearest segments
      const allPoints: THREE.Vector2[] = [];
      const usedIndices = new Set<number>();
      
      // Extract all points from segments
      for (const [p1, p2] of segments) {
        allPoints.push(p1.clone(), p2.clone());
      }
      
      // Try to find paths by connecting closest points
      while (usedIndices.size < allPoints.length) {
        let startIdx = -1;
        for (let i = 0; i < allPoints.length; i++) {
          if (!usedIndices.has(i)) {
            startIdx = i;
            break;
          }
        }
        
        if (startIdx === -1) break;
        
        const path: THREE.Vector2[] = [allPoints[startIdx].clone()];
        usedIndices.add(startIdx);
        
        let currentPoint = allPoints[startIdx];
        while (true) {
          let closestIdx = -1;
          let closestDist = Infinity;
          
          // Find closest unused point
          for (let i = 0; i < allPoints.length; i++) {
            if (usedIndices.has(i)) continue;
            
            const dist = currentPoint.distanceTo(allPoints[i]);
            if (dist < closestDist && dist < TOLERANCE * 10) {
              closestDist = dist;
              closestIdx = i;
            }
          }
          
          // No more close points found
          if (closestIdx === -1) break;
          
          path.push(allPoints[closestIdx].clone());
          usedIndices.add(closestIdx);
          currentPoint = allPoints[closestIdx];
          
          // Check if path is getting too long
          if (path.length > allPoints.length) {
            console.warn('Fallback path is too long, breaking');
            break;
          }
        }
        
        // Only add paths with at least 3 points
        if (path.length >= 3) {
          paths.push(path);
        }
      }
    }
    
    console.log(`[StlSlicer] Built ${paths.length} paths`);
    
    // Final cleanup - make sure all paths are properly closed
    return paths.map(path => {
      if (path.length < 3) return path;
      
      const first = path[0];
      const last = path[path.length - 1];
      
      // If the path is not already closed, force-close it
      if (first.distanceTo(last) > TOLERANCE) {
        return [...path, first.clone()];
      }
      
      return path;
    });
  }
  
  /**
   * Helper function to convert a 3D point to 2D based on slicing axis
   */
  private convertTo2D(point: THREE.Vector3, axis: Axis): THREE.Vector2 {
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
      console.warn('Invalid point for 2D conversion:', point);
      return new THREE.Vector2(0, 0);
    }
    
    if (axis === 'x') {
      return new THREE.Vector2(point.y, point.z);
    } else if (axis === 'y') {
      return new THREE.Vector2(point.x, point.z);
    } else {
      return new THREE.Vector2(point.x, point.y);
    }
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
    const categories = categorizePaths(layer.paths);
    const textPath = textToSvgPath(layer.z.toString());

    // Check if we have any valid paths
    if (layer.paths.length === 0) {
      console.warn(`[StlSlicer] No paths for layer ${layer.index} at z=${layer.z}`);
      // Return an empty SVG with a message
      return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" 
     xmlns="http://www.w3.org/2000/svg">
<g transform="translate(${width/2}, ${height/2})">
      
  <text x="0" y="0" text-anchor="middle" font-size="3" fill="red">
    No slice data at this layer (${layer.z.toFixed(2)}mm)
  </text>
</g>
</svg>`;
    }

    // SVG header
    let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" 
     xmlns="http://www.w3.org/2000/svg">
<g transform="translate(${width/2}, ${height/2})">
        ${textPath}`;

    // Add each path as a polyline
    let pathCount = 0;
    const {paths} = layer
    
    paths.forEach((path, index) => {
      const pathColor = categories[index] === "external" ? "red" : "black"
      const pathWeight = categories[index] === "external" ? "0.3" : "0.1"
      // Skip paths with less than 3 points (they can't form proper polygons)
      if (path.length >= 3) {
      // No need to check if closed - we already ensured this in buildPaths
      const pathData = path.map((point:any, index:any) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(3)},${point.y.toFixed(3)}`)
                            .join(' ') + 'Z';

      svg += `\n<path d="${pathData}" fill="none" stroke="${pathColor}" stroke-width="${pathWeight}" />\n`;
      pathCount++;
      }
    })

    if (pathCount === 0) {
      svg += `
        <text x="0" y="0" text-anchor="middle" font-size="3" fill="red">
          All paths were invalid for this layer
        </text>`;
    }

    // SVG footer
    svg += `
    </g>
    </svg>`;

    return svg;
  }
} 