import { render } from '@testing-library/react';
import ClientLayout from '../ClientLayout';

// Note: HydrationSuppressor is dynamically imported with ssr:false inside ClientLayout,
// but for a smoke test we only verify that children render.

describe('ClientLayout', () => {
  it('renders with Mantine providers (portal present)', () => {
    render(
      <ClientLayout>
        <div>child content</div>
      </ClientLayout>
    );

    // Mantine Notifications renders shared portal node
    const portal = document.querySelector('[data-mantine-shared-portal-node="true"]');
    expect(portal).not.toBeNull();
  });
});
