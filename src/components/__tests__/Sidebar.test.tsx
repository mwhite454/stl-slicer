import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { MantineProvider } from '@mantine/core';
import type { Axis } from '@/slicing/types';

describe('Sidebar', () => {
  const baseProps = {
    file: null as File | null,
    dimensions: { width: 10, height: 20, depth: 30 },
    axis: 'z' as Axis,
    layerThickness: 3,
    isSlicing: false,
    modelRotation: { x: 0, y: 0, z: 0 },
    setModelRotation: jest.fn(),
    onFileChange: jest.fn(),
    onAxisChange: jest.fn(),
    onLayerThicknessChange: jest.fn(),
    onExport: jest.fn(),
    onViewModeChange: jest.fn(),
    viewMode: '3d' as const,
  };

  it('renders core UI', () => {
    render(
      <MantineProvider>
        <Sidebar {...baseProps} />
      </MantineProvider>
    );
    expect(screen.getByText('STL Slicer')).toBeInTheDocument();
    expect(screen.getByText('Model Dimensions')).toBeInTheDocument();
    expect(screen.getByText('Export SVG Layers')).toBeInTheDocument();
    expect(screen.getByText('View Mode')).toBeInTheDocument();
  });

  it('calls onViewModeChange when toggling view', () => {
    render(
      <MantineProvider>
        <Sidebar {...baseProps} />
      </MantineProvider>
    );
    fireEvent.click(screen.getByText('2D View'));
    expect(baseProps.onViewModeChange).toHaveBeenCalledWith('2d');
  });
});
