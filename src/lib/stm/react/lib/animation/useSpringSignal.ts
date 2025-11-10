
import { useWatch, type Sig, type TRSignal } from '../../../../_stm/react/react';

export default function useSpringSignal(
  source: TRSignal<any>,
  signal: TRSignal<any>,
  { stiffness = 170, damping = 26, precision = 0.001 } = {}
) {
  let velocity: number | number[] = 0;
  let rafId: number | null = null;

  const isArray = (v: any): v is number[] => Array.isArray(v);
  const clone = (v: any) => (isArray(v) ? [...v] : v);

  const step = (dt: number) => {
    const from = signal.v;
    const to = source.v;

    // ---- массив ----
    if (isArray(from) && isArray(to)) {
      const n = Math.min(from.length, to.length);
      if (!isArray(velocity)) velocity = new Array(n).fill(0);
      let stillMoving = false;
      const next = [...from];

      for (let i = 0; i < n; i++) {
        const disp = to[i] - from[i];
        const acc = stiffness * disp - damping * (velocity[i] ?? 0);
        velocity[i] += acc * dt;
        next[i] += velocity[i] * dt;
        if (Math.abs(disp) > precision || Math.abs(velocity[i]) > precision) stillMoving = true;
        else velocity[i] = 0;
      }

      signal.v = next;
      if (stillMoving) rafId = requestAnimationFrame(() => step(1 / 60));
      else signal.v = clone(to);
      return;
    }

    // ---- число ----
    if (typeof from === 'number' && typeof to === 'number') {
      const disp = to - from;
      const acc = stiffness * disp - damping * (velocity as number);
      velocity = (velocity as number) + acc * dt;
      const next = from + (velocity as number) * dt;
      signal.v = next;

      if (Math.abs(disp) > precision || Math.abs(velocity as number) > precision)
        rafId = requestAnimationFrame(() => step(1 / 60));
      else {
        signal.v = to;
        velocity = 0;
      }
      return;
    }

    // fallback
    signal.v = clone(to);
  };

  useWatch(() => {
    source.v;
    cancelAnimationFrame(rafId!);
    rafId = requestAnimationFrame(() => step(1 / 60));
    return () => rafId && cancelAnimationFrame(rafId);
  });

  return signal;
}
