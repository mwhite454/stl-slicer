"use client";

import React from 'react';
import { Button, Group } from '@mantine/core';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { InsertMenu } from '@/components/workspace/menus/InsertMenu';
import { ViewMenu } from '@/components/workspace/menus/ViewMenu';
import { GridMenu } from '@/components/workspace/menus/GridMenu';
import { EditMenu } from '@/components/workspace/menus/EditMenu';
import { InteractionMenu } from '@/components/workspace/menus/InteractionMenu';
import makerjs from 'makerjs';

export function WorkspaceToolbar() {
  // Visible quick actions
  const setZoom = useWorkspaceStore((s) => s.setZoom);
  const setPan = useWorkspaceStore((s) => s.setPan);
  const addSliceLayer = useWorkspaceStore((s) => s.addSliceLayer);
  const ui = useWorkspaceStore((s) => s.ui);
  const setUi = useWorkspaceStore((s) => s.setUi);

  return (
    <Group wrap="nowrap" gap="sm" justify="space-between">
      <Group gap="xs">
        <Button
          variant="light"
          onClick={() => {
            const width = 20;
            const height = 10;
            // maker.js rectangle model in maker space (Y-up)
            const rectModel = new makerjs.models.Rectangle(width, height) as any;
            addSliceLayer({
              makerJsModel: rectModel,
              layerIndex: 0,
              zCoordinate: 0,
              axis: 'z',
              layerThickness: 1,
              plane: 'XY',
              axisMap: { u: 'x', v: 'y' },
              vUpSign: 1,
              uvExtents: { minU: 0, minV: 0, maxU: width, maxV: height },
              x: 20,
              y: 10,
              z: 0,
            });
          }}
        >
          Add 20x10
        </Button>

        <Button
          variant="light"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          Reset view
        </Button>

        <Button
          variant="light"
          onClick={() => setUi({ fitToBoundsRequestId: (ui.fitToBoundsRequestId ?? 0) + 1 })}
        >
          Fit to items
        </Button>

        {/* Menus */}
        <InsertMenu />
        <EditMenu />
        <ViewMenu />
        <GridMenu />
        <InteractionMenu />
      </Group>
      {/* Right side group removed in favor of menus above */}
    </Group>
  );
}
