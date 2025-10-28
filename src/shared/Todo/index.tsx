import { useRef } from 'react';
import { useSignalStore } from '../../lib/stm/react';
import type { ReactSignal } from '../../lib/stm/react/types';

import $ from './styles.module.css';

export function TodoApp() {
  const refInput = useRef<HTMLInputElement>(null);
  const { $: store } = useSignalStore({
    activeIndex: 0,
    todos: [
      { title: 'Learn STM', done: false },
      { title: 'Learn React', done: false },
      { title: 'Learn lOL', done: false },
    ],
  });

  const addTodo = () => {
    store.todos.push({ title: 'New task', done: false });
  };

  const removeTodo = () => {
    store.todos.pop();
  };
  return (
    <div>
      <h1>Todos</h1>
      {store.todos.map((todo, i) => (
        <TodoItem
          key={i}

          todo={todo}
          remove={() => {
            store.todos.splice(i, 1);
            // store.todos.reverse()
          }}
          setActive={() => {
            const input = refInput.current;
            if (input) input.value = todo.title.v;
            store.activeIndex.v = i;
            store.todos.forEach((item, _i) => {
              if (i === _i) return;
              item.done.v = false;
            });
          }}
        />
      ))}
      <button onClick={addTodo}>Add Todo</button>
      <button onClick={removeTodo}>remove Todo</button>
      <button onClick={store.todos.reverse}>reverse Todo</button>
      <input
        ref={refInput}
        type="text"
        onChange={({ currentTarget }) => {
          store.todos[store.activeIndex.v].title.v = currentTarget.value;
        }}
      />
    </div>
  );
}

function TodoItem({
  todo,
  setActive,
  remove,
}: {
  todo: ReactSignal<{
    title: string;
    done: boolean;
  }>;
  setActive: () => void;
  remove: () => void;
}) {
  const ref = todo.useComputed<HTMLInputElement, { myDiv: HTMLDialogElement }>(({ current: el, myDiv }) => {
    el.checked = todo.done.v;
    myDiv.style.background = todo.done.v ? 'red' : 'green';
  });

  return (
    <div ref={ref.get('myDiv')} className={$.TodoItem}>
      <input
        ref={ref}
        type="checkbox"
        onChange={() => {
          todo.done.v = !todo.done.v;
          setActive();
        }}
      />
      {todo.title.c}
      <button onClick={remove}>remove</button>
    </div>
  );
}
