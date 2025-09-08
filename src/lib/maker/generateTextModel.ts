import makerjs from 'makerjs';
import opentype, { Font } from 'opentype.js';
import type { MakerJSModel } from '@/lib/coords';

// Simple in-memory font cache
const fontCache = new Map<string, Promise<Font>>();

async function loadFont(url: string): Promise<Font> {
  if (!fontCache.has(url)) {
    const p = new Promise<Font>((resolve, reject) => {
      opentype.load(url, (err, font) => {
        if (err || !font) return reject(err ?? new Error('Failed to load font'));
        resolve(font);
      });
    });
    fontCache.set(url, p);
  }
  return fontCache.get(url)!;
}

export type GenerateTextModelOptions = {
  fontUrl?: string; // defaults to app font
  fontSizeMm: number; // text height in mm
};

// Lightweight validator to detect null/NaN coordinates in MakerJS models
function validateMakerModelNumeric(model: any): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const checkPoint = (p: any, label: string) => {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || Number.isNaN(p.x) || Number.isNaN(p.y)) {
      issues.push(`${label} is invalid: ${JSON.stringify(p)}`);
    }
  };
  const walkPaths = (paths: any) => {
    if (!paths) return;
    Object.entries(paths as Record<string, any>).forEach(([key, path]) => {
      if (path?.origin) checkPoint(path.origin, `paths.${key}.origin`);
      if (path?.end) checkPoint(path.end, `paths.${key}.end`);
      if (Array.isArray(path?.controls)) {
        path.controls.forEach((c: any, i: number) => checkPoint(c, `paths.${key}.controls[${i}]`));
      }
      // Some importers use "points" arrays
      if (Array.isArray(path?.points)) {
        path.points.forEach((pt: any, i: number) => checkPoint(pt, `paths.${key}.points[${i}]`));
      }
    });
  };
  const walkModel = (m: any) => {
    if (!m) return;
    if (m.paths) walkPaths(m.paths);
    if (m.models) {
      Object.entries(m.models as Record<string, any>).forEach(([childKey, child]) => {
        walkModel(child);
      });
    }
  };
  walkModel(model);
  return { ok: issues.length === 0, issues };
}

/**
 * Generate a maker.js model for the given text using opentype.js.
 * Result is Y-up so it renders correctly with our stage transform.
 */
export async function generateTextModel(text: string, opts: GenerateTextModelOptions): Promise<MakerJSModel> {
  const fontUrl = opts.fontUrl ?? '/fonts/SpaceMono-Regular.ttf';
  const font = await loadFont(fontUrl);

  // OpenType uses font units; set size in "mm" equivalent (we treat 1 unit == 1 mm for simplicity)
  const fontSize = Math.max(0.1, opts.fontSizeMm);

  // Generate path at baseline y = 0; we'll normalize afterward
  const otPath = font.getPath(text, 0, 0, fontSize, { kerning: true } as any);
  // Convert to SVG path data
  // opentype.js path objects have toPathData() or toSVG(); prefer toPathData when available
  const pathData: string = (otPath as any).toPathData
    ? (otPath as any).toPathData(3)
    : ((otPath as any).toSVG?.(3) ?? '');

  // Import into maker.js directly from SVG path data (supports beziers)
  let model = makerjs.importer.fromSVGPathData(pathData) as unknown as MakerJSModel;

  // Compute bounds from opentype (more reliable for initial normalization)
  const bbox = otPath.getBoundingBox();
  const minX = bbox.x1;
  const minY = bbox.y1;
  const width = bbox.x2 - bbox.x1;
  const height = bbox.y2 - bbox.y1;

  // Normalize: translate so min corner is at 0,0 in Y-down, then flip to Y-up and translate
  // 1) move left/top to origin (SVG Y-down space)
  if (makerjs.model && (makerjs.model as any).move) {
    makerjs.model.move(model as any, [-minX, -minY]);
  }
  // 2) flip Y (scale y by -1) and move up by height to make Y-up coordinates
  if ((makerjs.model as any).scale) {
    // maker.js scale signature is (model, scale) or (model, [sx, sy])
    (makerjs.model as any).scale(model as any, [1, -1]);
  }
  if ((makerjs.model as any).move) {
    makerjs.model.move(model as any, [0, height]);
  }

  // Ensure units are mm for downstream consistency
  (model as any).units = 'mm';

  // Debug: validate numeric coordinates and log extents
  try {
    const ext = makerjs.measure.modelExtents(model as any);
    const v = validateMakerModelNumeric(model as any);
    if (!v.ok) {
      // eslint-disable-next-line no-console
      console.warn('[generateTextModel] Detected invalid coordinates in label model', {
        text,
        fontSizeMm: opts.fontSizeMm,
        issues: v.issues.slice(0, 10),
        issuesCount: v.issues.length,
        extents: ext ? { low: ext.low, high: ext.high } : null,
      });
    } else {
      // eslint-disable-next-line no-console
      console.log('[generateTextModel] model ok', {
        text,
        fontSizeMm: opts.fontSizeMm,
        extents: ext ? { low: ext.low, high: ext.high } : null,
      });
    }
  } catch {}

  return model;
}
