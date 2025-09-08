"use client";

import React from 'react';
import { Box, Paper, Stack, Text, Switch } from '@mantine/core';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { SliceLayerCard, type SliceLayerItem } from '@/components/SliceLayerCard';
import JsonView from 'react18-json-view';

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
    viewport: { zoom: number; pan: { x: number; y: number } };
    sliceMeta?: {
      plane?: 'XY' | 'YZ' | 'XZ';
      axisMap?: { u: 'x' | 'y' | 'z'; v: 'x' | 'y' | 'z' };
      vUpSign?: 1 | -1;
      uvExtents?: { minU: number; minV: number; maxU: number; maxV: number };
      slicedAxis?: 'x' | 'y' | 'z';
    };
  }>;
};

/**
 * Floating performance/status HUD for the workspace. Uses Mantine components to follow theme.
 */
export function WorkspacePerfHud({ fps, itemsCount, selectedCount, zoom, pan, selectedItemJson, selectedSliceLayer, debugClicks }: WorkspacePerfHudProps) {
  const disablePlaneMapping = useWorkspaceStore((s) => s.ui.disablePlaneMapping);
  const setUi = useWorkspaceStore((s) => s.setUi);
  return (
    <Box style={{ width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
      <Paper shadow="md" radius="md" p="xs" style={{ background: 'rgba(0,0,0,0.6)' }}>
        <Stack gap={2} style={{ lineHeight: 1.2 }}>
          <Text c="white" size="xs">FPS: {fps}</Text>
          <Text c="white" size="xs">Items: {itemsCount}</Text>
          <Text c="white" size="xs">Sel: {selectedCount}</Text>
          <Text c="white" size="xs">Zoom: {zoom.toFixed(2)}</Text>
          <Text c="white" size="xs">Pan: {pan.x.toFixed(1)}, {pan.y.toFixed(1)}</Text>
          <Switch
            size="xs"
            color="cyan"
            styles={{ label: { color: 'white' } }}
            label="Disable Plane Mapping"
            checked={disablePlaneMapping}
            onChange={(e) => setUi({ disablePlaneMapping: e.currentTarget.checked })}
          />
        </Stack>
      </Paper>
      {(selectedSliceLayer || selectedItemJson) && (
        <Paper shadow="sm" radius="md" p="xs" mt={8} style={{ background: 'rgba(0,0,0,0.7)' }}>
          <Text c="white" size="xs" fw={600} mb={4}>Selected Item</Text>

          <Box style={{ maxWidth: 460, maxHeight: 320, overflow: 'scroll' }}>
            <JsonView
              src={selectedSliceLayer ?? safeParse(selectedItemJson)}
              theme="ashes"
              collapsed={1}
              enableClipboard={false}
              displaySize={false}
              displayArrayIndex
            />
          </Box>
          {selectedSliceLayer && (
            <Box style={{ maxWidth: 460 }}>
              <SliceLayerCard item={selectedSliceLayer} compact />
            </Box>
          )}
        </Paper>
      )}
      {debugClicks.length > 0 && (
        <Paper shadow="sm" radius="md" p="xs" mt={8} style={{ background: 'rgba(0,0,0,0.7)' }}>
          <Text c="white" size="xs" fw={600} mb={4}>Debug Clicks</Text>
          <Stack gap={2}>
            {debugClicks.map((click, i) => (
              <Box key={i}>
                <Text c="white" size="xs">
                  {click.label}: Screen({click.screen.x.toFixed(0)}, {click.screen.y.toFixed(0)}) → World({click.world.x.toFixed(1)}, {click.world.y.toFixed(1)})
                </Text>
                <Text c="white" size="xs">
                  Viewport: zoom {click.viewport.zoom.toFixed(2)}, pan({click.viewport.pan.x.toFixed(1)}, {click.viewport.pan.y.toFixed(1)})
                </Text>
                {click.sliceMeta && (
                  <Box ml={8}>
                    <Text c="white" size="xs">Plane: {click.sliceMeta.plane ?? 'n/a'} | SlicedAxis: {click.sliceMeta.slicedAxis ?? 'n/a'}</Text>
                    {click.sliceMeta.axisMap && (
                      <Text c="white" size="xs">AxisMap: u→{click.sliceMeta.axisMap.u}, v→{click.sliceMeta.axisMap.v}</Text>
                    )}
                    {typeof click.sliceMeta.vUpSign !== 'undefined' && (
                      <Text c="white" size="xs">vUpSign: {click.sliceMeta.vUpSign}</Text>
                    )}
                    {click.sliceMeta.uvExtents && (
                      <Text c="white" size="xs">
                        uvExtents: [
                        {click.sliceMeta.uvExtents.minU.toFixed(2)},
                        {click.sliceMeta.uvExtents.minV.toFixed(2)}] → [
                        {click.sliceMeta.uvExtents.maxU.toFixed(2)},
                        {click.sliceMeta.uvExtents.maxV.toFixed(2)}]
                      </Text>
                    )}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

function safeParse(input?: string | null) {
  if (!input) return {} as Record<string, unknown>;
  try {
    return JSON.parse(input) as unknown;
  } catch (err) {
    return { raw: input } as Record<string, unknown>;
  }
}
