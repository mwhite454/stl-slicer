"use client";

import { Box, Button, Group, Slider, Text } from "@mantine/core";
import React from "react";
import type { LayerData } from "../../utils/StlSlicer";

export interface LayerNavigatorProps {
  layers: LayerData[];
  previewLayerIndex: number;
  onChange: (index: number) => void;
}

export function LayerNavigator({ layers, previewLayerIndex, onChange }: LayerNavigatorProps) {
  if (layers.length === 0) return null;

  return (
    <Box mt="md" pt="md" style={{ borderTop: "1px solid #dee2e6" }}>
      <Text fw={500} mb="sm">
        Navigate Layers: {previewLayerIndex + 1} / {layers.length}
      </Text>
      <Group gap="md" align="center" mb="md">
        <Button onClick={() => onChange(Math.max(0, previewLayerIndex - 1))} disabled={previewLayerIndex === 0} variant="outline" size="sm">
          Previous
        </Button>

        <Slider min={0} max={layers.length - 1} value={previewLayerIndex} onChange={onChange} style={{ flex: 1 }} />

        <Button
          onClick={() => onChange(Math.min(layers.length - 1, previewLayerIndex + 1))}
          disabled={previewLayerIndex === layers.length - 1}
          variant="outline"
          size="sm"
        >
          Next
        </Button>
      </Group>
    </Box>
  );
}
