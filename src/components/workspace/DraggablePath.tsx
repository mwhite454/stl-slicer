"use client";
import { useDraggable } from '@dnd-kit/core';
import React, { memo } from 'react';

type DraggablePathProps = {
    id: string;
    d: string;
    transform: string;
    selected: boolean;
    onClick: () => void;
    setPathRef: (id: string, el: SVGPathElement | null) => void;
};
export const DraggablePath = memo(function DraggablePath({ id, d, transform, selected, onClick, setPathRef }: DraggablePathProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
    const groupRef = setNodeRef as unknown as (node: SVGGElement | null) => void;
    return (
        <g
            ref={groupRef}
            {...listeners}
            role={undefined as any}
            tabIndex={-1}
            focusable={false as any}
            pointerEvents="all"
            style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent' as any, caretColor: 'transparent' as any }}
            onMouseDown={(e) => {
                // prevent focus ring/outline on click
                e.preventDefault();
            }}
            onFocus={(e) => {
                // force blur to avoid UA/mantine focus styling on SVG nodes
                (e.currentTarget as any)?.blur?.();
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
        >
            <path
                ref={(el) => setPathRef(id, el)}
                focusable={false as any}
                d={d}
                transform={transform}
                fill="transparent"
                stroke="#222"
                strokeWidth={0.4}
                vectorEffect="non-scaling-stroke"
                opacity={isDragging ? 0.9 : 1}
                pointerEvents="all"
                style={{ outline: 'none' }}
                onFocus={(e) => {
                    (e.currentTarget as any)?.blur?.();
                }} />
        </g>
    );
});
