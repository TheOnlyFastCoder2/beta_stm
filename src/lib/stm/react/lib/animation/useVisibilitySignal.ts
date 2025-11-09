import { useRef, useEffect } from 'react';
import { useSignalStore } from '../..';

type Range = [number, number];
type RangeList = Range[];

let globalOverlay: HTMLDivElement | null = null;
let globalEnterLines: HTMLElement[] = [];
let globalExitLines: HTMLElement[] = [];

function ensureOverlay(enterAt: RangeList, exitAt: RangeList, debug: boolean) {
  // создать отдельный overlay для каждого вызова
  const overlay = document.createElement('div');
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
    opacity: ${debug ? 1 : 0};
    visibility: ${debug ? 'visible' : 'hidden'};
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(overlay);

  const styleEl = document.createElement('style');
  overlay.appendChild(styleEl);

  const makeLine = (y: number, color: string, label: string) => {
    const line = document.createElement('div');
    line.className = 'debug-line';
    line.dataset.label = label;
    line.style.cssText = `
      position: absolute;
      left: 0;
      width: 100%;
      height: 1px;
      top: ${(y * 100).toFixed(2)}%;
      background: ${color};
      color: ${color};
      opacity: ${debug ? 1 : 0};
      visibility: ${debug ? 'visible' : 'hidden'};
      transition: opacity 0.3s ease;
    `;
    const beforeRule = `
      .debug-line[data-label="${label}"]::before {
        content: "${label}";
        position: absolute;
        left: 8px;
        top: -14px;
        font-size: 11px;
        color: ${color};
        opacity: ${debug ? 1 : 0};
        transition: opacity 0.3s ease;
      }
    `;
    styleEl.appendChild(document.createTextNode(beforeRule));
    overlay.appendChild(line);
    return line;
  };

  const enterLines = enterAt.flatMap(([start, end], i) => [
    makeLine(start, 'rgba(0,255,0,0.7)', `enter[${i}] start=${start}`),
    makeLine(end, 'rgba(0,255,0,0.4)', `enter[${i}] end=${end}`),
  ]);

  const exitLines = exitAt.flatMap(([start, end], i) => [
    makeLine(start, 'rgba(255,0,0,0.7)', `exit[${i}] start=${start}`),
    makeLine(end, 'rgba(255,0,0,0.4)', `exit[${i}] end=${end}`),
  ]);

  return { overlay, enterLines, exitLines };
}


export default function useVisibilitySignal<T extends HTMLElement>(
  {
    enterAt = [[0, 1]],
    exitAt = [[Infinity, Infinity]],
    debug = false,
    isTop = false,
    isCenter = false,
    isBottom = false,
    watchNext = -1,
    eventName,
    delay = 0,
  }: {
    delay?: number;
    eventName?: string;
    enterAt?: RangeList;
    exitAt?: RangeList;
    debug?: boolean;
    isTop?: boolean;
    isCenter?: boolean;
    isBottom?: boolean;
    watchNext?: number;
  },
  externalRef?: React.RefObject<HTMLElement | null>
) {
  const { $: st } = useSignalStore({
    visible: false,
    ratio: 0,
    overlap: 0,
  });

  const ref = externalRef ?? useRef<T | null>(null);
  function init() {
    const el = ref.current;
    if (!el) return () => {};

    const { enterLines, exitLines } = ensureOverlay(enterAt, exitAt, debug);

    let next: HTMLElement | null = null;
    if (!!~watchNext) {
      let parent: HTMLElement | null = el;
      for (let i = 0; i < watchNext && parent; i++) {
        parent = parent.parentElement;
      }
      next = parent?.nextElementSibling as HTMLElement | null;
    }

    const getViewportHeight = () => document.documentElement.clientHeight || window.innerHeight;

    // перед onScroll() добавим вспомогательные переменные:
    let showTimeout: number | null = null;
    let isCurrentlyVisible = false;

    // и обновим handleScroll (вместо прежнего onScroll)
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = getViewportHeight();
      const height = rect.height || 1;

      const visiblePart = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
      st.ratio.v = Math.min(1, visiblePart / height);

      if (next) {
        const nextRect = next.getBoundingClientRect();
        const overlapPx = Math.max(0, rect.bottom - nextRect.top);
        const overlapRatio = Math.min(1, Math.max(0, overlapPx / height));
        st.overlap.v = overlapRatio;
      } else {
        st.overlap.v = 0;
      }

      const anchor = isTop ? 'top' : isBottom ? 'bottom' : 'center';
      const anchorPos = anchor === 'top' ? rect.top : anchor === 'bottom' ? rect.bottom : rect.top + height / 2;
      const anchorRatio = anchorPos / vh;

      const getRange = (lines: HTMLElement[]) => {
        if (!lines.length) return [0, 0];
        const ratios = lines.map((l) => l.getBoundingClientRect().top / vh);
        return [Math.min(...ratios), Math.max(...ratios)];
      };

      const [enterMin, enterMax] = getRange(enterLines);
      const [exitMin, exitMax] = getRange(exitLines);
      const inEnterZone = anchorRatio >= enterMin && anchorRatio <= enterMax;
      const inExitZone = anchorRatio >= exitMin && anchorRatio <= exitMax;

      const shouldBeVisible = inEnterZone && !inExitZone;

      // 👇 Логика задержки появления
      if (shouldBeVisible && !isCurrentlyVisible) {
        // только если впервые стал видимым
        if (showTimeout) clearTimeout(showTimeout);
        showTimeout = window.setTimeout(() => {
          st.visible.v = true;
          isCurrentlyVisible = true;
        }, delay || 150);
      } else if (!shouldBeVisible && isCurrentlyVisible) {
        // исчезновение — сразу
        if (showTimeout) clearTimeout(showTimeout);
        st.visible.v = false;
        isCurrentlyVisible = false;
      }
    };

    if (eventName) {
      window.addEventListener(eventName, onScroll);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('orientationchange', onScroll);

    onScroll();
    return () => {
      window.removeEventListener('viewport-move', onScroll);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('orientationchange', onScroll);
      if (eventName) {
        window.removeEventListener(eventName, onScroll);
      }
    };
  }
  useEffect(() => {
    return init();
  }, [enterAt, exitAt, isTop, isCenter, isBottom, watchNext, debug]);

  return {
    ref,
    visible: st.visible,
    ratio: st.ratio,
    overlap: st.overlap,
  };
}
