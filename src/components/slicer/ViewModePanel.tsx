"use client";

import { Box, Group, Button, Text, Stack, Loader } from "@mantine/core";
import dynamic from "next/dynamic";
import React from "react";
import type { Axis, LayerData } from "../../utils/StlSlicer";

const StlViewer3D = dynamic(() => import("../StlViewer3D").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <Box w="100%" h={400} style={{ border: "1px solid #e9ecef", borderRadius: "8px", backgroundColor: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Stack align="center" gap="sm">
        <Loader size="md" />
        <Text size="sm">Loading 3D Viewer...</Text>
      </Stack>
    </Box>
  ),
});

export interface ViewModePanelProps {
  file: File | null;
  viewMode: "2d" | "3d";
  layers: LayerData[];
  axis: Axis;
  layerThickness: number;
  previewLayerIndex: number;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToView: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function ViewModePanel({
  file,
  viewMode,
  layers,
  axis,
  layerThickness,
  previewLayerIndex,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToView,
  canvasRef,
}: ViewModePanelProps) {
  return (
    <Box style={{ flex: 1, overflow: "hidden" }}>
      {file && (
        <>
          {viewMode === "3d" ? (
            <Box
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                zIndex: 10,
                minHeight: "400px",
                pointerEvents: "auto",
              }}
            >
              <StlViewer3D
                stlFile={file}
                layers={layers}
                axis={axis}
                layerThickness={layerThickness}
                activeLayerIndex={previewLayerIndex}
              />

              <Box
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  right: "0.5rem",
                  padding: "0.5rem",
                  backgroundColor: "#e7f5ff",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                  border: "1px solid #74c0fc",
                  maxWidth: "250px",
                  opacity: 0.85,
                  zIndex: 20,
                }}
              >
                <Text size="xs" fw={500}>
                  3D Controls:
                </Text>
                <Box component="ul" style={{ listStyleType: "disc", paddingLeft: "1rem", marginTop: "0.25rem" }}>
                  <li>Drag to rotate</li>
                  <li>Scroll to zoom</li>
                  <li>Shift+drag to pan</li>
                </Box>
              </Box>
            </Box>
          ) : (
            layers.length > 0 && (
              <Box style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
                <Group justify="space-between" align="center" mb="sm">
                  <Text fw={500}>2D Layer Preview: {previewLayerIndex + 1} / {layers.length}</Text>
                  <Group gap="xs">
                    <Button onClick={onZoomOut} variant="outline" size="sm" title="Zoom Out">
                      −
                    </Button>
                    <Button onClick={onZoomReset} variant="outline" size="sm" title="Reset Zoom">
                      Reset
                    </Button>
                    <Button onClick={onFitToView} variant="outline" size="sm" title="Fit to View">
                      Fit
                    </Button>
                    <Button onClick={onZoomIn} variant="outline" size="sm" title="Zoom In">
                      +
                    </Button>
                    <Text size="xs" c="dimmed" ml="sm">
                      {Math.round(zoomLevel * 100)}%
                    </Text>
                  </Group>
                </Group>
                <Box style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: "400px", width: "100%", height: "100%" }}>
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "1px solid #dee2e6",
                      borderRadius: "0.375rem",
                      backgroundColor: "white",
                      display: "block",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  />
                </Box>
              </Box>
            )
          )}
        </>
      )}
    </Box>
  );
}
