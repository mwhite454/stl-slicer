'use client';

import dynamic from 'next/dynamic';

// Dynamically import the STL Slicer component
const StlSlicerClient = dynamic(() => import('../components/StlSlicer'), {
  loading: () => <div className="p-8 text-center">Loading STL Slicer...</div>
});

export default function Home() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <StlSlicerClient />
    </div>
  );
}
