import { useSignalStore } from '../../lib/react';

export function TodoApp() {
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
          setActive={() => {
            store.activeIndex.v = i;
            store.todos.v.forEach((item, _i) => { 
              if (i === _i) return;
              item.done.q = false;
            })
          }}
        />
      ))}
      <button onClick={addTodo}>Add Todo</button>
      <button onClick={removeTodo}>remove Todo</button>
      <input type="text" onChange={ ({ currentTarget }) => {
        store.todos[store.activeIndex.v].title.v  = currentTarget.value
      }}/>
    </div>
  );
}

function TodoItem({ todo, setActive }: { todo: any; setActive: () => void }) {
  return (
    <div>
      <input
        type="checkbox"
        checked={todo.done.v}
        onChange={() => {
          todo.done.v = !todo.done.v;
          setActive();
        }}
      />
      {todo.title.c}
    </div>
  );
}
