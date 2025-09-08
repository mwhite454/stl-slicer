"use client";
import { useDraggable } from '@dnd-kit/core';
import React, { memo } from 'react';
import { Path } from './Path';
import { SelectedPath } from './SelectedPath';

type DraggablePathProps = {
    id: string;
    d: string;
    transform: string;
    selected: boolean;
    onClick: () => void;
    setPathRef: (id: string, el: SVGGraphicsElement | null) => void;
    selectionD?: string;
    stroke?: string;
};
export const DraggablePath = memo(function DraggablePath({ id, d, transform, selected, onClick, setPathRef, selectionD, stroke }: DraggablePathProps) {
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
            style={{ fill: 'red', strokeWidth: 0.8, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent' as any, caretColor: 'transparent' as any }}
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
            <Path d={d} isDragging={isDragging} stroke={stroke} />
            {selected && <SelectedPath d={d} selectionD={selectionD} />}
        </g>
    );
});
