"use client";

import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { ReactSVGPanZoom, Tool, Value } from "react-svg-pan-zoom";
import { parseSvgPaths, svgPathToPolygons, createOffsetPath, polygonsToSvgPath } from "./datahelpers";
import { Container, Title, Stack, Group, NumberInput, Select, FileInput, Button, Text } from "@mantine/core";

const SvgCombinerPage = () => {
  const [canvasWidth, setCanvasWidth] = useState<number>(482); // Default width
  const [canvasHeight, setCanvasHeight] = useState<number>(279); // Default height
  const [dimensionType, setDimensionType] = useState<string>("mm"); // Default dimension type
  const [gapSize, setGapSize] = useState<number>(1); // default gap between items
  const [combinedSvgUrl, setCombinedSvgUrl] = useState<string | null>(null);
  const [combinedSvgContent, setCombinedSvgContent] = useState<string[] | null>(null);
  const [perimeterOffset, setPerimeterOffset] = useState<number>(10); // Default perimeter offset
  const [folderName, setFolderName] = useState<string>("combined_svgs");
  const [previewPage, setPreviewPage] = useState<number>(0);
  const [tool, setTool] = useState<Tool>('auto');
  const [value, setValue] = useState<Value>({
    version: 2,
    mode: 'idle',
    focus: false,
    a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
    viewerWidth: 800,
    viewerHeight: 600,
    SVGWidth: 800,
    SVGHeight: 600,
    startX: null,
    startY: null,
    endX: null,
    endY: null,
    miniatureOpen: false
  });

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
    <Container size="lg" py="xl">
      <Title order={1} mb="xl" ta="center">SVG Compiler</Title>
      <Stack align="center">
        <Group>
          <NumberInput
            label="Canvas Width"
            value={canvasWidth}
            onChange={(value) => setCanvasWidth(typeof value === 'number' ? value : 0)}
            min={1}
          />
          <NumberInput
            label="Canvas Height"
            value={canvasHeight}
            onChange={(value) => setCanvasHeight(typeof value === 'number' ? value : 0)}
            min={1}
          />
          <NumberInput
            label="Gap Size"
            value={gapSize}
            onChange={(value) => setGapSize(typeof value === 'number' ? value : 0)}
            min={0}
          />
          <NumberInput
            label="Perimeter Offset"
            value={perimeterOffset}
            onChange={(value) => setPerimeterOffset(typeof value === 'number' ? value : 0)}
            min={0}
          />
          <Select
            label="Dimension Type"
            data={[
              { value: 'mm', label: 'Millimeters' },
              { value: 'inches', label: 'Inches' }
            ]}
            value={dimensionType}
            onChange={(value) => setDimensionType(value as string || 'mm')}
          />
        </Group>
        <FileInput
          label="Upload SVG files"
          multiple
          accept=".svg"
          placeholder="Select SVG files"
          onChange={(files) => {
            // Create a synthetic event to match the existing handler
            const event = {
              target: {
                files: files || []
              }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFilesUpload(event);
          }}
        />
        {combinedSvgContent && (
          <>
            <Button
              component="a"
              href={combinedSvgUrl}
              download={`combined_${folderName}_svgs.zip`} 
              mt="md"
            >
              Download Combined SVGs (ZIP)
            </Button>
            <Stack w="100%" mt="xl">
              <Text size="lg" fw={500} mb="sm">Preview Pages:</Text>
              <Group mb="md">
                {combinedSvgContent && combinedSvgContent.length > 0 && combinedSvgContent.map((page, index) => (
                  <Button
                    key={index}
                    onClick={() => setPreviewPage(index)}
                    variant={previewPage === index ? "filled" : "outline"}
                    size="sm"
                  >
                    {index + 1}
                  </Button>
                ))}
              </Group>
              <div style={{ height: '600px' }}>
                <ReactSVGPanZoom
                  width={800}
                  height={600}
                  tool={tool}
                  value={value}
                  onChangeTool={setTool}
                  onChangeValue={setValue}
                  detectAutoPan={false}
                  detectPinchGesture={true}
                  miniatureProps={{ position: 'right', background: '#f8f9fa', width: 100, height: 80 }}
                >
                  <svg
                    width={canvasWidth}
                    height={canvasHeight}
                    viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                    dangerouslySetInnerHTML={{ 
                      __html: (() => {
                        if (!combinedSvgContent || combinedSvgContent.length === 0) return "";
                        const svgContent = combinedSvgContent[previewPage] || "";
                        // Extract inner content from serialized SVG
                        const match = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
                        return match ? match[1] : "";
                      })()
                    }}
                  />
                </ReactSVGPanZoom>
              </div>
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
};

export default SvgCombinerPage;

