import { render, screen, waitFor } from '@testing-library/react';
import ClientOnly from '../ClientOnly';

describe('ClientOnly', () => {
  it('renders children after mount', async () => {
    render(
      <ClientOnly>
        <div>hello client</div>
      </ClientOnly>
    );

    await waitFor(() => expect(screen.getByText('hello client')).toBeInTheDocument());
  });
});
