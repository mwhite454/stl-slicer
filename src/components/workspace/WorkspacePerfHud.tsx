"use client";

import React from 'react';
import { Box, Paper, Stack, Text } from '@mantine/core';
import { SliceLayerCard, type SliceLayerItem } from '@/components/SliceLayerCard';

export type WorkspacePerfHudProps = {
  fps: number;
  itemsCount: number;
  selectedCount: number;
  zoom: number;
  pan: { x: number; y: number };
  selectedItemJson?: string | null;
  selectedSliceLayer?: SliceLayerItem | null;
  debugClicks: Array<{
    screen: { x: number; y: number };
    world: { x: number; y: number };
    label: string;
  }>;
};

/**
 * Floating performance/status HUD for the workspace. Uses Mantine components to follow theme.
 */
export function WorkspacePerfHud({ fps, itemsCount, selectedCount, zoom, pan, selectedItemJson, selectedSliceLayer, debugClicks }: WorkspacePerfHudProps) {
  return (
    <Box style={{ position: 'absolute', top: 8, right: 8, pointerEvents: 'none' }}>
      <Paper shadow="md" radius="md" p="xs" style={{ background: 'rgba(0,0,0,0.6)' }}>
        <Stack gap={2} style={{ lineHeight: 1.2 }}>
          <Text c="white" size="xs">FPS: {fps}</Text>
          <Text c="white" size="xs">Items: {itemsCount}</Text>
          <Text c="white" size="xs">Sel: {selectedCount}</Text>
          <Text c="white" size="xs">Zoom: {zoom.toFixed(2)}</Text>
          <Text c="white" size="xs">Pan: {pan.x.toFixed(1)}, {pan.y.toFixed(1)}</Text>
        </Stack>
      </Paper>
      {(selectedSliceLayer || selectedItemJson) && (
        <Paper shadow="sm" radius="md" p="xs" mt={8} style={{ background: 'rgba(0,0,0,0.7)', pointerEvents: 'auto' }}>
          <Text c="white" size="xs" fw={600} mb={4}>Selected Item</Text>
          {selectedSliceLayer ? (
            <Box style={{ maxWidth: 460 }}>
              <SliceLayerCard item={selectedSliceLayer} compact />
            </Box>
          ) : (
            <Box
              component="pre"
              style={{
                margin: 0,
                maxWidth: 420,
                maxHeight: 280,
                overflow: 'auto',
                whiteSpace: 'pre',
              }}
            >
              <Text c="white" size="xs" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                {selectedItemJson}
              </Text>
            </Box>
          )}
        </Paper>
      )}
      {debugClicks.length > 0 && (
        <Paper shadow="sm" radius="md" p="xs" mt={8} style={{ background: 'rgba(0,0,0,0.7)', pointerEvents: 'auto' }}>
          <Text c="white" size="xs" fw={600} mb={4}>Debug Clicks</Text>
          <Stack gap={2}>
            {debugClicks.map((click, i) => (
              <Box key={i}>
                <Text c="white" size="xs">
                  {click.label}: Screen({click.screen.x.toFixed(0)}, {click.screen.y.toFixed(0)}) → World({click.world.x.toFixed(1)}, {click.world.y.toFixed(1)})
                </Text>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
