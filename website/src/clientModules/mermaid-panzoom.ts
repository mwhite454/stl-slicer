/* eslint-disable no-console */
// svg-pan-zoom does not ship TS types by default; treat as any
// eslint-disable-next-line @typescript-eslint/no-var-requires
const svgPanZoom: any = require('svg-pan-zoom');

function hasFiniteBBox(svg: SVGSVGElement): boolean {
  try {
    const b = svg.getBBox();
    return Number.isFinite(b.width) && Number.isFinite(b.height) && b.width > 0 && b.height > 0;
  } catch {
    return false;
  }
}

function enhanceMermaidSvg(svg: SVGSVGElement) {
  // Avoid double-initializing
  if ((svg as any).__pz) return;

  // Wrap in a container to control size
  const parent = svg.parentElement as HTMLElement | null;
  if (!parent) return;

  // If it's already wrapped, reuse
  const wrapper = parent.classList.contains('mermaid-panzoom')
    ? (parent as HTMLElement)
    : (() => {
        const w = document.createElement('div');
        w.className = 'mermaid-panzoom';
        parent.replaceChild(w, svg);
        w.appendChild(svg);
        return w;
      })();
  // Improve input behavior on touch/trackpads
  wrapper.style.touchAction = 'none';

  // Defer initialization until the SVG has a measurable bbox to avoid Infinity matrices
  if (!(svg as any).__pzPending && !hasFiniteBBox(svg)) {
    (svg as any).__pzPending = true;
    const delays = [0, 50, 150, 300, 600, 1000];
    let i = 0;
    const wait = () => {
      if (hasFiniteBBox(svg)) {
        (svg as any).__pzPending = false;
        enhanceMermaidSvg(svg);
        return;
      }
      if (i < delays.length - 1) {
        i += 1;
        setTimeout(wait, delays[i]);
      } else {
        // Give up without crashing; next mutations/scans can retry
        (svg as any).__pzPending = false;
      }
    };
    setTimeout(wait, delays[i]);
    return;
  }

  // Ensure the SVG has a viewBox; if missing, synthesize one from bbox
  try {
    const vb = svg.viewBox.baseVal;
    if (!vb || vb.width === 0 || vb.height === 0) {
      const b = svg.getBBox();
      if (b && b.width > 0 && b.height > 0) {
        svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.width} ${b.height}`);
      }
    }
  } catch {}

  // Make SVG fill its wrapper to make interactions intuitive
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  // Improve input behavior directly on the SVG
  (svg.style as any).touchAction = 'none';
  (svg.style as any).userSelect = 'none';

  const pz = svgPanZoom(svg, {
    zoomEnabled: true,
    controlIconsEnabled: true,
    fit: true,
    center: true,
    minZoom: 0.2,
    maxZoom: 8,
    panEnabled: true,
    contain: false,
    dblClickZoomEnabled: true,
    mouseWheelZoomEnabled: true,
    zoomScaleSensitivity: 0.2,
    // Bind input listeners to the SVG itself for reliable wheel/drag capture
    eventsListenerElement: svg,
    // Use the first-level group as the viewport to avoid transforming defs or the root
    viewportSelector: 'g',
  });
  (svg as any).__pz = pz;
  // Expose for quick debugging in DevTools
  (window as any).__lastMermaidPZ = pz;

  // Perform an initial fit/center once ready
  try {
    if (hasFiniteBBox(svg)) {
      pz.fit();
      pz.center();
    }
  } catch {}

  // After the next frame, recalc and refit to solidify the interaction hooks
  requestAnimationFrame(() => {
    try {
      pz.resize();
      if (hasFiniteBBox(svg)) {
        pz.fit();
        pz.center();
      }
    } catch {}
  });

  // Double-click wrapper to reset view
  wrapper.addEventListener('dblclick', () => {
    try {
      if (hasFiniteBBox(svg)) {
        pz.fit();
        pz.center();
      }
    } catch {}
  });
}

function isMermaidSvg(svg: SVGSVGElement): boolean {
  if (!svg) return false;
  // Common markers for Mermaid-rendered SVGs
  if (svg.classList.contains('mermaid')) return true;
  if (svg.id && svg.id.toLowerCase().includes('mermaid')) return true;
  if (svg.closest('.mermaid')) return true;
  // Heuristic: presence of typical Mermaid groups/classes
  const hasMermaidGroups = svg.querySelector('g.edgePaths, g.nodes, g.clusters, g.grid, g.label') !== null;
  return hasMermaidGroups;
}

function scanAndEnhance(root: ParentNode = document) {
  const candidates = Array.from(
    root.querySelectorAll<SVGSVGElement>(
      '.mermaid svg, svg.mermaid, svg[id^="mermaid"], article svg, .markdown svg'
    )
  );
  candidates.forEach((svg) => {
    if (isMermaidSvg(svg)) enhanceMermaidSvg(svg);
  });
}

function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches('.mermaid, .markdown, main, article')) {
            scanAndEnhance(n);
          }
          // If an SVG node is directly added
          if (n instanceof SVGSVGElement && isMermaidSvg(n)) {
            enhanceMermaidSvg(n);
          }
        });
      }
      if (m.type === 'attributes') {
        const target = m.target as Element;
        if (target instanceof SVGSVGElement && (m.attributeName === 'class' || m.attributeName === 'id')) {
          if (isMermaidSvg(target)) enhanceMermaidSvg(target);
        }
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id'],
  });
}

(function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scanAndEnhance();
      setupObserver();
      // Scan again shortly after load to catch late Mermaid renders
      setTimeout(() => scanAndEnhance(), 0);
      setTimeout(() => scanAndEnhance(), 100);
      setTimeout(() => scanAndEnhance(), 300);
      setTimeout(() => scanAndEnhance(), 1000);
    });
  } else {
    scanAndEnhance();
    setupObserver();
    setTimeout(() => scanAndEnhance(), 0);
    setTimeout(() => scanAndEnhance(), 100);
    setTimeout(() => scanAndEnhance(), 300);
    setTimeout(() => scanAndEnhance(), 1000);
  }

  // Also rescan on client-side route changes
  const rescan = () => {
    setTimeout(() => scanAndEnhance(), 0);
    setTimeout(() => scanAndEnhance(), 100);
    setTimeout(() => scanAndEnhance(), 300);
  };
  window.addEventListener('popstate', rescan);
  window.addEventListener('hashchange', rescan);
})();
