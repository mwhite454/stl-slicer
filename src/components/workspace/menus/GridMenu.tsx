"use client";

import React from 'react';
import { Button, Group, Menu, NumberInput, Switch } from '@mantine/core';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export function GridMenu() {
  const grid = useWorkspaceStore((s) => s.grid);
  const setGrid = useWorkspaceStore((s) => s.setGrid);

  return (
    <Menu withinPortal closeOnItemClick={false}>
      <Menu.Target>
        <Button variant="light">Grid</Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item>
          <Group justify="space-between" gap="sm">
            <span>Show grid</span>
            <Switch
              size="sm"
              checked={grid.show}
              onChange={(e) => setGrid({ show: e.currentTarget.checked })}
            />
          </Group>
        </Menu.Item>
        <Menu.Item>
          <Group justify="space-between" gap="sm">
            <span>Snap to grid</span>
            <Switch
              size="sm"
              checked={grid.snap}
              onChange={(e) => setGrid({ snap: e.currentTarget.checked })}
            />
          </Group>
        </Menu.Item>
        <Menu.Item>
          <NumberInput
            label="Grid size (mm)"
            size="sm"
            min={1}
            step={1}
            clampBehavior="strict"
            value={grid.size}
            onChange={(val) => {
              const n = typeof val === 'number' ? val : Number(val);
              if (!Number.isNaN(n) && n > 0) setGrid({ size: n });
            }}
            maw={180}
          />
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
