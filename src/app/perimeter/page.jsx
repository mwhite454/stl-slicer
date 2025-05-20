// SVG Profile Generator - React Component for Next.js
// Creates a top-down profile from multiple SVG files for laser cutting
'use client'
import React, { useState, useEffect, useRef } from 'react';

// This function parses an SVG file and extracts all path coordinates
function extractCoordinatesFromSVG(svgContent) {
  const coordinates = [];
  
  // Regular expression to find path data
  const pathRegex = /<path[^>]*d="([^"]*)"[^>]*>/g;
  let pathMatch;
  
  while ((pathMatch = pathRegex.exec(svgContent)) !== null) {
    const pathData = pathMatch[1];
    
    // Parse the path data to extract coordinates
    // This handles basic SVG path commands (M, L, H, V, C, S, Q, T, A, Z)
    const commandRegex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;
    let command;
    let currentX = 0;
    let currentY = 0;
    
    while ((command = commandRegex.exec(pathData)) !== null) {
      const cmd = command[1].toUpperCase();
      const params = command[2].trim().split(/[\s,]+/).filter(p => p !== '').map(parseFloat);
      
      switch (cmd) {
        case 'M': // Move to
        case 'L': // Line to
          for (let i = 0; i < params.length; i += 2) {
            currentX = params[i];
            currentY = params[i + 1];
            coordinates.push({ x: currentX, y: currentY });
          }
          break;
          
        case 'H': // Horizontal line
          for (let i = 0; i < params.length; i++) {
            currentX = params[i];
            coordinates.push({ x: currentX, y: currentY });
          }
          break;
          
        case 'V': // Vertical line
          for (let i = 0; i < params.length; i++) {
            currentY = params[i];
            coordinates.push({ x: currentX, y: currentY });
          }
          break;
          
        case 'C': // Cubic bezier
          for (let i = 0; i < params.length; i += 6) {
            // Add control points and endpoint
            coordinates.push({ x: params[i], y: params[i + 1] });
            coordinates.push({ x: params[i + 2], y: params[i + 3] });
            currentX = params[i + 4];
            currentY = params[i + 5];
            coordinates.push({ x: currentX, y: currentY });
          }
          break;
          
        case 'S': // Smooth cubic bezier
          for (let i = 0; i < params.length; i += 4) {
            // Add control point and endpoint
            coordinates.push({ x: params[i], y: params[i + 1] });
            currentX = params[i + 2];
            currentY = params[i + 3];
            coordinates.push({ x: currentX, y: currentY });
          }
          break;
          
        case 'Q': // Quadratic bezier
          for (let i = 0; i < params.length; i += 4) {
            // Add control point and endpoint
            coordinates.push({ x: params[i], y: params[i + 1] });
            currentX = params[i + 2];
            currentY = params[i + 3];
            coordinates.push({ x: currentX, y: currentY });
          }
          break;
          
        case 'T': // Smooth quadratic bezier
          for (let i = 0; i < params.length; i += 2) {
            currentX = params[i];
            currentY = params[i + 1];
            coordinates.push({ x: currentX, y: currentY });
          }
          break;
          
        case 'A': // Arc
          for (let i = 0; i < params.length; i += 7) {
            // For arcs, we just capture the endpoint as a simplification
            currentX = params[i + 5];
            currentY = params[i + 6];
            coordinates.push({ x: currentX, y: currentY });
          }
          break;
          
        case 'Z': // Close path
          // No new coordinates for close path command
          break;
      }
    }
  }
  
  return coordinates;
}

// This function finds the extreme points (min and max) from a list of coordinates
function findExtremePoints(allCoordinates) {
  if (allCoordinates.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const coord of allCoordinates) {
    minX = Math.min(minX, coord.x);
    minY = Math.min(minY, coord.y);
    maxX = Math.max(maxX, coord.x);
    maxY = Math.max(maxY, coord.y);
  }
  
  return { minX, minY, maxX, maxY };
}

// Create a simple SVG with a path that forms a rectangular perimeter
function createPerimeterSVG(extremes, margin = 5) {
  const { minX, minY, maxX, maxY } = extremes;
  
  // Add margin around the perimeter
  const x1 = minX - margin;
  const y1 = minY - margin;
  const x2 = maxX + margin;
  const y2 = maxY + margin;
  
  const width = x2 - x1;
  const height = y2 - y1;
  
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${width}" height="${height}" viewBox="${x1} ${y1} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <path d="M ${x1},${y1} L ${x2},${y1} L ${x2},${y2} L ${x1},${y2} Z" fill="none" stroke="black" stroke-width="1"/>
</svg>`;
}

// Example usage:
// This is a mock implementation - in a real scenario, you'd load the SVG files from disk
function processMultipleSVGFiles(svgContents, margin = 5) {
  // Extract coordinates from all SVG files
  const allCoordinates = [];
  
  for (const svgContent of svgContents) {
    const fileCoordinates = extractCoordinatesFromSVG(svgContent);
    allCoordinates.push(...fileCoordinates);
  }
  
  // Find the extreme points
  const extremes = findExtremePoints(allCoordinates);
  
  // Create the perimeter SVG
  const perimeterSVG = createPerimeterSVG(extremes, margin);
  
  return {
    extremes,
    perimeterSVG
  };
}

// For creating a more complex perimeter (convex hull instead of rectangle)
function createConvexHullSVG(coordinates, margin = 5) {
  // Compute the convex hull using the Graham scan algorithm
  function computeConvexHull(points) {
    // Find the point with the lowest y-coordinate (and leftmost if tied)
    let startPoint = points[0];
    for (let i = 1; i < points.length; i++) {
      if (points[i].y < startPoint.y || 
          (points[i].y === startPoint.y && points[i].x < startPoint.x)) {
        startPoint = points[i];
      }
    }
    
    // Sort the points by polar angle with respect to the start point
    const sortedPoints = [...points].sort((a, b) => {
      if (a === startPoint) return -1;
      if (b === startPoint) return 1;
      
      const angleA = Math.atan2(a.y - startPoint.y, a.x - startPoint.x);
      const angleB = Math.atan2(b.y - startPoint.y, b.x - startPoint.x);
      
      if (angleA === angleB) {
        // If angles are the same, sort by distance from start point
        const distA = Math.sqrt(
          Math.pow(a.x - startPoint.x, 2) + Math.pow(a.y - startPoint.y, 2)
        );
        const distB = Math.sqrt(
          Math.pow(b.x - startPoint.x, 2) + Math.pow(b.y - startPoint.y, 2)
        );
        return distA - distB;
      }
      
      return angleA - angleB;
    });
    
    // Initialize the hull with the first three points
    if (sortedPoints.length < 3) return sortedPoints;
    
    const hull = [sortedPoints[0], sortedPoints[1]];
    
    // Process remaining points
    for (let i = 2; i < sortedPoints.length; i++) {
      while (hull.length >= 2) {
        const top = hull[hull.length - 1];
        const nextToTop = hull[hull.length - 2];
        
        // Check if the next point turns counterclockwise
        const cross = (top.x - nextToTop.x) * (sortedPoints[i].y - top.y) -
                      (top.y - nextToTop.y) * (sortedPoints[i].x - top.x);
        
        if (cross > 0) break;
        hull.pop(); // Remove the last point if it doesn't form a counterclockwise turn
      }
      
      hull.push(sortedPoints[i]);
    }
    
    return hull;
  }
  
  // Apply convex hull algorithm
  const hullPoints = computeConvexHull(coordinates);
  
  // Apply margin to the hull points
  // For simplicity, we'll expand the hull by moving each point away from the centroid
  let centroidX = 0;
  let centroidY = 0;
  
  for (const point of hullPoints) {
    centroidX += point.x;
    centroidY += point.y;
  }
  
  centroidX /= hullPoints.length;
  centroidY /= hullPoints.length;
  
  const expandedHull = hullPoints.map(point => {
    const dx = point.x - centroidX;
    const dy = point.y - centroidY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Move the point outward by the margin distance
    const expandFactor = distance > 0 ? (distance + margin) / distance : 1;
    
    return {
      x: centroidX + dx * expandFactor,
      y: centroidY + dy * expandFactor
    };
  });
  
  // Create SVG path data for the hull
  let pathData = `M ${expandedHull[0].x},${expandedHull[0].y}`;
  for (let i = 1; i < expandedHull.length; i++) {
    pathData += ` L ${expandedHull[i].x},${expandedHull[i].y}`;
  }
  pathData += " Z"; // Close the path
  
  // Calculate the bounding box for the SVG viewBox
  const extremes = findExtremePoints(expandedHull);
  const { minX, minY, maxX, maxY } = extremes;
  const width = maxX - minX;
  const height = maxY - minY;
  
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <path d="${pathData}" fill="none" stroke="black" stroke-width="1"/>
</svg>`;
}

// Example of how to use the code in a browser environment with file inputs
function setupFileInput() {
  const fileInput = document.getElementById('svg-files');
  const marginInput = document.getElementById('margin');
  const generateButton = document.getElementById('generate-button');
  const resultContainer = document.getElementById('result');
  const downloadLink = document.getElementById('download-link');
  
  generateButton.addEventListener('click', async () => {
    const files = fileInput.files;
    if (files.length === 0) {
      alert('Please select at least one SVG file.');
      return;
    }
    
    const margin = parseFloat(marginInput.value) || 5;
    const svgContents = [];
    
    // Read all SVG files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.svg')) {
        alert(`File ${file.name} is not an SVG file.`);
        continue;
      }
      
      const content = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
      });
      
      svgContents.push(content);
    }
    
    // Process the SVG files to extract coordinates
    const allCoordinates = [];
    for (const svgContent of svgContents) {
      const fileCoordinates = extractCoordinatesFromSVG(svgContent);
      allCoordinates.push(...fileCoordinates);
    }
    
    // Generate either a rectangular perimeter or convex hull
    const useConvexHull = document.getElementById('use-convex-hull').checked;
    let perimeterSVG;
    
    if (useConvexHull) {
      perimeterSVG = createConvexHullSVG(allCoordinates, margin);
    } else {
      const extremes = findExtremePoints(allCoordinates);
      perimeterSVG = createPerimeterSVG(extremes, margin);
    }
    
    // Display the result
    resultContainer.innerHTML = perimeterSVG;
    
    // Create download link
    const blob = new Blob([perimeterSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = 'perimeter.svg';
    downloadLink.style.display = 'block';
  });
}

export default function Perimeter() {
  return (
    <div>
      <h1>Perimeter</h1>
    </div>
  );
}