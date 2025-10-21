import { useSignalStore } from '../../lib/react';
import $ from './styles.module.css';

function getPointerEvent(e: MouseEvent | TouchEvent) {
  if ('touches' in e) {
    return e.touches[0]; // берем первый палец
  }
  return e; // MouseEvent уже имеет clientX/clientY
}

export default function Slider() {
  const { $: store, useComputed } = useSignalStore({
    percent: 0,
    prevPercent: 0,
  });

  const ref = useComputed<HTMLDivElement>(({ current: el }) => {
    el.style.width = `${store.percent.v}%`;
  });

  const startDrag = (startEvent: MouseEvent | TouchEvent, track: HTMLDivElement) => {
    const startPointer = getPointerEvent(startEvent);
    const startX = startPointer.clientX;
    const startPercent = store.percent.v;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault();
      const pointer = getPointerEvent(moveEvent);
      const deltaX = pointer.clientX - startX;
      const trackWidth = track.offsetWidth;
      const deltaPercent = (deltaX / trackWidth) * 100;
      store.percent.v = Math.min(100, Math.max(0, startPercent + deltaPercent));
    };

    const onEnd = () => {
      store.prevPercent.v = store.percent.v;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    document.body.style.cursor = 'grabbing';
  };

  const onGrabberDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const track: HTMLDivElement = e.currentTarget.closest(`.${$.track}`)!;
    startDrag(e.nativeEvent, track);
  };

  return (
    <div className={$.Slider}>
      <div className={$.track}>
        <div className={$.indicator} ref={ref}>
          <div
            className={$.grabber}
            onMouseDown={onGrabberDown}
            onTouchStart={onGrabberDown}
          />
        </div>
      </div>
    </div>
  );
}