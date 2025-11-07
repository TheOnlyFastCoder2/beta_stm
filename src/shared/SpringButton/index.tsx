import { useSignalStore } from '../../lib/stm/react';
import type { ReactSignal } from '../../lib/stm/react/types';
import $ from './styles.module.css';

export function SpringButton({ children }: { children: React.ReactNode }) {
  // --- состояние ---
  const { $: st } = useSignalStore({
    pressed: false,
    hover: false,
    targetScale: 1,
    targetRotate: 0,
    targetDepth: 4,
    boxScale: 1, // для квадрата
  });

  // --- реакции ---
  const handleDown = () => {
    st.targetScale.v = 0.9;
    st.targetRotate.v = -5;
    st.targetDepth.v = 2;
    st.boxScale.v = 0; 
  };

  const handleUp = () => {
    st.targetScale.v = 1;
    st.targetRotate.v = 0;
    st.targetDepth.v = 6;
    st.boxScale.v = 1;
  };

  const handleEnter = () => {
    st.targetScale.v = 1.05;
    st.targetRotate.v = 3;
    st.targetDepth.v = 8;
  };

  const handleLeave = () => {
    st.targetScale.v = 1;
    st.targetRotate.v = 0;
    st.targetDepth.v = 4;
  };


  const springScale = useSpringSignal(st.targetScale, { stiffness: 180, damping: 15 });
  const springRotate = useSpringSignal(st.targetRotate, { stiffness: 120, damping: 12 });
  const springDepth = useSpringSignal(st.targetDepth, { stiffness: 160, damping: 20 });
  const springBox = useSpringSignal(st.boxScale, { stiffness: 80, damping: 4});


  const btnRef = springScale.useComputed<HTMLButtonElement>(({ current: btn }) => {
    const s = springScale.v;
    const r = springRotate.v;
    const z = springDepth.v;
    btn.style.transform = `scale(${s}) rotate(${r}deg)`;
    btn.style.boxShadow = `0 ${z}px ${z * 3}px rgba(0,0,0,${0.25 + z / 40})`;
  });


  const boxRef = springBox.useComputed<HTMLDivElement>(({ current: box }) => {
    const s = springBox.v;
    box.style.transform = `scale(${s})`;
    box.style.opacity = (s / 1.5).toFixed(2);
  });

  return (
    <div className={$.wrap}>
      <div ref={boxRef} className={$.pulseBox} />
      <button
        ref={btnRef}
        className={$.SpringButton}
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </button>
    </div>
  );
}

export function useSpringSignal(source: ReactSignal<any>, { stiffness = 170, damping = 26, precision = 0.001 } = {}) {
  const { $: spring } = useSignalStore({
    curr: source.v,
  });

  let velocity = 0;
  let rafId: number | null = null;

  const step = (dt: number) => {
    const displacement = source.v - spring.curr.v;
    const springForce = stiffness * displacement;
    const dampingForce = damping * velocity;
    const acceleration = (springForce - dampingForce) / 1;

    velocity += acceleration * dt;
    spring.curr.v += velocity * dt;
    if (Math.abs(displacement) > precision || Math.abs(velocity) > precision) {
      rafId = requestAnimationFrame(() => step(1 / 60));
    } else {
      spring.curr.v = source.v;
      velocity = 0;
    }
  };

  source.useComputed(() => {
    source.v;
    cancelAnimationFrame(rafId!);
    rafId = requestAnimationFrame(() => step(1 / 60));
    return () => {
      rafId && cancelAnimationFrame(rafId);
    };
  });

  return spring.curr;
}
