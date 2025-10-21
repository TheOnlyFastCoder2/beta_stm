import $ from './App.module.css';
import { useSignalStore } from './lib/react';
import Button from './shared/Button';

function App() {
  const { $: store } = useSignalStore({ count: 0 });

  return (
    <div className={$.App}>
      <Button onClick={() => store.count.v++} className={$.MyButton}>
        {store.count.c}
      </Button>
      <Slider />
      <Slider />
    </div>
  );
}

function Slider() {
  const { $: store, useComputed } = useSignalStore({
    percent: 0,
    prevPercent: 0,
  });

  const ref = useComputed<HTMLDivElement>(({ current: el }) => {
    el.style.width = `${store.percent.v}%`;
  });

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const startX = e.clientX;
    const startPercent = store.percent.v;
    const track: HTMLDivElement = e.currentTarget.closest(`.${$.track}`)!;

    const onMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const trackWidth = track.offsetWidth;
      const deltaPercent = (deltaX / trackWidth) * 100;
      const newPercent = Math.min(100, Math.max(0, startPercent + deltaPercent));
      store.percent.v = newPercent;
      document.body.style.cursor = 'grabbing';
    };

    const onUp = () => {
      store.prevPercent.v = store.percent.v;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <>
      <div className={$.Progress}>
        <div className={$.track}>
          <div className={$.indicator} ref={ref}>
            <div className={$.grabber} onMouseDown={onMouseDown} />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
