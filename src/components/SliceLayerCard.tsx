import React from 'react';
import { Card, Group, Stack, Text, Badge, Divider } from '@mantine/core';
import type { WorkspaceItem, SliceLayerParams } from '@/types/workspace';

export type SliceLayerItem = Extract<WorkspaceItem, { type: 'sliceLayer' }>;

type Props = {
  item: SliceLayerItem;
  title?: string;
  compact?: boolean;
};

const formatNumber = (n: number | undefined, digits = 3) =>
  typeof n === 'number' && Number.isFinite(n) ? n.toFixed(digits) : '—';

const AxisBadge: React.FC<{ axis: SliceLayerParams['axis'] }> = ({ axis }) => (
  <Badge color="blue" variant="light" radius="sm" size="sm" title="Slice axis">
    axis: {axis}
  </Badge>
);

const PlaneBadge: React.FC<{ plane?: SliceLayerParams['plane'] }> = ({ plane }) => (
  <Badge color="grape" variant="light" radius="sm" size="sm" title="Slice plane">
    plane: {plane ?? '—'}
  </Badge>
);

export const SliceLayerCard: React.FC<Props> = ({ item, title, compact = false }) => {
  const {
    layer: { layerIndex, zCoordinate, axis, layerThickness, plane, axisMap, vUpSign, uvExtents },
  } = item;

  const hasExtents = Boolean(uvExtents);
  const width = hasExtents ? uvExtents!.maxU - uvExtents!.minU : undefined;
  const height = hasExtents ? uvExtents!.maxV - uvExtents!.minV : undefined;

  return (
    <Card withBorder radius="md" shadow={compact ? undefined : 'sm'} padding={compact ? 'sm' : 'md'}>
      <Stack gap={compact ? 6 : 'sm'}>
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600} size={compact ? 'sm' : 'md'}>
            {title ?? `Slice Layer #${layerIndex}`}
          </Text>
          <Group gap={6} wrap="nowrap">
            <AxisBadge axis={axis} />
            <PlaneBadge plane={plane} />
          </Group>
        </Group>

        <Divider />

        <Group grow align="start">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Z Coordinate
            </Text>
            <Text size="sm">{formatNumber(zCoordinate)} mm</Text>
          </Stack>

          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Layer Thickness
            </Text>
            <Text size="sm">{formatNumber(layerThickness)} mm</Text>
          </Stack>
        </Group>

        <Group grow align="start">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Axis Map
            </Text>
            <Text size="sm">
              u → {axisMap?.u ?? '—'}, v → {axisMap?.v ?? '—'} (vUpSign: {vUpSign ?? '—'})
            </Text>
          </Stack>

          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              UV Extents
            </Text>
            <Text size="sm">
              {hasExtents
                ? `u:[${formatNumber(uvExtents!.minU)}, ${formatNumber(uvExtents!.maxU)}], v:[${formatNumber(
                    uvExtents!.minV,
                  )}, ${formatNumber(uvExtents!.maxV)}]`
                : '—'}
            </Text>
          </Stack>
        </Group>

        {hasExtents && (
          <Group grow align="start">
            <Stack gap={4}>
              <Text size="sm" c="dimmed">
                Size (projected)
              </Text>
              <Text size="sm">{`${formatNumber(width)} × ${formatNumber(height)} mm`}</Text>
            </Stack>
          </Group>
        )}
      </Stack>
    </Card>
  );
};
