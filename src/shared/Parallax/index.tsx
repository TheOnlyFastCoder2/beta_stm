import type { PropsWithChildren } from 'react';
import $ from './styles.module.css';
import React, { useEffect, useRef } from 'react';
import { useSignalStore } from '../../lib/stm/react';


interface Props {
  children: React.ReactElement<typeof Parallax.Item> | React.ReactElement<typeof Parallax.Item>[];
}
export default function Parallax({ children }: Props) {
  const count = React.Children.count(children);

  return (
    <div className={$.Parallax} style={{ height: `${count * 100}vh` }}>
      {React.Children.map(children, (child, index) => (
        <div className={$.section} key={index}>
          {child}
        </div>
      ))}
    </div>
  );
}

Parallax.Item = function ParallaxItem({ children }: PropsWithChildren) {
  return <div className={$.section}>{children}</div>;
};

export function Container() {
  return (
    <div className={$.container}>
      <div className={$.div}>div1</div>

      <Parallax>
        {['Первый экран', 'Второй экран', 'Третий экран'].map((name) => {
          return (
            <FadeIn duration={3000} enterAt={[[0.3, 0.6]]} debug>
              <Parallax.Item>{name}</Parallax.Item>
            </FadeIn>
          );
        })}
      </Parallax>

      <div className={ $.div }>div2</div>
    </div>
  );
}


export function FadeIn({
  children,
  enterAt = [[0, 1]],
  exitAt = [[Infinity, Infinity]],
  duration = 300,
  debug = false,
}: {
  children: React.ReactNode;
  enterAt?: [number, number][];
  exitAt?: [number, number][];
  duration?: number;
  debug?: boolean;
}) {
  const st = useVisibilitySignal<HTMLDivElement>({
    enterAt: enterAt,
    exitAt: exitAt,
    debug,
  });

  st.ratio.useComputed(() => {
   const opacity = st.visible.v ? Math.min(1, st.ratio.v * 1.5) : Math.max(0, st.ratio.v * 0.8);
    const el = st.ref.current;
    if (!el) return;

    el.style.opacity = opacity.toString();
    el.style.width = '100%';
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = st.visible.v ? '1' : '0';
    el.style.transform = `translateY(${(1 - opacity) * 20}px)`;
  });

  return <div ref={st.ref}>{children}</div>;
}
type Range = [number, number];
type RangeList = Range[];

export function useVisibilitySignal<T extends HTMLElement>({
  enterAt = [[0, 1]],
  exitAt = [[Infinity, Infinity]],
  once = false,
  debug = false,
}: {
  enterAt?: RangeList;
  exitAt?: RangeList;
  once?: boolean;
  debug?: boolean;
}) {
  const { $: st } = useSignalStore({
    visible: false,
    ratio: 0,
  });

  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !debug) return;

    let overlay: HTMLDivElement | null = null;
    let timeoutId: any;

    const drawOverlay = () => {
      document.querySelectorAll('.debug-overlay').forEach((o) => o.remove());

      const vh = window.innerHeight;
      overlay = document.createElement('div');
      overlay.className = 'debug-overlay';
      overlay.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
      font-size: 11px;
      font-family: monospace;
      color: #fff;
      text-shadow: 0 0 3px rgba(0,0,0,0.8);
      mix-blend-mode: difference;
    `;

      const makeLine = (y: number, color: string, label: string) => {
        if (!isFinite(y)) return;
        const line = document.createElement('div');
        line.style.position = 'absolute';
        line.style.left = '0';
        line.style.width = '100%';
        line.style.height = '1px';
        line.style.top = `${y * vh}px`;
        line.style.background = color;

        const text = document.createElement('div');
        text.style.position = 'absolute';
        text.style.left = '4px';
        text.style.top = `${y * vh}px`;
        text.style.color = color;
        text.textContent = label;

        overlay!.appendChild(line);
        overlay!.appendChild(text);
      };

      enterAt.forEach(([start, end], i) => {
        makeLine(start, 'rgba(0,255,0,0.7)', `enter[${i}] start=${start}`);
        makeLine(end, 'rgba(0,255,0,0.4)', `enter[${i}] end=${end}`);
      });
      exitAt.forEach(([start, end], i) => {
        makeLine(start, 'rgba(255,0,0,0.7)', `exit[${i}] start=${start}`);
        makeLine(end, 'rgba(255,0,0,0.4)', `exit[${i}] end=${end}`);
      });

      document.body.appendChild(overlay);
    };

    timeoutId = setTimeout(() => {
      drawOverlay();
    }, 500);

    const handleResize = () => {
      if (overlay) overlay.remove();
      drawOverlay();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      if (overlay) overlay.remove();
    };
  }, [enterAt, exitAt, debug]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      const topRatio = (rect.top + rect.height / 2) / vh;
      const bottomRatio = (rect.bottom - rect.height / 2) / vh;

      const visiblePart = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
      st.ratio.v = Math.min(1, visiblePart / rect.height);

      const inEnterZone = enterAt.some(([a, b]) => {
        const start = Math.max(a, b);
        const end = Math.min(a, b);
        return topRatio <= start && topRatio > end;
      });
      const hasExit = exitAt.some(([s, e]) => isFinite(s) && isFinite(e));

      const inExitZone =
        hasExit &&
        exitAt.some(([a, b]) => {
          const start = Math.max(a, b);
          const end = Math.min(a, b);
          return bottomRatio <= start && bottomRatio > end;
        });
      const isVisible = inEnterZone && !inExitZone;
      st.visible.v = isVisible;

      if (once && !isVisible) window.removeEventListener('scroll', onScroll);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [enterAt, exitAt, once, debug]);

  return {
    ref,
    visible: st.visible,
    ratio: st.ratio,
  };
}
