import $ from './App.module.css';
import { useSignalStore } from './lib/stm/react';
import Button from './shared/Button';
import Draggable from './shared/Draggable';
import Popup, { ViewerModalWins } from './shared/Popup';
import QueryExample from './shared/QueryExample';
import Slider from './shared/Slider';
import { TodoApp } from './shared/Todo';

function App() {
  const store = useSignalStore({ count: 0 }); 
  return (
    <div className={ $.App }>
      <Slider />
      <Button onClick={ () => { 
        store.$.count.v++
      } } className={$.MyButton}>
        {store.$.count.c}
      </Button>
    </div>
  );
}

export default App;
