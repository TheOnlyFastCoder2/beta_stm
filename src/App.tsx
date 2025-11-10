import { useRef } from 'react';
import $ from './App.module.css';
import { effect, signal } from './lib/_stm';
import { useComputed, useWatch, useSignal } from './lib/_stm/react/react';
import Popup, { ViewerModalWins } from './shared/Popup';
import { SpringButton } from './shared/SpringButton';
import Switcher from './shared/Switcher';
import { AwaitBlock } from './shared/AwaitBlock';
import { TodoApp } from './shared/Todo';

function App() {
  const count = useSignal(0);
  const doubled = useComputed(() => count.v * 2);
  const ref = useRef(doubled)
  ref.current = doubled;
  useWatch(() => {
    console.log('doubled =', count.v);
  });
  return (
    <div className={$.App}>
      {/* <h1>Count: {count.c}</h1>
      <h2>Doubled: {doubled.c}</h2>
      <button
        onClick={() => {
          ++count.v;

        }}
      >
        +
      </button> */}
    
      {/* <SpringButton/> */ }
      {/* <AwaitBlock name='pikachu'/> */}
      <TodoApp/>
    </div>
  );
}

export default App;
