import makerjs from 'makerjs';
import * as mod from '@/lib/maker/generateSvgPath';

describe('generateSvgPath.rectPathData', () => {
  test('cache miss then hit returns same string and uses Rectangle/toSVGPathData', () => {
    const spyRect = jest.spyOn((makerjs as any).models, 'Rectangle');
    const spyExport = jest.spyOn((makerjs as any).exporter, 'toSVGPathData');

    const a = mod.rectPathData(10, 20);
    expect(typeof a).toBe('string');
    expect(spyRect).toHaveBeenCalledWith(10, 20);
    expect(spyExport).toHaveBeenCalledTimes(1);

    const b = mod.rectPathData(10, 20);
    expect(b).toBe(a);
    // second call should hit cache; exporter not called again
    expect(spyExport).toHaveBeenCalledTimes(1);
  });

  test('normalizes exporter map result into a single string', () => {
    const orig = (makerjs as any).exporter.toSVGPathData;
    (makerjs as any).exporter.toSVGPathData = () => ({ A: 'M0 0 L1 0', B: 'L1 1 Z' });

    const d = mod.rectPathData(5, 5);
    expect(typeof d).toBe('string');
    expect(d).toBe('M0 0 L1 0 L1 1 Z');

    // restore
    (makerjs as any).exporter.toSVGPathData = orig;
  });
});
