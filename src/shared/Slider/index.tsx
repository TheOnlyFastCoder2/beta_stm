import { useRef } from 'react';
import { useSignalStore } from '../../lib/stm/react';
import { Draggable, type DraggableImpRef } from '../../lib/stm/react/components';
import $ from './styles.module.css';

export default function Slider() {
  const { $: store, useComputed } = useSignalStore({
    percent: 0,
  });

  const trackRef = useRef<HTMLDivElement>(null);
  const grabberRef = useRef<Partial<DraggableImpRef>>({});


  const indicatorRef = useComputed<HTMLDivElement>(({ current: el }) => {
    if (!trackRef.current) return;
    const trackWidth = trackRef.current.offsetWidth;
    const x = (store.percent.v / 100) * trackWidth;
    grabberRef.current.startX = x;
    el.style.width = `${store.percent.v}%`;
  });


  grabberRef.current.move = (x) => {
    if (!trackRef.current) return;
    const trackWidth = trackRef.current.offsetWidth;
    const clampedX = Math.max(0, Math.min(trackWidth, x.v));
    store.percent.v = +((clampedX / trackWidth) * 100).toFixed(0);
  };

  return (
    <div className={$.Slider}>
      <h1>{store.percent.c}%</h1>
      <div className={$.track} ref={trackRef}>
        <div className={$.indicator} ref={indicatorRef}>
          <Draggable impRef={grabberRef}>
            <div className={$.grabber} />
          </Draggable>
        </div>
      </div>
    </div>
  );
}
