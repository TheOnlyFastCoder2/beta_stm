import { useRef, type PropsWithChildren } from 'react';
import $ from './styles.module.css';
import { Draggable, type DraggableImpRef } from '../../lib/stm/react/components';

export default function DraggableTest({ children }:PropsWithChildren) {
  const ref = useRef<Partial<DraggableImpRef>>({});
  const refEl = useRef<HTMLDivElement>(null);

  ref.current.move = (x, y) => {
    if (!refEl.current) return;
    const header = refEl.current;
    header.style.left = `${x.v}px`;
    header.style.top = `${y.v}px`;
  };

  return (
    <div className={$.Draggable} ref={refEl}>
      <Draggable impRef={ref}>
        <div className={$.head}></div>
      </Draggable>
      <div className={$.container}>
        {children}
      </div>
    </div>
  );
}
