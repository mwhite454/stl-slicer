import { jest } from '@jest/globals';

// helper to load fresh store and isolate persistence
const loadViewer = async () => {
  jest.resetModules();
  const mod = await import('@/stores/viewerStore');
  return mod;
};

describe('viewerStore', () => {
  beforeEach(() => {
    // clear persisted state between tests
    localStorage.clear();
  });

  test('defaults and setters/getters', async () => {
    const { useViewerStore } = await loadViewer();
    const s = useViewerStore.getState();
    expect(s.getZoom()).toBe(1);
    expect(s.getPan()).toEqual({ x: 0, y: 0 });

    s.setZoom(2.5);
    s.setPan(10, 20);
    expect(useViewerStore.getState().zoom).toBe(2.5);
    expect(useViewerStore.getState().panX).toBe(10);
    expect(useViewerStore.getState().panY).toBe(20);

    expect(useViewerStore.getState().getZoom()).toBe(2.5);
    expect(useViewerStore.getState().getPan()).toEqual({ x: 10, y: 20 });
  });

  test('resetView resets zoom and pan', async () => {
    const { useViewerStore } = await loadViewer();
    const s = useViewerStore.getState();
    s.setZoom(3);
    s.setPan(5, 6);
    s.resetView();
    expect(useViewerStore.getState().zoom).toBe(1);
    expect(useViewerStore.getState().panX).toBe(0);
    expect(useViewerStore.getState().panY).toBe(0);
  });

  test('persistence: state survives remount via localStorage', async () => {
    // mount and mutate
    let mod = await loadViewer();
    mod.useViewerStore.getState().setZoom(4);
    mod.useViewerStore.getState().setPan(7, 8);

    // simulate page reload by reloading module
    mod = await loadViewer();
    expect(mod.useViewerStore.getState().zoom).toBe(4);
    expect(mod.useViewerStore.getState().panX).toBe(7);
    expect(mod.useViewerStore.getState().panY).toBe(8);
  });
});
