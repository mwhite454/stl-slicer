import { jest } from '@jest/globals';

// Mock svg-parser.parse
jest.unstable_mockModule('svg-parser', () => ({
  parse: jest.fn(() => ({ type: 'root', children: [] })),
}));

// Helper to load store fresh per test
const loadStore = async () => {
  jest.resetModules();
  // re-apply mock after resetModules
  jest.unstable_mockModule('svg-parser', () => ({
    parse: jest.fn(() => ({ type: 'root', children: [] })),
  }));
  const mod = await import('@/stores/svgStore');
  return mod;
};

describe('svgStore', () => {
  let originalFileReader: typeof FileReader;

  beforeEach(() => {
    localStorage.clear();

    // Mock FileReader to immediately call onload with SVG content
    originalFileReader = (global as any).FileReader;
    class MockFileReader {
      public onload: ((ev: any) => any) | null = null;
      readAsText(_file: File) {
        const event = { target: { result: '<svg></svg>' } } as any;
        // call async tick to simulate real behavior
        setTimeout(() => {
          if (this.onload) {
            (this.onload as any)(event as any);
          }
        }, 0);
      }
    }
    (global as any).FileReader = MockFileReader as any;
  });

  afterEach(() => {
    (global as any).FileReader = originalFileReader as any;
  });

  test('defaults', async () => {
    const { useSVGStore } = await loadStore();
    const s = useSVGStore.getState();
    expect(s.getAxis()).toBe('y');
    expect(s.getFile()).toBeNull();
    expect(s.getFilePaths()).toEqual([]);
  });

  test('setAxis and getAxis', async () => {
    const { useSVGStore } = await loadStore();
    useSVGStore.getState().setAxis('x');
    expect(useSVGStore.getState().axis).toBe('x');
    expect(useSVGStore.getState().getAxis()).toBe('x');
  });

  test('setFilePaths sets paths array', async () => {
    const { useSVGStore } = await loadStore();
    useSVGStore.getState().setFilePaths(['M0 0 L10 10']);
    expect(useSVGStore.getState().getFilePaths()).toEqual(['M0 0 L10 10']);
  });

  test('setFile reads SVG and updates state (paths currently empty)', async () => {
    const { useSVGStore } = await loadStore();
    const file: File = new File([new Blob(['<svg></svg>'])], 'shape.svg', { type: 'image/svg+xml' });
    useSVGStore.getState().setFile(file);

    // Wait for mocked FileReader to trigger onload
    await new Promise((r) => setTimeout(r, 1));

    expect(useSVGStore.getState().file).toBe(file);
    // current implementation sets [] after parse
    expect(useSVGStore.getState().filePaths).toEqual([]);
  });

  test('axis persists across reloads (localStorage)', async () => {
    let mod = await loadStore();
    mod.useSVGStore.getState().setAxis('z');

    mod = await loadStore();
    expect(mod.useSVGStore.getState().axis).toBe('z');
  });
});
