import $ from './App.module.css';
import { useSignalStore } from './lib/stm/react';
import Button from './shared/Button';
import Popup, { ViewerModalWins } from './shared/Popup';
import QueryExample from './shared/QueryExample';
import Slider from './shared/Slider';
import { TodoApp } from './shared/Todo';

function App() {
  // const { $: store } = useSignalStore({ count: 0 }); // { $: store } - это lifeHack только так шикарно работает сигнал

  return (
    <div className={$.App}>
      {/* <Button onClick={() => store.count.v++} className={$.MyButton}>
        {store.count.c}
      </Button>
      <Slider />
      <Slider />
      <QueryExample /> */}
      <TodoApp/> 
      {/* <ViewerModalWins/> */}
    </div>
  );
}

export default App;

// const { $: store } = useSignalStore({ count: 0 }); // { $: store } - это lifeHack только так шикарно работает сигнал

/*
  - Если ты просто вернёшь store напрямую: В React ререндеры не увидят изменений поля count.v, потому что React сам по себе не отслеживает обычные объекты, а сигналы — это внешняя реактивная система.
  - Поле .c (React-компонент) нужен, чтобы React «подписался» на сигнал и ререндерил кнопку.
  - Если мы делаем { $: store }, мы создаём новый объект, который React фактически воспринимает как стабильный объект со ссылкой, и потом можем обращаться к .c напрямую
*/