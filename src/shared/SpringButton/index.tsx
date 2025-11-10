import { useSignalStore } from '../../lib/stm/react';
import { Spring } from '../../lib/stm/react/lib/animation/Spring';
import type { ReactSignal } from '../../lib/stm/react/types';
import $ from './styles.module.css';

export function SpringButton({ children }: { children: React.ReactNode }) {
  const { $: store } = useSignalStore({
    box: false,
  });

  return (
    <div className={$.wrap}>
      {/* <Spring
        isActive={ store.box }
        
        spring={{
          scale: {
            values: {
              default: 1,
              active: 0,
              up: 1.2,
            },
            stiffness: 80,
            damping: 4,
          },
          translateY: {
            values: { default: 0, active: -80 },
             stiffness: 400,
            damping: 20,
          },
          opacity: {
            values: {
              default: 0.8,
              active: 0,
              up: 1,
            },
            stiffness: 120,
            damping: 8,
          },
        }}
      >
        <div className={$.pulseBox} />
      </Spring> */}

      <Spring
        isMove
        triggers={{ hover: true, down: true, up: true }}
        spring={{
          scale: {
            values: { down: 0.9, up: 1, enter: 1.05, leave: 1 },
            stiffness: 180,
            damping: 15,
          },
          rotate: {
            values: { down: -5, up: 0, enter: 3, leave: 0 },
            stiffness: 150,
            damping: 18,
          },
          boxShadow: {
            values: { down: 2, up: 6, enter: 10, leave: 4 },
          },
        }}
        phases={['down', 'up']}
        onToggle={ () => {

          store.box.v = !store.box.v;
        }}
      >
        <button className={$.SpringButton}>{23}</button>
      </Spring>
    </div>
  );
}
