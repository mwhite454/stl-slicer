"use client";
import { useDraggable } from '@dnd-kit/core';
import React, { memo } from 'react';

type DraggablePathProps = {
    id: string;
    d: string;
    transform: string;
    selected: boolean;
    onClick: () => void;
    setPathRef: (id: string, el: SVGGraphicsElement | null) => void;
    selectionD?: string;
};
export const DraggablePath = memo(function DraggablePath({ id, d, transform, selected, onClick, setPathRef, selectionD }: DraggablePathProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
    const handleGroupRef = (node: SVGGElement | null) => {
        setNodeRef(node as unknown as HTMLElement | null);
        setPathRef(id, node as unknown as SVGGraphicsElement | null);
    };
    return (
        <g
            ref={handleGroupRef}
            {...listeners}
            {...attributes}
            role={undefined as any}
            tabIndex={-1}
            focusable={false as any}
            transform={transform}
            pointerEvents="all"
            style={{ fill: 'blue', strokeWidth: 0.8, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent' as any, caretColor: 'transparent' as any }}
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
            {/* Base geometry */}
            <text>{transform}</text>
            <path
                focusable={false as any}
                d={d}
                fill="transparent"
                stroke="#222"
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
                opacity={isDragging ? 0.9 : 1}
                pointerEvents="all"
                style={{ outline: 'none' }}
                onFocus={(e) => {
                    (e.currentTarget as any)?.blur?.();
                }} />
            {/* Selection highlight locked to same geometry & transform */}
            {selected && (
                <path
                    d={ d}
                    fill="none"
                    stroke="#1e90ff"
                    strokeWidth={1.4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                    strokeDasharray="3 2"
                />
            )}
        </g>
    );
});
