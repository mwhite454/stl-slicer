"use client";

import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import {ClipperLib} from "../../utils/clipper";
import { SVG } from "./SVG";
const svgPathParser = require('svg-path-parser');

function parseSvgPaths(svgArray: string[]) {
    const paths: any[] = [];
    svgArray.forEach(svg => {
        const matches = svg.match(/<path[^>]*d="([^"]*)"/g); // Extract all 'd' attributes
        if (matches) {
            matches.forEach(match => {
                const pathData = /d="([^"]*)"/.exec(match)[1];
                const parsed = svgPathParser(pathData);
                paths.push(parsed);
            });
        }
    });
    return paths;
}

type SvgPathCommand = {
    x?: number;
    y?: number;
    [key: string]: any;
};

function svgPathToPolygons(parsedPaths: any[], scaleFactor = 1000) {
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

interface IntPointType {
  X: number;
  Y: number;
}

type Polygon = IntPointType[];
type Polygons = Polygon[];

// This function unions all polygons into one, then offsets the result by offsetDistance.
// The result is a single perimeter polygon that overlaps all input polygons by at least offsetDistance.
function createOffsetPath(
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

interface PolygonsToSvgPathPoint {
  X: number;
  Y: number;
}

type PolygonsToSvgPathPolygon = PolygonsToSvgPathPoint[];

function polygonsToSvgPath(
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

const SvgCombinerPage = () => {
  const [canvasWidth, setCanvasWidth] = useState<number>(482); // Default width
  const [canvasHeight, setCanvasHeight] = useState<number>(279); // Default height
  const [dimensionType, setDimensionType] = useState<string>("mm"); // Default dimension type
  const [gapSize, setGapSize] = useState<number>(1); // default gap between items
  const [combinedSvgUrl, setCombinedSvgUrl] = useState<string | null>(null);
  const [combinedSvgContent, setCombinedSvgContent] = useState<string | null>(null);
  const [perimeterOffset, setPerimeterOffset] = useState<number>(10); // Default perimeter offset
  const [folderName, setFolderName] = useState<string>("combined_svgs");
  const [previewPage, setPreviewPage] = useState<number>(0);
  const [svgZoom, setSvgZoom] = useState<number>(1);

  const combineAndOptimizeSVGs = async (files: File[]) => {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const xmlns = "http://www.w3.org/2000/svg";
  
    let svgPages: string[] = [];
    let currentSVG = document.createElementNS(xmlns, "svg");
    currentSVG.setAttribute("xmlns", xmlns);
    currentSVG.setAttribute("width", `${canvasWidth}${dimensionType}`);
    currentSVG.setAttribute("height", `${canvasHeight}${dimensionType}`);
    currentSVG.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
  
    let xOffset = 0+gapSize;
    let yOffset = 0+gapSize;
    let rowHeight = 0;
  
    for (const [i, file] of files.entries()) {
      const fileName = file.name;
      const text = await file.text();
      const svgDoc = parser.parseFromString(text, "image/svg+xml");
      let svgElement = svgDoc.documentElement;
  
      // Extract dimensions
      const width = parseFloat(svgElement.getAttribute("width") || "0");
      const height = parseFloat(svgElement.getAttribute("height") || "0");
  
      if (!width || !height) {
        console.warn("SVG skipped due to missing or invalid width/height.");
        continue;
      }
  
      // If the SVG is wrapped in a <g>, remove it and reassign contents
      const groups = svgElement.querySelectorAll("g[transform]");
      if (groups.length) {
        const fragment = document.createDocumentFragment();
        groups.forEach((group) => {
          // Remove transform and append child elements
          const clonedGroup = group.cloneNode(true) as HTMLElement;
          clonedGroup.removeAttribute("transform");
          while (clonedGroup.firstChild) {
            fragment.appendChild(clonedGroup.firstChild);
          }
        });
        svgElement.innerHTML = ""; // Clear original content
        svgElement.appendChild(fragment); // Replace with unwrapped content
      }
  
      // Positioning logic
      if (xOffset + width + gapSize > canvasWidth) {
        xOffset = 0+gapSize; // Start a new row
        yOffset += rowHeight + gapSize; // Move down by row height
        rowHeight = 0; // Reset row height
      }
  
      if (yOffset + height + gapSize > canvasHeight) {
        // Save current SVG page and start a new one
        svgPages.push(serializer.serializeToString(currentSVG));
        currentSVG = document.createElementNS(xmlns, "svg");
        currentSVG.setAttribute("xmlns", xmlns);
        currentSVG.setAttribute("width", `${canvasWidth}${dimensionType}`);
        currentSVG.setAttribute("height", `${canvasHeight}${dimensionType}`);
        currentSVG.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
        xOffset = 0 + gapSize;
        yOffset = 0 + gapSize;
        rowHeight = 0;
      }
  
      // Update row height
      rowHeight = Math.max(rowHeight, height);
  
      // Apply translation
      const transform = `translate(${xOffset}, ${yOffset})`;
      const group = document.createElementNS(xmlns, "g");
      group.innerHTML = svgElement.innerHTML; // Keep inner content only
      group.setAttribute("transform", transform);
  
      currentSVG.appendChild(group);
  
      // Update xOffset
      xOffset += (width + gapSize);
    }
  
    // Push the last page if it has content
    if (currentSVG.childNodes.length > 0) {
      svgPages.push(serializer.serializeToString(currentSVG));
    }
  
    return svgPages;
  };

  const handleFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const svgPages = await combineAndOptimizeSVGs(files);
    const parsedPaths = parseSvgPaths(svgPages);
    const polygons = svgPathToPolygons(parsedPaths);
    const offsetPolygons = createOffsetPath(polygons, perimeterOffset); // Offset by 10 units
    const svgOffsetPath = polygonsToSvgPath(offsetPolygons);
    svgPages.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}"><path d="${svgOffsetPath}" fill="none" stroke="purple" /></svg>`);

    // get first file name to use as base for zip
    const lastFile = files[files.length - 1].name.replace(/\.[^/.]+$/, ""); // Remove file extension
    setFolderName(lastFile);

    // Create zip
    const zip = new JSZip();
    svgPages.forEach((svg, idx) => {
      zip.file(`${lastFile}-page-${idx + 1}.svg`, svg);
    });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipUrl = URL.createObjectURL(zipBlob);

    setCombinedSvgUrl(zipUrl);
    setCombinedSvgContent(svgPages || null); // Preview only the first page
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">SVG Compiler</h1>
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Canvas Width
            </label>
            <input
              type="number"
              value={canvasWidth}
              onChange={(e) => setCanvasWidth(Number(e.target.value))}
              className="block w-full text-sm text-gray-900 border border-gray-300  bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Canvas Height
            </label>
            <input
              type="number"
              value={canvasHeight}
              onChange={(e) => setCanvasHeight(Number(e.target.value))}
              className="block w-full text-sm text-gray-900 border border-gray-300  bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gap Size
            </label>
            <input
                type="number"
              value={gapSize}
              onChange={e => setGapSize(Number(e.target.value))}
              className="block w-full text-sm text-gray-900 border border-gray-300  bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              min={0}
            />
          </div>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Perimeter Offset
            </label>
            <input
                type="number"
              value={perimeterOffset}
              onChange={e => setPerimeterOffset(Number(e.target.value))}
              className="block w-full text-sm text-gray-900 border border-gray-300  bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dimension Type
            </label>
            <select
              value={dimensionType}
              onChange={(e) => setDimensionType(e.target.value)}
              className="block w-full text-sm text-gray-900 border border-gray-300  bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="mm">Millimeters</option>
              <option value="inches">Inches</option>
            </select>
          </div>
        </div>
        <input
          type="file"
          multiple
          accept=".svg"
          onChange={handleFilesUpload}
          className="block w-full max-w-md text-sm text-gray-900 border border-gray-300  cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {combinedSvgContent && (
          <>
            <div className="w-full mt-6 flex justify-center">
              <a
                href={combinedSvgUrl}
                download={`combined_${folderName}_svgs.zip`}
                className="px-4 py-2 text-white bg-blue-500  hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                Download Combined SVGs (ZIP)
              </a>
            </div>
            <div className="w-full mt-8">
              <h2 className="text-xl font-semibold mb-4"> {combinedSvgContent.map((page, index)=> {
                return (
                  <button
                    key={index}
                    onClick={() => setPreviewPage(index)}
                    className={`px-3 py-1 mr-2 mb-2 text-sm font-medium rounded ${previewPage === index ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    {index + 1}
                  </button>
                );
              })}</h2>
              <div className="border border-gray-300  p-4 bg-white shadow-lg w-full overflow-auto">
                <SVG
                  svgContent={combinedSvgContent[previewPage] || ""}
                  width={canvasWidth}
                  height={canvasHeight}
                  zoom={svgZoom}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SvgCombinerPage;
