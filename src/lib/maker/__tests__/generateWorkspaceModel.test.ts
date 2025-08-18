import { generateMakerWorkspaceModel } from '@/lib/maker/generateWorkspaceModel';

describe('generateMakerWorkspaceModel', () => {
  test('creates border sub-model with four edges and meta', () => {
    const model = generateMakerWorkspaceModel(100, 80);

    expect(model.models).toBeTruthy();
    const border = (model.models as any)['border'];
    expect(border).toBeTruthy();

    const edgeKeys = Object.keys(border.paths || {});
    expect(edgeKeys).toEqual(expect.arrayContaining([
      'border-top', 'border-right', 'border-bottom', 'border-left'
    ]));

    const meta: any = (model as any).meta;
    expect(meta).toBeTruthy();
    expect(meta.operation).toBe('meta');
    expect(meta.metaType).toBe('workspace');
  });
});
