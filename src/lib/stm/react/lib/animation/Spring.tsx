import React, { useEffect } from 'react';
import { useSignalStore } from '../..';
import { useSpringSignal } from '../../../../../shared/SpringButton';
import type { ReactSignal } from '../../types';

type SpringPhase = 'enter' | 'leave' | 'down' | 'up' | 'default' | 'active';

type SpringPropConfig = {
  values?: Partial<Record<SpringPhase, number>>;
  stiffness?: number;
  damping?: number;
};

interface SpringProps {
  children: React.ReactNode;
  isActive?: ReactSignal<boolean>;
  triggers?: {
    hover?: boolean;
    enter?: boolean;
    leave?: boolean;
    up?: boolean;
    down?: boolean;
  };
  phases?: SpringPhase[];
  onToggle?: (v?: boolean) => void;
  spring?: {
    scale?: SpringPropConfig;
    rotate?: SpringPropConfig;
    depth?: SpringPropConfig;
    opacity?: SpringPropConfig;
    translateY?: SpringPropConfig;
    translateX?: SpringPropConfig;
    boxShadow?: SpringPropConfig;
  };
}

const initConfig = {
  scale: 1,
  rotate: 0,
  depth: 4,
  opacity: 1,
  boxShadow: 4,
  translateY: 0,
  translateX: 0,
  isPressed: false,
};

export function Spring({ children, phases, spring, isActive, triggers, onToggle }: SpringProps) {
  const { $: st } = useSignalStore({
    scale: spring?.scale?.values?.default ?? initConfig.scale,
    rotate: spring?.rotate?.values?.default ?? initConfig.rotate,
    depth: spring?.depth?.values?.default ?? initConfig.depth,
    opacity: spring?.opacity?.values?.default ?? initConfig.opacity,
    boxShadow: spring?.boxShadow?.values?.default ?? initConfig.boxShadow,
    translateY: spring?.translateY?.values?.default ?? initConfig.translateY,
    translateX: spring?.translateX?.values?.default ?? initConfig.translateX,
    isPressed: false,
  });

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

  isActive?.useComputed(() => {
    setPhase(isActive.v ? 'active' : 'default');
  });

  const signals: Record<string, ReactSignal<number>> = {};

  const make = (key: keyof typeof st, cfg?: SpringPropConfig): ReactSignal<number> | undefined => {
    const src = st[key] as ReactSignal<number>;
    return (spring as any)?.[key]
      ? (useSpringSignal(src, {
          stiffness: cfg?.stiffness ?? 160,
          damping: cfg?.damping ?? 18,
        }) as any)
      : undefined;
  };

  signals.scale = make('scale', spring?.scale)!;
  signals.rotate = make('rotate', spring?.rotate)!;
  signals.depth = make('depth', spring?.depth)!;
  signals.opacity = make('opacity', spring?.opacity)!;
  signals.boxShadow = make('boxShadow', spring?.boxShadow)!;
  signals.translateY = make('translateY', spring?.translateY)!;
  signals.translateX = make('translateX', spring?.translateX)!;

  const mainSignal =
    signals.scale ||
    signals.rotate ||
    signals.depth ||
    signals.opacity ||
    signals.boxShadow ||
    signals.translateY ||
    signals.translateX;

  const ref = mainSignal?.useComputed<HTMLDivElement>?.(({ current: el }) => {
    if (!el) return;

    const s = signals.scale?.v ?? 1;
    const r = signals.rotate?.v ?? 0;
    const z = signals.depth?.v ?? 0;
    const o = signals.opacity?.v ?? 1;
    const y = signals.translateY?.v ?? 0;
    const x = signals.translateX?.v ?? 0;
    const sh = signals.boxShadow?.v ?? 0;

    el.style.transform = `
      scale(${s})
      rotate(${r}deg)
      translate(${x}px, ${y}px)
    `;
    el.style.opacity = o.toFixed(2);
    el.style.boxShadow = `0 ${z + sh}px ${(z + sh) * 3}px rgba(0,0,0,${0.25 + (z + sh) / 40})`;
  });

  return (
    <div ref={ref} onMouseDown={handleDown} onMouseUp={handleUp} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
    </div>
  );
}
