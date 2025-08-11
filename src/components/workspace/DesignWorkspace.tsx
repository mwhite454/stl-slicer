"use client";

import React from 'react';
import { Card, Stack } from '@mantine/core';
import { WorkspaceToolbar } from './WorkspaceToolbar';
import { WorkspaceStage } from './WorkspaceStage';

export function DesignWorkspace({ visibleItemIds }: { visibleItemIds?: string[] }) {
  return (
    <Stack gap="sm">
      <WorkspaceToolbar />
      <Card withBorder padding="sm" radius="md">
        <WorkspaceStage visibleItemIds={visibleItemIds} />
      </Card>
    </Stack>
  );
}
