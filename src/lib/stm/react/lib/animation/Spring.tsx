'use client';
import React, { useEffect, useState } from 'react';
import { useSignalStore } from '../..';

import type { ReactSignal } from '../../types';
import useVisibilitySignal from './useVisibilitySignal';
import useSpringSignal from './useSpringSignal';

type SpringPropConfig = {
  values?: Partial<Record<SpringPhase, number | number[]>>;
  stiffness?: number;
  damping?: number;
  isMobile?: boolean;
};

type SpringPhase = 'enter' | 'leave' | 'down' | 'up' | 'default' | 'active';
type TransformStyleValue = 'flat' | 'preserve-3d';
type TransformOriginKeyword = 'center' | 'top' | 'bottom' | 'left' | 'right';
type TransformOriginValue = TransformOriginKeyword | `${number}% ${number}%` | [number, number];
type ReactiveLike<T> = {
  readonly v: T;
  useComputed: (fn: () => void) => void;
};

export interface SpringProps {
  children: React.ReactNode;
  isActive?: ReactiveLike<boolean>;
  className?: string;
  classInner?: string;
  index?: number;
  total?: number;
  isMove?: boolean;
  coverThreshold?: number;
  moveShadow?: boolean;
  triggers?: {
    hover?: boolean;
    enter?: boolean;
    leave?: boolean;
    up?: boolean;
    down?: boolean;
  };

  phases?: SpringPhase[];
  onToggle?: (v?: boolean) => void;
  visibility?: Parameters<typeof useVisibilitySignal>[0];
  isOne?: boolean;
  spring?: {
    scale?: SpringPropConfig;
    rotate?: SpringPropConfig;
    depth?: SpringPropConfig;
    opacity?: SpringPropConfig;
    translateY?: SpringPropConfig;
    translateX?: SpringPropConfig;
    boxShadow?: SpringPropConfig;
    shadowColor?: SpringPropConfig;
    perspective?: SpringPropConfig;
    perspectiveOrigin?: SpringPropConfig;
    rotateY?: SpringPropConfig;
    rotateX?: SpringPropConfig;
    transformOrigin?: {
      values?: Partial<Record<SpringPhase, TransformOriginValue>>;
    };
    transformStyle?: {
      values?: Partial<Record<SpringPhase, TransformStyleValue>>;
    };
  };
}

const initConfig = {
  scale: 1,
  rotate: 0,
  depth: 0,
  opacity: 1,
  boxShadow: 0,
  translateY: 0,
  translateX: 0,
  isPressed: false,
  shadowColor: [0, 0, 0, 0.3],
  perspective: 50,
  perspectiveOrigin: [50, 50],
  transformOrigin: 'center',
  rotateY: 0,
  rotateX: 0,
};

export function Spring({
  children,
  visibility,
  className = '',
  classInner = '',
  phases,
  spring,
  isActive,
  triggers,
  onToggle,
  index = 1,
  total = 0,
  isMove,
  moveShadow,
  coverThreshold = 0.35,
  isOne = false,
}: SpringProps) {
  const elRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);

  const vis = visibility ? useVisibilitySignal<HTMLDivElement>(visibility, elRef) : null;

  const { $: st } = useSignalStore({
    scale: spring?.scale?.values?.default ?? initConfig.scale,
    rotate: spring?.rotate?.values?.default ?? initConfig.rotate,
    depth: spring?.depth?.values?.default ?? initConfig.depth,
    opacity: spring?.opacity?.values?.default ?? initConfig.opacity,
    boxShadow: spring?.boxShadow?.values?.default ?? initConfig.boxShadow,
    translateY: spring?.translateY?.values?.default ?? initConfig.translateY,
    translateX: spring?.translateX?.values?.default ?? initConfig.translateX,
    shadowColor: spring?.shadowColor?.values?.default ?? initConfig.shadowColor,
    perspective: spring?.perspective?.values?.default ?? initConfig.perspective,
    perspectiveOrigin: spring?.perspectiveOrigin?.values?.default ?? initConfig.perspectiveOrigin,
    rotateY: spring?.rotateY?.values?.default ?? initConfig.rotateY,
    rotateX: spring?.rotateX?.values?.default ?? initConfig.rotateX,
    transformStyle: spring?.transformStyle?.values?.default ?? 'flat',
    transformOrigin: spring?.transformOrigin?.values?.default ?? initConfig.transformOrigin,
    isPressed: false,
    wasVisibleOnce: false,
  });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hoverMedia = window.matchMedia('(hover: hover)');

    const check = () => setIsTouchDevice(!hoverMedia.matches);

    check();
    hoverMedia.addEventListener('change', check);

    return () => {
      hoverMedia.removeEventListener('change', check);
    };
  }, []);

  const setPhase = (phase: SpringPhase) => {
    const apply = (prop: keyof typeof st) => {
      const cfg = spring?.[prop];
      const value = cfg?.values?.[phase];
      if (prop !== '_metaPath') {
        if (value !== undefined) st[prop].v = value;
        else if (phase === 'default') {
          st[prop].v = (initConfig as any)[prop];
        }
      }
    };
    (Object.keys(st) as (keyof typeof st)[]).forEach(apply);
  };

  const handleDown = () => {
    if (triggers?.down) {
      st.isPressed.v = true;
      setPhase('down');
      if (phases?.includes('down')) onToggle?.(true);
    }
  };

  const handleUp = () => {
    if (st.isPressed.v as boolean) {
      st.isPressed.v = false;
      if (triggers?.up) {
        setPhase('up');
        if (phases?.includes('up')) onToggle?.(false);
      }
    }
  };

  const handleEnter = () => {
    if (triggers?.enter || triggers?.hover) {
      setPhase('enter');
      if (phases?.includes('enter')) onToggle?.(true);
    }
  };

  const handleLeave = () => {
    if (triggers?.leave || triggers?.hover) {
      setPhase('leave');
      if (phases?.includes('leave')) onToggle?.(false);
    }

    if (st.isPressed.v as boolean) {
      st.isPressed.v = false;
      if (triggers?.up) {
        setPhase('up');
        onToggle?.(false);
      }
    }
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      if (st.isPressed.v as boolean) {
        st.isPressed.v = false;
        if (triggers?.up) {
          setPhase('up');
          onToggle?.(false);
        }
      }
    };
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, [triggers?.up]);

  vis?.visible?.useComputed(() => {
    setPhase(vis.visible.v ? 'active' : 'default');
    onToggle?.(vis.visible.v);
    st.isPressed.v = vis.visible.v;
    if (vis.visible.v) {
      st.wasVisibleOnce.v = true;
    }
  });

  isActive?.useComputed(() => {
    setPhase(isActive.v ? 'active' : 'default');
  });
  vis?.overlap?.useComputed?.(() => {
    const el = vis.ref.current;
    if (!el) return;

    if (!st.wasVisibleOnce.v) return;

    const isLast = index === total;
    const hideRatio = isLast ? 0 : Math.min(1, vis.overlap.v * 2);

    const isCovered = !isLast && hideRatio > coverThreshold;
    const phase = isCovered || !vis.visible.v ? 'default' : 'active';
    setPhase(phase);
  });

  const springStore = useSignalStore({});

  // добавляем анимируемые свойства
  const make = (key: keyof typeof st, cfg?: SpringPropConfig) => {
    const src = st[key] as ReactSignal<number>;
    const hasConfig = (spring as any)?.[key];
    const signal = springStore.createSignal(src.v, key);

    useSpringSignal(
      src,
      signal,
      hasConfig ? { stiffness: cfg?.stiffness ?? 160, damping: cfg?.damping ?? 18 } : undefined
    );
    (springStore.$ as any)[key] = signal;
  };

  make('scale', spring?.scale);
  make('rotate', spring?.rotate);
  make('depth', spring?.depth);
  make('opacity', spring?.opacity);
  make('boxShadow', spring?.boxShadow);
  make('translateY', spring?.translateY);
  make('translateX', spring?.translateX);
  make('shadowColor', spring?.shadowColor);
  make('perspective', spring?.perspective);
  make('perspectiveOrigin', spring?.perspectiveOrigin);
  make('rotateY', spring?.rotateY);
  make('rotateX', spring?.rotateX);

  make('transformOrigin', spring?.transformOrigin as any);

  springStore.useComputed<HTMLDivElement>(() => {
    const el = elRef.current;
    const st = springStore.$ as any;
    if (!el) return;

    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner) return;
    const s = st.scale?.v ?? 1;
    const r = st.rotate?.v ?? 0;
    const z = st.depth?.v ?? 0;
    const o = st.opacity?.v ?? 1;
    const y = st.translateY?.v ?? 0;
    const x = st.translateX?.v ?? 0;
    const sh = st.boxShadow?.v ?? 0;

    const pAllowed = spring?.perspective?.isMobile ?? true;
    const ryAllowed = spring?.rotateY?.isMobile ?? true;
    const rxAllowed = spring?.rotateX?.isMobile ?? true;

    const p = isTouchDevice && !pAllowed ? 0 : st.perspective.v ?? 800;
    const ry = isTouchDevice && !ryAllowed ? 0 : st.rotateY.v ?? 0;
    const rx = isTouchDevice && !rxAllowed ? 0 : st.rotateX.v ?? 0;

    const po = st.perspectiveOrigin?.v ?? [50, 50];
    const colorArr = st.shadowColor?.v ?? [0, 0, 0, 0.25];

    const color = `rgba(${colorArr[0]}, ${colorArr[1]}, ${colorArr[2]}, ${colorArr[3].toFixed(2)})`;
    const origin = Array.isArray(po) ? `${po[0]}% ${po[1]}%` : typeof po === 'string' ? po : '50% 50%';

    const transformOrigin =
      typeof st.transformOrigin.v === 'string'
        ? st.transformOrigin.v
        : Array.isArray(st.transformOrigin.v)
        ? `${st.transformOrigin.v[0]}% ${st.transformOrigin.v[1]}%`
        : 'center';

    el.style.perspective = `${p}px`;
    el.style.perspectiveOrigin = origin;
    inner.style.transformStyle = st.transformStyle;
    inner.style.transformOrigin = transformOrigin;
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
    if (!isMove || isTouchDevice) return;
    if (!el || !innerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;

      const maxRotate = 12;

      st.rotateY.v = -dx * maxRotate;
      st.rotateX.v = dy * maxRotate;
      if (moveShadow) {
        const inner = innerRef.current!;
        const boxX = x;
        const boxY = y;
        inner.style.setProperty('--mouse-x', `${boxX}px`);
        inner.style.setProperty('--mouse-y', `${boxY}px`);
      }
    };

    const handleLeave = () => {
      st.rotateY.v = 0;
      st.rotateX.v = 0;
      if (moveShadow) {
        const inner = innerRef.current!;
        inner.style.setProperty('--mouse-x', `50%`);
        inner.style.setProperty('--mouse-y', `50%`);
      }
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [isTouchDevice, isMove]);

  return (
    <div
      ref={elRef}
      className={className}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onTouchStart={handleDown}
      onTouchEnd={handleUp}
    >
      <div className={classInner} ref={innerRef}>
        {children}
      </div>
    </div>
  );
}
