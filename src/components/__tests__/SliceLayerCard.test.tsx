import { render, screen } from '@testing-library/react';
import { SliceLayerCard } from '../SliceLayerCard';
import { MantineProvider } from '@mantine/core';
import type { WorkspaceItem } from '@/types/workspace';

function makeSliceItem(): Extract<WorkspaceItem, { type: 'sliceLayer' }> {
  return {
    id: '1',
    type: 'sliceLayer',
    position: { x: 0, y: 0 },
    zIndex: 0,
    layer: {
      makerJsModel: {} as any,
      layerIndex: 5,
      zCoordinate: 12.3456,
      axis: 'z',
      layerThickness: 3,
      plane: 'XY',
      axisMap: { u: 'x', v: 'y' },
      vUpSign: 1,
      uvExtents: { minU: 0, minV: 0, maxU: 10, maxV: 20 },
    },
  };
}

describe('SliceLayerCard', () => {
  it('renders badges and values', () => {
    const item = makeSliceItem();
    render(
      <MantineProvider>
        <SliceLayerCard item={item} title="My Layer" />
      </MantineProvider>
    );

    expect(screen.getByText('My Layer')).toBeInTheDocument();
    expect(screen.getByText(/axis: z/i)).toBeInTheDocument();
    expect(screen.getByText(/plane: XY/i)).toBeInTheDocument();
    expect(screen.getByText(/Z Coordinate/i)).toBeInTheDocument();
    expect(screen.getByText(/Layer Thickness/i)).toBeInTheDocument();
    expect(screen.getByText(/Axis Map/i)).toBeInTheDocument();
    expect(screen.getByText(/UV Extents/i)).toBeInTheDocument();
  });
});
