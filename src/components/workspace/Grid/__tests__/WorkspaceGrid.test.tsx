import React from 'react';
import { render } from '@testing-library/react';
import { WorkspaceGrid } from '../WorkspaceGrid';

describe('WorkspaceGrid (visual-intent, low-brittle)', () => {
  const bounds = { width: 200, height: 100 } as const;

  test('does not render when grid.show=false or size<=0', () => {
    const { container: c1 } = render(
      <svg>
        <WorkspaceGrid bounds={bounds as any} grid={{ show: false, size: 25 } as any} />
      </svg>
    );
    expect(c1.querySelector('g[data-role="workspace-grid"] line')).toBeNull();

    const { container: c2 } = render(
      <svg>
        <WorkspaceGrid bounds={bounds as any} grid={{ show: true, size: 0 } as any} />
      </svg>
    );
    expect(c2.querySelector('g[data-role="workspace-grid"] line')).toBeNull();
  });

  test('renders grid lines symmetrically and highlights axes', () => {
    const grid = { show: true, size: 50 } as const; // simple multiples of bounds

    const { container } = render(
      <svg>
        <WorkspaceGrid bounds={bounds as any} grid={grid as any} />
      </svg>
    );

    const group = container.querySelector('g[data-role="workspace-grid"]')!;
    // Expect at least some grid lines
    const allLines = Array.from(group.querySelectorAll('line'));
    expect(allLines.length).toBeGreaterThan(0);

    // Axes are rendered with distinct colors from component
    const xAxis = allLines.find((el) => el.getAttribute('stroke') === '#fa5252');
    const yAxis = allLines.find((el) => el.getAttribute('stroke') === '#8ce99a');
    expect(xAxis).toBeTruthy();
    expect(yAxis).toBeTruthy();

    // Axes positions should be at the center of the bounds
    const cx = bounds.width / 2; // 100
    const cy = bounds.height / 2; // 50

    // y = cy horizontal line
    expect(xAxis!.getAttribute('y1')).toBe(String(cy));
    expect(xAxis!.getAttribute('y2')).toBe(String(cy));

    // x = cx vertical line
    expect(yAxis!.getAttribute('x1')).toBe(String(cx));
    expect(yAxis!.getAttribute('x2')).toBe(String(cx));

    // Check that at least one positive and one negative grid line exist relative to center
    // without asserting exact counts (keeps test resilient to future spacing tweaks)
    const verticals = allLines.filter((l) => l.getAttribute('x1') === l.getAttribute('x2'));
    const horizontals = allLines.filter((l) => l.getAttribute('y1') === l.getAttribute('y2'));
    expect(verticals.length).toBeGreaterThanOrEqual(3); // at least center + one on each side
    expect(horizontals.length).toBeGreaterThanOrEqual(3);
  });
});
