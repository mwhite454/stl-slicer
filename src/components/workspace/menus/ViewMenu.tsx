"use client";

import React from 'react';
import { Button, Group, Menu, NumberInput, SegmentedControl, Switch } from '@mantine/core';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export function ViewMenu() {
  const zoom = useWorkspaceStore((s) => s.viewport.zoom);
  const pan = useWorkspaceStore((s) => s.viewport.pan);
  const units = useWorkspaceStore((s) => s.viewport.units);
  const ui = useWorkspaceStore((s) => s.ui);
  const setZoom = useWorkspaceStore((s) => s.setZoom);
  const setPan = useWorkspaceStore((s) => s.setPan);
  const setUnits = useWorkspaceStore((s) => s.setUnits);
  const setUi = useWorkspaceStore((s) => s.setUi);
  const bed = useWorkspaceStore((s) => s.ui.bedSizeMm);
  const setBedSize = useWorkspaceStore((s) => s.setBedSize);

  return (
    <Menu withinPortal closeOnItemClick={false}>
      <Menu.Target>
        <Button variant="light">View</Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Overlays</Menu.Label>
        <Menu.Item>
          <Group justify="space-between" gap="sm">
            <span>HUD</span>
            <Switch
              size="sm"
              checked={ui.showPerfHud}
              onChange={(e) => setUi({ showPerfHud: e.currentTarget.checked })}
            />
          </Group>
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>Units</Menu.Label>
        <Menu.Item>
          <SegmentedControl
            value={units}
            onChange={(v) => setUnits(v as 'mm' | 'in')}
            data={[
              { label: 'mm', value: 'mm' },
              { label: 'in', value: 'in' },
            ]}
            size="sm"
          />
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>Bed size (mm)</Menu.Label>
        <Menu.Item>
          <Group gap="sm">
            <NumberInput
              label="Width"
              size="sm"
              min={10}
              step={1}
              value={bed.width}
              onChange={(val) => {
                const n = typeof val === 'number' ? val : Number(val);
                if (!Number.isNaN(n)) setBedSize({ width: Math.max(1, n), height: bed.height });
              }}
              maw={140}
            />
            <NumberInput
              label="Height"
              size="sm"
              min={10}
              step={1}
              value={bed.height}
              onChange={(val) => {
                const n = typeof val === 'number' ? val : Number(val);
                if (!Number.isNaN(n)) setBedSize({ width: bed.width, height: Math.max(1, n) });
              }}
              maw={140}
            />
          </Group>
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>Zoom</Menu.Label>
        <Menu.Item>
          <NumberInput
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
            maw={160}
          />
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>Advanced</Menu.Label>
        <Menu.Item>
          <Group gap="sm">
            <NumberInput
              label="Pan X (mm)"
              size="sm"
              step={1}
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
              value={pan.y}
              onChange={(val) => {
                const n = typeof val === 'number' ? val : Number(val);
                if (!Number.isNaN(n)) setPan({ x: pan.x, y: n });
              }}
              maw={140}
            />
          </Group>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
