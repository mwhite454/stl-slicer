"use client";

import React from 'react';
import { Button, Menu } from '@mantine/core';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export function EditMenu() {
  const clearItems = useWorkspaceStore((s) => s.clearItems);

  return (
    <Menu withinPortal closeOnItemClick={false}>
      <Menu.Target>
        <Button variant="light" color="gray">Edit</Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item color="red" onClick={() => clearItems()}>Clear items</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
