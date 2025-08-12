"use client";

import { Box, Group, Text, Stack, Loader } from "@mantine/core";
import dynamic from "next/dynamic";
import React from "react";
import type { Axis, LayerData } from '@/slicing/types';
import { DesignWorkspace } from "../workspace/DesignWorkspace";
import { useWorkspaceStore } from "@/stores/workspaceStore";

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
}

export function ViewModePanel({
  file,
  viewMode,
  layers,
  axis,
  layerThickness,
  previewLayerIndex,
}: ViewModePanelProps) {
  // Workspace selection + fit handling when in 2D mode
  const selectOnly = useWorkspaceStore((s) => s.selectOnly);
  const items = useWorkspaceStore((s) => s.items);
  const ui = useWorkspaceStore((s) => s.ui);
  const setUi = useWorkspaceStore((s) => s.setUi);

  // When switching to 2D, fit items once
  const prevViewRef = React.useRef(viewMode);
  React.useEffect(() => {
    if (prevViewRef.current !== viewMode && viewMode === "2d") {
      setUi({ fitToBoundsRequestId: (ui.fitToBoundsRequestId ?? 0) + 1 });
    }
    prevViewRef.current = viewMode;
  }, [viewMode, setUi, ui.fitToBoundsRequestId]);

  // Keep selection in sync with preview layer when in 2D
  React.useEffect(() => {
    if (viewMode !== "2d") return;
    const match = items.find(
      (it) => it.type === "sliceLayer" && it.layer.layerIndex === previewLayerIndex
    );
    if (match) selectOnly(match.id);
  }, [viewMode, items, previewLayerIndex, selectOnly]);

  // Only render the active preview layer in 2D view
  const visibleItemIds = React.useMemo(() => {
    if (viewMode !== "2d") return [] as string[];
    const match = items.find((it) => it.type === "sliceLayer" && it.layer.layerIndex === previewLayerIndex);
    return match ? [match.id] : [];
  }, [viewMode, items, previewLayerIndex]);
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
                </Group>
                <Box style={{ flex: 1, minHeight: "400px", width: "100%", height: "100%" }}>
                  <DesignWorkspace visibleItemIds={visibleItemIds} />
                </Box>
              </Box>
            )
          )}
        </>
      )}
    </Box>
  );
}
