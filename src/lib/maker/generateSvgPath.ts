import makerjs from 'makerjs';

// Simple in-memory cache keyed by width x height
const cache = new Map<string, string>();

export function rectPathData(widthMm: number, heightMm: number): string {
  const key = `${widthMm}x${heightMm}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const model = new makerjs.models.Rectangle(widthMm, heightMm);
  // maker.js can return string or a map keyed by layer; normalize to a single string
  const out = makerjs.exporter.toSVGPathData(model, { origin: [0, 0] } as any) as unknown;
  const d = typeof out === 'string' ? out : Object.values(out as Record<string, string>).join(' ');
  cache.set(key, d);
  return d;
}
