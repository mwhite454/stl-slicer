"use client";

import React from 'react';
import { Button, Menu, NumberInput } from '@mantine/core';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export function InteractionMenu() {
  const ui = useWorkspaceStore((s) => s.ui);
  const setUi = useWorkspaceStore((s) => s.setUi);

  return (
    <Menu withinPortal>
      <Menu.Target>
        <Button variant="light">Interaction</Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Advanced</Menu.Label>
        <Menu.Item>
          <NumberInput
            label="Pan speed"
            size="sm"
            min={0.1}
            max={5}
            step={0.1}
            clampBehavior="strict"
            value={ui.panSpeedMultiplier}
            onChange={(val) => {
              const n = typeof val === 'number' ? val : Number(val);
              if (!Number.isNaN(n)) setUi({ panSpeedMultiplier: Math.min(5, Math.max(0.1, n)) });
            }}
            maw={200}
          />
        </Menu.Item>
        <Menu.Item>
          <NumberInput
            label="Zoom speed"
            size="sm"
            min={0.1}
            max={5}
            step={0.1}
            clampBehavior="strict"
            value={ui.zoomSpeedMultiplier}
            onChange={(val) => {
              const n = typeof val === 'number' ? val : Number(val);
              if (!Number.isNaN(n)) setUi({ zoomSpeedMultiplier: Math.min(5, Math.max(0.1, n)) });
            }}
            maw={200}
          />
        </Menu.Item>
        <Menu.Item>
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
            maw={220}
          />
        </Menu.Item>
        <Menu.Item>
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
            maw={220}
          />
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
