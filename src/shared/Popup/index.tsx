import { useImperativeHandle, useRef, type PropsWithChildren } from 'react';
import { useSignalStore } from '../../lib/stm/react';
import $ from './styles.module.css';
import { Active } from '../../lib/stm/react/components';
import DraggableTest from '../Draggable';

interface ImpRef {
  toOpen: () => void;
  toClose: () => void;
}

interface Props extends PropsWithChildren {
  impRef: React.RefObject<Partial<ImpRef>>;
}

export default function Popup({ impRef, children }: Props) {
  const { $: st } = useSignalStore({
    isOpen: false,
  });

  const ref = st.useComputed<HTMLDivElement>(({ current: el }) => {
    el.style.display = !st.isOpen.v ? 'none' : 'block';
  });

  useImperativeHandle(impRef, () => ({
    toOpen: () => (st.isOpen.v = true),
    toClose: () => (st.isOpen.v = false),
  }));

  return (
    <div className={$.Popup} ref={ref}>
      <div className={$.content}>{children}</div>
    </div>
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

      <Popup impRef={ref}>
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
