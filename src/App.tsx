import $ from './App.module.css';
import { useSignalStore } from './lib/stm/react';
import { AwaitBlock } from './shared/AwaitBlock';
import Button from './shared/Button';
import Draggable from './shared/Draggable';
import Popup, { ViewerModalWins } from './shared/Popup';
import QueryExample from './shared/QueryExample';
import Slider from './shared/Slider';
import Switcher from './shared/Switcher';
import { TodoApp } from './shared/Todo';

function App() {
  const store = useSignalStore({ count: 0 }); 
  return (
    <div className={ $.App }>
      <Slider />
      <Button onClick={() => store.$.count.v++} className={$.MyButton}>
        {store.$.count.c}
      </Button>
      {/* <QueryExample /> */}
      <TodoApp />
      {/* <ViewerModalWins /> */}
      {/* <Draggable/> */ }
      <Switcher />
      <AwaitBlock name="pikachu"/>
    </div>
  );
}

export default App;
