import { jest } from '@jest/globals';

const loadStore = async () => {
  jest.resetModules();
  const mod = await import('@/stores/stlStore');
  return mod;
};

describe('stlStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('defaults', async () => {
    const { useSTLStore } = await loadStore();
    const s = useSTLStore.getState();
    expect(s.getAxis()).toBe('y');
    expect(s.getFile()).toBeNull();
  });

  test('setAxis and getAxis', async () => {
    const { useSTLStore } = await loadStore();
    useSTLStore.getState().setAxis('x');
    expect(useSTLStore.getState().axis).toBe('x');
    expect(useSTLStore.getState().getAxis()).toBe('x');
  });

  test('setFile and getFile', async () => {
    const { useSTLStore } = await loadStore();
    // jsdom provides File in modern environments; fallback to any if missing
    const file: File = new File([new Blob(["dummy"])], 'model.stl', { type: 'model/stl' });
    useSTLStore.getState().setFile(file);
    expect(useSTLStore.getState().file).toBe(file);
    expect(useSTLStore.getState().getFile()).toBe(file);
  });

  test('axis persists across reloads (localStorage)', async () => {
    // set axis
    let mod = await loadStore();
    mod.useSTLStore.getState().setAxis('z');

    // reload module simulating page refresh
    mod = await loadStore();
    expect(mod.useSTLStore.getState().axis).toBe('z');
  });
});
