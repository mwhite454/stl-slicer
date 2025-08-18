import '@testing-library/jest-dom';

// Provide a fetch stub for tests if not present
if (!(globalThis as any).fetch) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({}) });
}

// Polyfill ResizeObserver used by some Mantine components (e.g., Slider)
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof (global as any).ResizeObserver === 'undefined') {
  (global as any).ResizeObserver = ResizeObserverPolyfill as any;
}
