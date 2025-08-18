import { exportSvg, exportSvgZip } from '../exportUtils';

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

// Mock JSZip to control file() and generateAsync()
class JSZipMock {
  public files: Record<string, string> = {};
  file(name: string, content: string) {
    this.files[name] = content;
    return this;
  }
  async generateAsync(_: { type: 'blob' }) {
    return new Blob([JSON.stringify(this.files)], { type: 'application/zip' });
  }
}

jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => new JSZipMock());
});

const { saveAs } = require('file-saver');
const JSZip = require('jszip');

describe('exportUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exportSvg calls saveAs with a blob and filename', () => {
    exportSvg('<svg></svg>', 'layer.svg');

    expect(saveAs).toHaveBeenCalledTimes(1);
    const [blobArg, nameArg] = saveAs.mock.calls[0];
    expect(nameArg).toBe('layer.svg');
    expect(blobArg).toBeInstanceOf(Blob);
  });

  test('exportSvgZip zips files and calls saveAs with zip name', async () => {
    const layers = [
      { index: 0, z: 0, paths: [] },
      { index: 1, z: 3, paths: [] },
    ];

    const svgContents = layers.map((layer, i) => ({
      layer,
      svg: `<svg id="${i}"></svg>`,
      makerjsSVG: `<svg data-maker="${i}"></svg>`,
    }));

    await exportSvgZip(svgContents as any, 'partA', 'y');

    expect(JSZip).toHaveBeenCalled();
    // Called saveAs with a blob and computed filename
    expect(saveAs).toHaveBeenCalledTimes(1);
    const [zipBlob, name] = saveAs.mock.calls[0];
    expect(name).toBe('partA_layers.zip');
    expect(zipBlob).toBeInstanceOf(Blob);

    // Inspect mocked zip contents via our JSZipMock
    const zipInstance: any = (JSZip as jest.Mock).mock.results[0].value;
    expect(Object.keys(zipInstance.files)).toEqual([
      'partA_layer_0_y_axis.svg',
      'partA_layer_0_y_axis_makerjs.svg',
      'partA_layer_1_y_axis.svg',
      'partA_layer_1_y_axis_makerjs.svg',
    ]);
  });
});
