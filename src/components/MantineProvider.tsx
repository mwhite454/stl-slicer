'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';

// Custom theme configuration
const theme = createTheme({
  /** Your theme override here */
  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  fontFamilyMonospace: 'var(--font-geist-mono), Monaco, Courier, monospace',
  primaryColor: 'violet',
  defaultRadius: 'md',
});

export default function CustomMantineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MantineProvider theme={theme}>
      <Notifications />
      <ModalsProvider>
        {children}
      </ModalsProvider>
    </MantineProvider>
  );
}
