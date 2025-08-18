import { jest } from '@jest/globals';

// Deterministic ids
jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'id-1') }));

// Helper to fresh-import the store per test
const loadStore = async () => {
  jest.resetModules();
  // reapply nanoid mock after reset
  jest.doMock('nanoid', () => ({ nanoid: jest.fn(() => 'id-1') }));
  const mod = await import('@/stores/workspaceStore');
  return mod;
};

describe('workspaceStore', () => {
  test('defaults: bounds/grid/viewport/ui/operations', async () => {
    const { useWorkspaceStore } = await loadStore();
    const s = useWorkspaceStore.getState();
    expect(s.bounds).toEqual({ width: 482, height: 279 });
    expect(s.grid).toEqual({ size: 5, snap: false, show: true });
    expect(s.viewport).toEqual({ zoom: 1, pan: { x: 0, y: 0 }, units: 'mm' });
    expect(s.ui.disablePlaneMapping).toBe(true);
    expect(s.operations.map((o) => o.key)).toEqual(['meta', 'cut', 'engrave', 'score']);
  });

  test('addRectangle / updateItemPosition / assignOperation / delete / clear', async () => {
    const { useWorkspaceStore } = await loadStore();
    const st = useWorkspaceStore.getState();

    st.addRectangle({ width: 10, height: 5 });
    expect(useWorkspaceStore.getState().items).toHaveLength(1);
    const item = useWorkspaceStore.getState().items[0];
    expect(item.type).toBe('rectangle');
    expect(item.position).toEqual({ x: 20, y: 10, z: 0 });

    st.updateItemPosition(item.id, 7, 8);
    expect(useWorkspaceStore.getState().items[0].position).toEqual({ x: 7, y: 8 });

    st.assignOperation(item.id, 'op-cut');
    expect(useWorkspaceStore.getState().items[0].operationId).toBe('op-cut');

    st.deleteItem(item.id);
    expect(useWorkspaceStore.getState().items).toHaveLength(0);

    st.addRectangle({ width: 1, height: 1 });
    st.clearItems();
    expect(useWorkspaceStore.getState().items).toHaveLength(0);
    expect(useWorkspaceStore.getState().selection.selectedIds).toEqual([]);
  });

  test('selection: selectOnly', async () => {
    const { useWorkspaceStore } = await loadStore();
    const s = useWorkspaceStore.getState();
    s.addRectangle({ width: 1, height: 1 });
    const id = useWorkspaceStore.getState().items[0].id;
    s.selectOnly(id);
    expect(useWorkspaceStore.getState().selection.selectedIds).toEqual([id]);
    s.selectOnly(null);
    expect(useWorkspaceStore.getState().selection.selectedIds).toEqual([]);
  });

  test('viewport/grid/bounds/ui setters', async () => {
    const { useWorkspaceStore } = await loadStore();
    const s = useWorkspaceStore.getState();

    s.setZoom(2);
    s.setPan({ x: 3, y: 4 });
    s.setUnits('in');
    s.setUi({ showPerfHud: true });
    expect(useWorkspaceStore.getState().viewport).toEqual({ zoom: 2, pan: { x: 3, y: 4 }, units: 'in' });
    expect(useWorkspaceStore.getState().ui.showPerfHud).toBe(true);

    s.setGrid({ snap: true });
    expect(useWorkspaceStore.getState().grid).toEqual({ size: 5, snap: true, show: true });

    s.setBounds({ width: 100, height: 80 });
    expect(useWorkspaceStore.getState().bounds).toEqual({ width: 100, height: 80 });
    expect(useWorkspaceStore.getState().ui.bedSizeMm).toEqual({ width: 100, height: 80 });

    s.setBedSize({ width: 200, height: 160 });
    expect(useWorkspaceStore.getState().bounds).toEqual({ width: 200, height: 160 });
    expect(useWorkspaceStore.getState().ui.bedSizeMm).toEqual({ width: 200, height: 160 });
  });

  test('slice layers: addSliceLayer centers by extents when mapping disabled', async () => {
    const { useWorkspaceStore } = await loadStore();
    const s = useWorkspaceStore.getState();
    // Create simple maker model with extents 10x5 using mocked makerjs paths
    const makerjs = (await import('makerjs')).default as any;
    const model = { paths: {} as any };
    model.paths.a = new makerjs.paths.Line([0, 0], [10, 0]);
    model.paths.b = new makerjs.paths.Line([0, 0], [0, 5]);

    s.setBounds({ width: 100, height: 80 });
    s.addSliceLayer({ makerJsModel: model, layerIndex: 0, zCoordinate: 1, axis: 'z', layerThickness: 1 });
    const item = useWorkspaceStore.getState().items[0];
    expect(item.type).toBe('sliceLayer');
    // Center: (100-10)/2=45, (80-5)/2=37.5
    expect(item.position.x).toBe(45);
    expect(item.position.y).toBe(37.5);
    if (item.type === 'sliceLayer') {
      expect(item.layer.layerIndex).toBe(0);
      expect(item.layer.axis).toBe('z');
    } else {
      throw new Error('expected sliceLayer');
    }
  });

  test('slice layers: addMultipleSliceLayers respects x/y overrides and updates z', async () => {
    const { useWorkspaceStore } = await loadStore();
    const s = useWorkspaceStore.getState();
    const makerjs = (await import('makerjs')).default as any;
    const model = { paths: {} as any };
    model.paths.a = new makerjs.paths.Line([0, 0], [10, 0]);
    model.paths.b = new makerjs.paths.Line([0, 0], [0, 5]);

    s.setBounds({ width: 100, height: 80 });
    s.addMultipleSliceLayers([
      { makerJsModel: model, layerIndex: 1, zCoordinate: 2, axis: 'z', layerThickness: 1, x: 11, y: 22 },
      { makerJsModel: model, layerIndex: 2, zCoordinate: 3, axis: 'z', layerThickness: 1 },
    ]);
    const items = useWorkspaceStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items[0].position).toEqual({ x: 11, y: 22, z: 2 });
    // second centered: 45, 37.5 and z from zCoordinate
    expect(items[1].position.x).toBe(45);
    expect(items[1].position.y).toBe(37.5);
    expect(items[1].position.z).toBe(3);
  });

  test('slice layers: updateSliceLayer merges updates', async () => {
    const { useWorkspaceStore } = await loadStore();
    const s = useWorkspaceStore.getState();
    const makerjs = (await import('makerjs')).default as any;
    const model = { paths: {} as any };
    model.paths.a = new makerjs.paths.Line([0, 0], [1, 0]);

    s.addSliceLayer({ makerJsModel: model, layerIndex: 0, zCoordinate: 0, axis: 'z', layerThickness: 1 });
    const id = useWorkspaceStore.getState().items[0].id;
    s.updateSliceLayer(id, { layerThickness: 2, plane: 'XY' });
    const item = useWorkspaceStore.getState().items[0];
    if (item.type === 'sliceLayer') {
      expect(item.layer.layerThickness).toBe(2);
      expect(item.layer.plane).toBe('XY');
    } else {
      throw new Error('expected sliceLayer');
    }
  });

  test('operations: add/update/remove with meta protection and cleanup', async () => {
    const { useWorkspaceStore } = await loadStore();
    const s = useWorkspaceStore.getState();

    // add prevent duplicate key
    s.addOperation({ key: 'cut', label: 'Cut copy', color: '#000' });
    expect(useWorkspaceStore.getState().operations.filter(o => o.key === 'cut')).toHaveLength(1);

    // add new op
    ;(require('nanoid').nanoid as jest.Mock).mockReturnValueOnce('op-new');
    s.addOperation({ key: 'kiss', label: 'Kiss Cut', color: '#123' });
    const ops = useWorkspaceStore.getState().operations;
    expect(ops.find(o => o.key === 'kiss')?.id).toBe('op-new');

    // update by id or key
    s.updateOperation('op-new', { color: '#999' });
    expect(useWorkspaceStore.getState().operations.find(o => o.id === 'op-new')?.color).toBe('#999');
    s.updateOperation('kiss', { label: 'Kiss' });
    expect(useWorkspaceStore.getState().operations.find(o => o.key === 'kiss')?.label).toBe('Kiss');

    // attach this op to an item then remove it => item.operationId cleared
    s.addRectangle({ width: 1, height: 1 });
    const id = useWorkspaceStore.getState().items[0].id;
    s.assignOperation(id, 'op-new');
    s.removeOperation('op-new');
    expect(useWorkspaceStore.getState().operations.find(o => o.id === 'op-new')).toBeUndefined();
    expect(useWorkspaceStore.getState().items[0].operationId).toBeNull();

    // cannot remove meta
    s.removeOperation('op-meta');
    expect(useWorkspaceStore.getState().operations.find(o => o.id === 'op-meta' || o.key === 'meta')).toBeTruthy();
  });

  test('meta models: upsert grid/workspace and remove by type', async () => {
    const { useWorkspaceStore } = await loadStore();
    const s = useWorkspaceStore.getState();
    const makerjs = (await import('makerjs')).default as any;

    const grid = { paths: {} as any };
    grid.paths.g = new makerjs.paths.Line([0, 0], [1, 0]);
    s.upsertMetaGrid(grid as any);
    const first = useWorkspaceStore.getState().items[0];
    if (first.type === 'metaModel') {
      expect(first.metaType).toBe('grid');
    } else {
      throw new Error('expected metaModel');
    }
    const firstId = useWorkspaceStore.getState().items[0].id;

    // update existing
    const grid2 = { paths: {} as any };
    grid2.paths.g = new makerjs.paths.Line([0, 0], [2, 0]);
    s.upsertMetaGrid(grid2 as any);
    expect(useWorkspaceStore.getState().items[0].id).toBe(firstId);

    const ws = { paths: {} as any };
    ws.paths.w = new makerjs.paths.Line([0, 0], [3, 0]);
    s.upsertMetaWorkspace(ws as any);
    expect(useWorkspaceStore.getState().items.find(i => i.type === 'metaModel' && i.metaType === 'workspace')).toBeTruthy();

    s.removeMetaByType('grid');
    expect(useWorkspaceStore.getState().items.find(i => i.type === 'metaModel' && i.metaType === 'grid')).toBeUndefined();
  });
});
