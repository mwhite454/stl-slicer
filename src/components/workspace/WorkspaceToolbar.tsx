"use client";

import React from 'react';
import { Button, Group, SegmentedControl, Switch, NumberInput, Tooltip } from '@mantine/core';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export function WorkspaceToolbar() {
  const units = useWorkspaceStore((s) => s.viewport.units);
  const grid = useWorkspaceStore((s) => s.grid);
  const zoom = useWorkspaceStore((s) => s.viewport.zoom);
  const pan = useWorkspaceStore((s) => s.viewport.pan);
  const setUnits = useWorkspaceStore((s) => s.setUnits);
  const setGrid = useWorkspaceStore((s) => s.setGrid);
  const setZoom = useWorkspaceStore((s) => s.setZoom);
  const setPan = useWorkspaceStore((s) => s.setPan);
  const addRectangle = useWorkspaceStore((s) => s.addRectangle);
  const addManyRectangles = useWorkspaceStore((s) => s.addManyRectangles);
  const clearItems = useWorkspaceStore((s) => s.clearItems);
  const ui = useWorkspaceStore((s) => s.ui);
  const setUi = useWorkspaceStore((s) => s.setUi);

  return (
    <Group wrap="nowrap" gap="sm" justify="space-between">
      <Group gap="xs">
        <Button
          variant="filled"
          onClick={() => addRectangle({ width: 20, height: 10, x: 0, y: 0 })}
        >
          Add rectangle
        </Button>
        <Button
          variant="light"
          onClick={() => addManyRectangles({ count: 2000, width: 5, height: 5, margin: 1 })}
        >
          Add 2000 (stress test)
        </Button>
        <Button variant="subtle" color="red" onClick={() => clearItems()}>
          Clear
        </Button>
      </Group>

      <Group gap="md">
        <Tooltip label="Display units (internal math stays in mm)">
          <SegmentedControl
            value={units}
            onChange={(v) => setUnits(v as 'mm' | 'in')}
            data={[
              { label: 'mm', value: 'mm' },
              { label: 'in', value: 'in' },
            ]}
            size="sm"
          />
        </Tooltip>

        <Tooltip label="Grid visibility">
          <Switch
            size="sm"
            label="Grid"
            checked={grid.show}
            onChange={(e) => setGrid({ show: e.currentTarget.checked })}
          />
        </Tooltip>

        <Tooltip label="Snap to grid (dragging in v2)">
          <Switch
            size="sm"
            label="Snap"
            checked={grid.snap}
            onChange={(e) => setGrid({ snap: e.currentTarget.checked })}
          />
        </Tooltip>

        <NumberInput
          label="Grid (mm)"
          size="sm"
          min={1}
          step={1}
          clampBehavior="strict"
          value={grid.size}
          onChange={(val) => {
            const n = typeof val === 'number' ? val : Number(val);
            if (!Number.isNaN(n) && n > 0) setGrid({ size: n });
          }}
          maw={120}
        />

        <NumberInput
          label="Zoom"
          size="sm"
          min={0.25}
          max={4}
          step={0.25}
          clampBehavior="strict"
          value={zoom}
          onChange={(val) => {
            const n = typeof val === 'number' ? val : Number(val);
            if (!Number.isNaN(n)) setZoom(Math.min(4, Math.max(0.25, n)));
          }}
          maw={120}
        />

        <NumberInput
          label="Drag threshold (px)"
          size="sm"
          min={0}
          max={10}
          step={1}
          clampBehavior="strict"
          value={ui.dragActivationDistance}
          onChange={(val) => {
            const n = typeof val === 'number' ? val : Number(val);
            if (!Number.isNaN(n)) setUi({ dragActivationDistance: Math.max(0, Math.min(10, n)) });
          }}
          maw={160}
        />

        <NumberInput
          label="Select offset (px)"
          size="sm"
          min={0}
          max={8}
          step={1}
          clampBehavior="strict"
          value={ui.selectionOverlayOffsetPx}
          onChange={(val) => {
            const n = typeof val === 'number' ? val : Number(val);
            if (!Number.isNaN(n)) setUi({ selectionOverlayOffsetPx: Math.max(0, Math.min(8, n)) });
          }}
          maw={160}
        />

        <NumberInput
          label="Pan X (mm)"
          size="sm"
          step={1}
          clampBehavior="blur"
          value={pan.x}
          onChange={(val) => {
            const n = typeof val === 'number' ? val : Number(val);
            if (!Number.isNaN(n)) setPan({ x: n, y: pan.y });
          }}
          maw={140}
        />

        <NumberInput
          label="Pan Y (mm)"
          size="sm"
          step={1}
          clampBehavior="blur"
          value={pan.y}
          onChange={(val) => {
            const n = typeof val === 'number' ? val : Number(val);
            if (!Number.isNaN(n)) setPan({ x: pan.x, y: n });
          }}
          maw={140}
        />
      </Group>
    </Group>
  );
}
