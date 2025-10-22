import { useRef } from 'react';
import { useSignalStore } from '../../lib/stm/react';
import type { ReactSignal } from '../../lib/stm/react/types';

export function TodoApp() {
  const refInput = useRef<HTMLInputElement>(null);
  const { $: store } = useSignalStore({
    activeIndex: 0,
    todos: [
      { title: 'Learn STM', done: false },
      { title: 'Learn React', done: false },
    ],
  });

  const addTodo = () => {
    store.todos.push({ title: 'New task', done: false });
    // console.log(store.todos)
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
          setActive={ () => {
            const input = refInput.current;
            if(input) input.value = todo.title.v
            store.activeIndex.v = i;
            store.todos.v.forEach((item, _i) => {
              if (i === _i) return;
              item.done.q = false;
            });
          }}
        />
      ))}
      <button onClick={addTodo}>Add Todo</button>
      <button onClick={removeTodo}>remove Todo</button>
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
}: {
  todo: ReactSignal<{
    title: string;
    done: boolean;
  }>;
  setActive: () => void;
}) {
  const ref = todo.useComputed<HTMLInputElement, {myDiv:HTMLDialogElement}>(({ current: el, myDiv }) => {
    el.checked = todo.done.v;
    myDiv.style.background = todo.done.v ? 'red' : 'green'
  });
  return (
    <div ref={ref.get('myDiv')}>
      <input
        ref={ref}
        type="checkbox"
        onChange={() => {
          todo.done.v = !todo.done.v;
          setActive();
        }}
      />
      {todo.title.c}
    </div>
  );
}
