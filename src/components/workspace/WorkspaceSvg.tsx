"use client";

import React, { forwardRef } from 'react';

export type WorkspaceSvgProps = {
  bounds: { width: number; height: number };
  isPanning: boolean;
  onClearSelection: () => void;
  onWheel: React.WheelEventHandler<SVGSVGElement>;
  onPointerDown: React.PointerEventHandler<SVGSVGElement>;
  onPointerMove: React.PointerEventHandler<SVGSVGElement>;
  onPointerUp: React.PointerEventHandler<SVGSVGElement>;
  children: React.ReactNode;
};

export const WorkspaceSvg = forwardRef<SVGSVGElement, WorkspaceSvgProps>(
  (
    { bounds, isPanning, onClearSelection, onWheel, onPointerDown, onPointerMove, onPointerUp, children },
    ref,
  ) => (
    <svg
      ref={ref}
      width="100%"
      height="100%"
      viewBox={`0 0 ${bounds.width} ${bounds.height}`}
      style={{
        background: '#fff',
        border: '1px solid #e5e5e5',
        borderRadius: 8,
        userSelect: 'none',
        touchAction: 'none',
        outline: 'none',
        cursor: isPanning ? 'grabbing' : undefined,
      }}
      className="workspace-svg"
      onClick={onClearSelection}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <defs>
        <style>{`
          .workspace-svg:focus { outline: none !important; }
          .workspace-svg *:focus { outline: none !important; }
          .workspace-svg *:focus-visible { outline: none !important; }
          .workspace-svg [aria-selected],
          .workspace-svg [aria-pressed],
          .workspace-svg [aria-roledescription],
          .workspace-svg [role] {
            outline: none !important;
          }
        `}</style>
      </defs>
      {children}
    </svg>
  ),
);

WorkspaceSvg.displayName = 'WorkspaceSvg';
