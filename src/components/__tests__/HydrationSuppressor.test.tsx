import { render, screen } from '@testing-library/react';
import HydrationSuppressor from '../HydrationSuppressor';

describe('HydrationSuppressor', () => {
  it('renders children', () => {
    render(
      <HydrationSuppressor>
        <div>content</div>
      </HydrationSuppressor>
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
