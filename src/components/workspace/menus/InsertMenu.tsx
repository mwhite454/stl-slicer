"use client";

import React from 'react';
import { Button, Group, Menu } from '@mantine/core';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export function InsertMenu() {
  const addManyRectangles = useWorkspaceStore((s) => s.addManyRectangles);

  return (
    <Menu withinPortal closeOnItemClick={false}>
      <Menu.Target>
        <Button variant="light">Insert</Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Advanced</Menu.Label>
        <Menu.Item
          onClick={() => addManyRectangles({ count: 2000, width: 5, height: 5, margin: 1 })}
        >
          Add 2000 (stress test)
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
