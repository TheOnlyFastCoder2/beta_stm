import { useEffect, useImperativeHandle, useRef, type PropsWithChildren } from 'react';
import { useSignalStore } from '../../lib/stm/react';
import $ from './styles.module.css';

import DraggableTest from '../Draggable';

import { Spring } from '../../lib/stm/react/lib/animation/Spring';
import { useSignal } from '../../lib/_stm/react/react';
import { Active } from '../../lib/_stm/react/Active';

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
  const isOpen = useSignal(false);
  const timeId = useSignal(-1);
  const isAnimation = useSignal(false);

  useImperativeHandle(impRef, () => ({
    toOpen: () => {
      isAnimation.v = isOpen.v = true;
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
    },
    toClose: () => {
      if (!!~timeId.v) return;
      isAnimation.v = false;
      timeId.v = setTimeout(() => {
        isAnimation.v = true;
        timeId.v = -1;
        isOpen.v = false;
      }, delay);
    },
  }));

  const handleClickOverlay = () => {
    isAnimation.v = true;
    impRef.current.toClose?.();
  };

  return (
    <Active sg={isOpen} is={true}>
      <div onClick={handleClickOverlay} className={`${$.Popup} ${$[mode]}`} ref={refPopup}>
        <div onClick={(e) => e.stopPropagation()} className={$.content} children={children} />
      </div>
    </Active>
  );
}

export function ViewerModalWins() {
  const ref = useRef<Partial<ImpRef>>({});
  const type = useSignal('Modal1');

  useEffect(() => {
    ref.current?.toOpen?.();
  }, []);
  return (
    <div className={$.Viewer}>
      <div className={$.header}>
        <button onClick={() => ref.current?.toOpen?.()}>toOpen</button>
        <button onClick={() => ref.current?.toClose?.()}>toClose</button>

        <button onClick={() => (type.v = 'Modal1')}>Modal1</button>
        <button onClick={() => (type.v = 'Modal2')}>Modal2</button>
      </div>

      <Popup impRef={ref} mode="normal" delay={130}>
        <DraggableTest>
          <Active sg={type} is={'Modal1'}>
            <Modal1 />
          </Active>
          <Active sg={type} is={'Modal2'}>
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
      <Spring
        className={$.spring}
        visibility={{
          enterAt: [[0.42, 0.9]],
          eventName: 'viewport-move',
          debug: true,
        }}
        spring={{
          opacity: { values: { default: 0, active: 1 }, stiffness: 100, damping: 20 },
          scale: { values: { default: 0, active: 1 }, stiffness: 140, damping: 20 },
        }}
      >
        <h1>Modal1</h1>
      </Spring>
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
