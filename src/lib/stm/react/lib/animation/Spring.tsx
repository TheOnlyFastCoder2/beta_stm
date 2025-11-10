'use client';
import React, { useEffect, useState } from 'react';
import { useSignal, useWatch } from '../../../../_stm/react/react';
import useSpringSignal from './useSpringSignal';
import useVisibilitySignal from './useVisibilitySignal';
import { batch } from '../../../../_stm';

type SpringPhase = 'enter' | 'leave' | 'down' | 'up' | 'default' | 'active';
type TransformStyleValue = 'flat' | 'preserve-3d';


type SpringPropConfig = {
  values?: Partial<Record<SpringPhase, any>>;
  stiffness?: number;
  damping?: number;
  isMobile?: boolean;
};

type ReactiveLike<T> = { readonly v: T; useComputed: (fn: () => void) => void };

export interface SpringProps {
  children: React.ReactNode;
  spring?: Record<string, SpringPropConfig>;
  triggers?: Partial<Record<'hover' | 'enter' | 'leave' | 'up' | 'down', boolean>>;
  isActive?: ReactiveLike<boolean>;
  visibility?: Parameters<typeof useVisibilitySignal>[0];
  className?: string;
  classInner?: string;
  moveShadow?: boolean;
  isMove?: boolean;
  coverThreshold?: number;
  phases?: SpringPhase[];
  onToggle?: (v?: boolean) => void;
  index?: number;
  total?: number;
}

const initConfig = {
  scale: 1,
  rotate: 0,
  depth: 0,
  opacity: 1,
  boxShadow: 0,
  translateY: 0,
  translateX: 0,
  shadowColor: [0, 0, 0, 0.3],
  perspective: 50,
  perspectiveOrigin: [50, 50],
  transformOrigin: 'center',
  rotateY: 0,
  rotateX: 0,
  transformStyle: 'flat' as TransformStyleValue,
};

const setPhase = (phase: SpringPhase, st: Record<string, any>, spring?: Record<string, SpringPropConfig>) => {
  batch(() => {
    for (const key in st) {
      const cfg = spring?.[key];
      const value = cfg?.values?.[phase];
      st[key].v = value !== undefined ? value : initConfig[key as keyof typeof initConfig];
    }
  });
};

export function Spring({
  children,
  spring,
  triggers,
  isActive,
  visibility,
  onToggle,
  className = '',
  classInner = '',
  isMove,
  moveShadow,
  phases,
  index = 1,
  total = 0,
  coverThreshold = 0.35,
}: SpringProps) {
  const elRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const vis = visibility ? useVisibilitySignal<HTMLDivElement>(visibility, elRef) : null;

  const st: Record<string, any> = {};
  for (const key in initConfig) {
    st[key] = useSignal(spring?.[key]?.values?.default ?? (initConfig as any)[key]);
  }
  st.isPressed = useSignal(false);
  st.wasVisibleOnce = useSignal(false);

  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover)');
    const update = () => setIsTouch(!media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const phaseHandler = (p: SpringPhase, pressed?: boolean) => {
    if (pressed !== undefined) st.isPressed.v = pressed;
    setPhase(p, st, spring);
    if (phases?.includes(p)) onToggle?.(p === 'enter' || p === 'down');
  };

  const handle = {
    down: () => triggers?.down && phaseHandler('down', true),
    up: () => triggers?.up && phaseHandler('up', false),
    enter: () => (triggers?.enter || triggers?.hover) && phaseHandler('enter'),
    leave: () => (triggers?.leave || triggers?.hover) && phaseHandler('leave'),
  };

  useEffect(() => {
    const up = () => st.isPressed.v && phaseHandler('up', false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  useWatch(() => {
    if (vis) {
      const visible = vis.visible.v;
      phaseHandler(visible ? 'active' : 'default', visible);
      if (visible) st.wasVisibleOnce.v = true;
    }
    if (isActive) setPhase(isActive.v ? 'active' : 'default', st, spring);
  });

  useWatch(() => {
    if (!vis || !st.wasVisibleOnce.v) return;
    const el = vis.ref.current;
    if (!el) return;
    const isLast = index === total;
    const hide = isLast ? 0 : Math.min(1, vis.overlap.v * 2);
    const covered = !isLast && hide > coverThreshold;
    setPhase(covered || !vis.visible.v ? 'default' : 'active', st, spring);
  });

  const springSignals: Record<string, any> = {};
  for (const key in st) {
    springSignals[key] = useSpringSignal(st[key], useSignal(st[key].v), {
      stiffness: spring?.[key]?.stiffness ?? 160,
      damping: spring?.[key]?.damping ?? 18,
    });
  }

  useWatch(() => {
    const el = elRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;

    const s = springSignals.scale.v;
    const r = springSignals.rotate.v;
    const z = springSignals.depth.v;
    const o = springSignals.opacity.v;
    const x = springSignals.translateX.v;
    const y = springSignals.translateY.v;
    const ry = springSignals.rotateY.v;
    const rx = springSignals.rotateX.v;
    const sh = springSignals.boxShadow.v;
    const po = springSignals.perspectiveOrigin.v;
    const colorArr = springSignals.shadowColor.v;
    const p = springSignals.perspective.v;

    const color = `rgba(${colorArr[0]}, ${colorArr[1]}, ${colorArr[2]}, ${colorArr[3].toFixed(2)})`;
    const origin = Array.isArray(po) ? `${po[0]}% ${po[1]}%` : po;
    const tOrigin = Array.isArray(st.transformOrigin.v)
      ? `${st.transformOrigin.v[0]}% ${st.transformOrigin.v[1]}%`
      : st.transformOrigin.v;

    el.style.perspective = `${p}px`;
    el.style.perspectiveOrigin = origin;
    inner.style.transformStyle = springSignals.transformStyle.v;
    inner.style.transformOrigin = tOrigin;
    el.style.willChange = 'transform';

    inner.style.transform = `
      rotateY(${ry}deg)
      rotateX(${rx}deg)
      scale(${s})
      rotate(${r}deg)
      translate3d(${x}px, ${y}px, ${z}px)
    `;
    inner.style.opacity = o.toFixed(2);
    inner.style.boxShadow = `0 ${z + sh}px ${(z + sh) * 3}px ${color}`;
  });

  useEffect(() => {
    const el = elRef.current;
    const inner = innerRef.current;

    if (!isMove || isTouch || !el || !inner) return;

    const controller = new AbortController();
    const { signal } = controller;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

      st.rotateY.v = -dx * 12;
      st.rotateX.v = dy * 12;

      if (moveShadow) {
        inner.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        inner.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      }
    };

    const reset = () => {
      st.rotateY.v = 0;
      st.rotateX.v = 0;

      if (moveShadow) {
        inner.style.setProperty('--mouse-x', `50%`);
        inner.style.setProperty('--mouse-y', `50%`);
      }
    };

    el.addEventListener('mousemove', handleMove, { signal });
    el.addEventListener('mouseleave', reset, { signal });

    return () => {
      controller.abort();
    };
  }, [isTouch, isMove, moveShadow]);

  return (
    <div
      ref={elRef}
      className={className}
      onMouseDown={handle.down}
      onMouseUp={handle.up}
      onMouseEnter={handle.enter}
      onMouseLeave={handle.leave}
      onTouchStart={handle.down}
      onTouchEnd={handle.up}
    >
      <div className={classInner} ref={innerRef}>
        {children}
      </div>
    </div>
  );
}
