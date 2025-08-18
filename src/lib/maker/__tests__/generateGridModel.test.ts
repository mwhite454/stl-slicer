import makerjs from 'makerjs';
import { generateMakerGridModel } from '@/lib/maker/generateGridModel';

describe('generateMakerGridModel', () => {
  test('creates grid lines, axes sub-model, and meta with valid gridSize', () => {
    const model = generateMakerGridModel(100, 80, 20);

    // Grid lines present (vertical/horizontal, positive and negative, centered)
    const keys = Object.keys(model.paths || {});
    expect(keys).toEqual(expect.arrayContaining([
      'gv+0.000', 'gv+20.000', 'gv-20.000',
      'gh+0.000', 'gh+20.000', 'gh-20.000',
    ]));

    // Axes submodel
    expect(model.models).toBeTruthy();
    const axes = (model.models as any)['axes'];
    expect(axes).toBeTruthy();
    expect(Object.keys(axes.paths)).toEqual(expect.arrayContaining(['axis-x', 'axis-y']));

    // Meta
    const meta: any = (model as any).meta;
    expect(meta).toBeTruthy();
    expect(meta.operation).toBe('meta');
    expect(meta.metaType).toBe('grid');
    expect(meta.gridSize).toBe(20);
  });

  test('no grid lines when gridSize <= 0 or not finite', () => {
    const none1 = generateMakerGridModel(50, 50, 0);
    const none2 = generateMakerGridModel(50, 50, -10);
    const none3 = generateMakerGridModel(50, 50, Infinity);

    for (const m of [none1, none2, none3]) {
      // paths should only contain axes added later as submodel; top-level grid lines absent
      expect(Object.keys(m.paths || {})).toHaveLength(0);
      // axes still present as submodel
      const axes = (m.models as any)['axes'];
      expect(axes).toBeTruthy();
      expect(Object.keys(axes.paths)).toEqual(expect.arrayContaining(['axis-x', 'axis-y']));
    }
  });
});
