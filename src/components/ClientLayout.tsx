'use client';

import dynamic from 'next/dynamic';

// Import HydrationSuppressor with dynamic import within this client component
const HydrationSuppressor = dynamic(() => import('./HydrationSuppressor'), {
  ssr: false
});

export default function ClientLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <HydrationSuppressor>
      {children}
    </HydrationSuppressor>
  );
} 