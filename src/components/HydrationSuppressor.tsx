'use client';

import { useEffect } from 'react';

export default function HydrationSuppressor({
  children
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Suppress specific console warnings about hydration mismatches
    // that are caused by browser extensions
    const originalError = console.error;
    console.error = (...args) => {
      // Filter out hydration warnings related to browser extensions
      if (typeof args[0] === 'string' && 
          (args[0].includes('Hydration failed because') || 
           args[0].includes('Warning: Prop') && args[0].includes('did not match')) && 
          (args[0].includes('cz-shortcut-listen') || 
           args[0].includes('data-') || 
           args[0].includes('extension'))) {
        return;
      }
      originalError.apply(console, args);
    };
    
    return () => {
      // Restore original console.error when component unmounts
      console.error = originalError;
    };
  }, []);
  
  // We'll render children immediately, but the useEffect will
  // handle suppressing the hydration warnings
  return <>{children}</>;
} 