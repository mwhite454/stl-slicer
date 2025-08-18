import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import StlViewer3D from '../StlViewer3D';

// Basic smoke test with no file and empty layers

describe('StlViewer3D', () => {
  it('renders controls without crashing', () => {
    render(
      <MantineProvider>
        <StlViewer3D
          stlFile={null}
          layers={[]}
          axis="z"
          layerThickness={3}
          activeLayerIndex={0}
        />
      </MantineProvider>
    );

    // Control buttons should be present
    expect(screen.getByRole('button', { name: /hide grid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide slices/i })).toBeInTheDocument();
  });
});
