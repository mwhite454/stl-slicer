"use client";

import React from 'react';
import { Box, Paper, Stack, Text } from '@mantine/core';

export type WorkspacePerfHudProps = {
  fps: number;
  itemsCount: number;
  selectedCount: number;
  zoom: number;
  pan: { x: number; y: number };
  selectedItemJson?: string | null;
};

/**
 * Floating performance/status HUD for the workspace. Uses Mantine components to follow theme.
 */
export function WorkspacePerfHud({ fps, itemsCount, selectedCount, zoom, pan, selectedItemJson }: WorkspacePerfHudProps) {
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
      {selectedItemJson && (
        <Paper shadow="sm" radius="md" p="xs" mt={8} style={{ background: 'rgba(0,0,0,0.7)', pointerEvents: 'auto' }}>
          <Text c="white" size="xs" fw={600} mb={4}>Selected Item</Text>
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
        </Paper>
      )}
    </Box>
  );
}
