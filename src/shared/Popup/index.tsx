import {useImperativeHandle, useRef, type PropsWithChildren } from 'react';
import { useSignalStore } from '../../lib/stm/react';
import $ from './styles.module.css';

import DraggableTest from '../Draggable';
import { Active } from '../../lib/stm/react/lib/Active';

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
  });

  useImperativeHandle(impRef, () => ({
    toOpen: () => (st.isOpen.v = true),
    toClose: () => {
      if (!!~st.timeId.v) return;
      refPopup.current?.classList.add?.($.remove);
      st.timeId.v = setTimeout(() => {
        refPopup.current?.classList.remove?.($.remove);
        st.timeId.v = -1;
        st.isOpen.v = false;
      }, delay);
    },
  }));

  const handleClickOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.classList.add($.remove);
    impRef.current.toClose?.();
  };

  return (
    <Active sg={st.isOpen} is={true}>
      <div onClick={handleClickOverlay} className={`${$.Popup} ${$[mode]}`} ref={refPopup}>
        <div onClick={(e) => e.stopPropagation()} className={$.content} children={children} />
      </div>
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

      <Popup impRef={ref} mode="normal" delay={500}>
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
