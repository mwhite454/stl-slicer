import { svgYFromMaker, makerYFromSvg, svgPointFromMaker, makerPointFromSvg, transformForMakerPath, convertMakerJsToSvgCoordinates, convertSvgToMakerJsCoordinates } from '@/lib/coords';

describe('coords utilities', () => {
  test('svgYFromMaker and makerYFromSvg are symmetric around refHeight', () => {
    const H = 100;
    expect(svgYFromMaker(0, H)).toBe(100);
    expect(svgYFromMaker(100, H)).toBe(0);
    expect(makerYFromSvg(0, H)).toBe(100);
    expect(makerYFromSvg(100, H)).toBe(0);
  });

  test('point conversions flip Y correctly', () => {
    const H = 50;
    const pMaker = { x: 10, y: 5 };
    const pSvg = svgPointFromMaker(pMaker, H);
    expect(pSvg).toEqual({ x: 10, y: 45 });

    const back = makerPointFromSvg(pSvg, H);
    expect(back).toEqual(pMaker);
  });

  test('transformForMakerPath returns translate with mm values', () => {
    const t = transformForMakerPath(12.5, -3.2, 0);
    expect(t).toBe('translate(12.5 -3.2)');
  });

  test('convertMakerJsToSvgCoordinates flips Y for paths and nested models', () => {
    const height = 200;
    const model = {
      paths: {
        a: { type: 'line', origin: [0, 0], end: [10, 20] },
        b: { type: 'line', origin: [5, 100], end: [5, 150] },
      },
      models: {
        child: {
          paths: {
            c: { type: 'line', origin: [0, 10], end: [0, 30] },
          },
        },
      },
    } as any;

    const out = convertMakerJsToSvgCoordinates(model, height);

    // Original unmodified
    expect((model.paths!.a as any).origin[1]).toBe(0);
    // Converted
    expect((out.paths!.a as any).origin[1]).toBe(200);
    expect((out.paths!.a as any).end[1]).toBe(180);
    expect((out.paths!.b as any).origin[1]).toBe(100);
    expect((out.paths!.b as any).end[1]).toBe(50);

    // Nested flip
    expect((out.models!.child.paths!.c as any).origin[1]).toBe(190);
    expect((out.models!.child.paths!.c as any).end[1]).toBe(170);
  });

  test('convertSvgToMakerJsCoordinates delegates to convertMakerJsToSvgCoordinates', () => {
    const height = 10;
    const svgModel = { paths: { p: { type: 'line', origin: [0, 1], end: [0, 2] } } } as any;
    const out = convertSvgToMakerJsCoordinates(svgModel, height);
    expect((out.paths!.p as any).origin[1]).toBe(9);
    expect((out.paths!.p as any).end[1]).toBe(8);
  });
});
