import { useEffect, useImperativeHandle, useState, type PropsWithChildren } from 'react';
import type { ReactSignal, RefMap } from './types';
import React from 'react';
import { useSignalStore } from '.';

interface ActiveProps<T> {
  sg: ReactSignal<T>;
  is: T;
  children: React.ReactNode;
}

export function Active<T>({ sg, is, children }: ActiveProps<T>) {
  const [val, set] = useState(false);
  sg.useComputed<any>(() => {
    set(sg.v === is);
  });
  return val && children;
}

export interface DraggableImpRef {
  move?: (x: number, y: number) => void;
  startX?: number
  startY?: number
}

interface DraggableProps extends PropsWithChildren {
  impRef: React.RefObject<Partial<DraggableImpRef>>;
}

export function Draggable({ impRef, children }: DraggableProps) {
  const { $: store, useComputed } = useSignalStore({
    x: 0,
    y: 0,
  });

  const ref = useComputed<HTMLDivElement>(() => {
    impRef?.current.move?.(store.x.v, store.y.v);
  });

  const onGrabberDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const prevX = store.x.v;
    const prevY = store.y.v;

    startDrag(e.nativeEvent, {
      onStart: () => {
        document.body.style.userSelect = 'none';
      },
      onMove: (dx, dy) => {
        store.x.v = prevX + dx;
        store.y.v = prevY + dy;
      },
      onEnd: () => {
        document.body.style.userSelect = '';
      },
    });
  };

  useEffect(() => { 
    store.x.v = impRef.current.startX ?? 0;
    store.y.v = impRef.current.startY ?? 0;
  }, [])
  
  return (
    <div
      ref={ref}
      onMouseDown={onGrabberDown}
      onTouchStart={onGrabberDown}
      style={{ display: 'contents' }}
      children={children}
    />
  );
}

function getPointerEvent(e: MouseEvent | TouchEvent) {
  return 'touches' in e ? e.touches[0] : e;
}

type DragCallbacks = {
  onStart?: (x: number, y: number, event: MouseEvent | TouchEvent) => void;
  onMove?: (dx: number, dy: number, event: MouseEvent | TouchEvent) => void;
  onEnd?: (event: MouseEvent | TouchEvent) => void;
};

const startDrag = (startEvent: MouseEvent | TouchEvent, { onStart, onMove, onEnd }: DragCallbacks = {}) => {
  const startPointer = getPointerEvent(startEvent);
  const startX = startPointer.clientX;
  const startY = startPointer.clientY;

  onStart?.(startX, startY, startEvent);

  const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
    moveEvent.preventDefault();
    const pointer = getPointerEvent(moveEvent);
    const dx = pointer.clientX - startX;
    const dy = pointer.clientY - startY;
    onMove?.(dx, dy, moveEvent);
  };

  const handleEnd = (endEvent: MouseEvent | TouchEvent) => {
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleEnd);
    window.removeEventListener('touchmove', handleMove);
    window.removeEventListener('touchend', handleEnd);
    document.body.style.cursor = 'default';
    onEnd?.(endEvent);
  };

  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd);
  document.body.style.cursor = 'grabbing';
};
