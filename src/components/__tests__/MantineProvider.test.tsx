import { render, screen } from '@testing-library/react';
import CustomMantineProvider from '../MantineProvider';

describe('MantineProvider wrapper', () => {
  it('renders children', () => {
    render(
      <CustomMantineProvider>
        <div>mantine child</div>
      </CustomMantineProvider>
    );

    expect(screen.getByText('mantine child')).toBeInTheDocument();
  });
});
