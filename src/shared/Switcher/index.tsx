import { useSignalStore } from '../../lib/stm/react';
import { Switch } from '../../lib/stm/react/lib/Switch';
import $ from './styles.module.css';

export default function Switcher() {
  // создаём стор сигналов
  const { $: store } = useSignalStore({
    mode: 'list' as string,
  });

  return (
    <div className={$.Switcher}>
      {/* --- Переключатель режима --- */}
      <div className={$.controls}>
        <button onClick={() => (store.mode.v = 'list')}>List</button>
        <button onClick={() => (store.mode.v = 'grid')}>Grid</button>
        <button onClick={() => (store.mode.v = 'gallery')}>Gallery</button>
        <button onClick={() => (store.mode.v = 'admin-panel')}>
          Admin
        </button>
        <button onClick={() => (store.mode.v = 'unknown')}>
          Unknown
        </button>
      </div>
       {/* { isShow = 'lol1' && (MyComponent) }
          { isShow = 'lol2' && (MyComponent) }
          { isShow = 'lol1'&& (MyComponent) } */}
      <Switch sg={store.mode}>
        <Switch.Case is="list">
          <div className={$.view}>📃 List view</div>
        </Switch.Case>

        <Switch.Case is={['grid', 'gallery']}>
          <div className={$.view}>🔲 Grid / Gallery view</div>
        </Switch.Case>

        <Switch.Case is={(v:string) => v.startsWith('adm')}>
          <div className={$.view}>🛠 Admin view</div>
        </Switch.Case>

        <Switch.Default>
          <div className={$.view}>❓ Unknown mode</div>
        </Switch.Default>
      </Switch>
    </div>
  );
}

