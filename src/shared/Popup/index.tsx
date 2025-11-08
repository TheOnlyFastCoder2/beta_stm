import { useImperativeHandle, useRef, type PropsWithChildren } from 'react';
import { useSignalStore } from '../../lib/stm/react';
import $ from './styles.module.css';

import DraggableTest from '../Draggable';
import { Active } from '../../lib/stm/react/lib/Active';
import { Spring } from '../../lib/stm/react/lib/animation/Spring';

interface ImpRef {
  toOpen: () => void;
  toClose: () => void;
}

interface Props extends PropsWithChildren {
  impRef: React.RefObject<Partial<ImpRef>>;
  mode?: 'overlay' | 'normal';
  delay?: number;
}

export default function Popup({ impRef, delay = 100, children, mode = 'normal' }: Props) {
  const refPopup = useRef<HTMLDivElement>(null);
  const { $: st } = useSignalStore({
    isOpen: false,
    timeId: -1,
    isAnimation: false,
  });

  useImperativeHandle(impRef, () => ({
    toOpen: () => (st.isAnimation.v = st.isOpen.v = true),
    toClose: () => {
      if (!!~st.timeId.v) return;
      st.isAnimation.v = false;
      st.timeId.v = setTimeout(() => {
        st.isAnimation.v = true;
        st.timeId.v = -1;
        st.isOpen.v = false;
      }, delay);
    },
  }));

  const handleClickOverlay = () => {
    st.isAnimation.v = true;
    impRef.current.toClose?.();
  };

  return (
    <Active sg={st.isOpen} is={true}>
      <Spring
        isActive={st.isAnimation}
        spring={{
          translateY: {
            values: { default: 100, active: 0 }, 
            stiffness: 100,
            damping: 12,
          },
          opacity: {
            values: { default: 0, active: 1 },
            stiffness: 120,
            damping: 10,
          },
          scale: {
            values: { default: 0.0, active: 1 },
            stiffness: 140,
            damping: 2,
          },
        }}
      >
        <div onClick={handleClickOverlay} className={`${$.Popup} ${$[mode]}`} ref={refPopup}>
          <div onClick={(e) => e.stopPropagation()} className={$.content} children={children} />
        </div>
      </Spring>
    </Active>
  );
}

export function ViewerModalWins() {
  const ref = useRef<Partial<ImpRef>>({});
  const { $: st } = useSignalStore({
    type: 'Modal1',
  });

  return (
    <div className={$.Viewer}>
      <div className={$.header}>
        <button onClick={() => ref.current?.toOpen?.()}>toOpen</button>
        <button onClick={() => ref.current?.toClose?.()}>toClose</button>

        <button onClick={() => (st.type.v = 'Modal1')}>Modal1</button>
        <button onClick={() => (st.type.v = 'Modal2')}>Modal2</button>
      </div>

      <Popup impRef={ref} mode="normal" delay={130}>
        <DraggableTest>
          <Active sg={st.type} is={'Modal1'}>
            <Modal1 />
          </Active>
          <Active sg={st.type} is={'Modal2'}>
            <Modal2 />
          </Active>
        </DraggableTest>
      </Popup>
    </div>
  );
}

function Modal1() {
  return (
    <div>
      <p>тут какой то текст для</p>
      <h1>Modal1</h1>
    </div>
  );
}

function Modal2() {
  return (
    <div>
      <p>тут какой то текст для</p>
      <h1>Modal2</h1>
    </div>
  );
}
