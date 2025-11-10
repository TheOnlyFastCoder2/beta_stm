import { memo, useRef } from 'react';
import { useSignal, useSignalMap, useWatch, type TRMapSignal, type TRSignal } from '../../lib/_stm/react/react';

interface Todo {
  title: string;
  done: boolean;
  id: string;
}
export function TodoApp() {
  const refInput = useRef<HTMLInputElement>(null);
  const activeIndex = useSignal(0);
  const todos = useSignalMap<Todo[]>([]);

  const createTask = (name = `New Task ${todos.length}`) => {
    return { id: `${performance.now()}`, title: name, done: false };
  };
  const addTodo = () => {
    todos.push(createTask());
  };

  const removeTodo = () => {
    todos.pop();
  };

  const reverseTodos = () => {
    todos.reverse();
  };
  console.log(3232);
  return (
    <div>
      <h3>Todos</h3>

      <button onClick={addTodo}>Добавить задачу</button>
      <button onClick={removeTodo}>Удалить задачу</button>
      <button onClick={reverseTodos}>reverse задачу</button>

      {todos.map((todo, index: number) => {
        return (
          <TodoItem
            key={todo.id.v}
            todo={todo}
            remove={() => {
              todos.splice(index, 1);
            }}
            replace={() => {
              todos.splice(index, 1, createTask('sdfsdfsdfsdf'));
            }}
            setActive={() => {
              activeIndex.v = index;
              todos.forEach((item, _i) => {
                if (index === _i) return;
                item.done.v = false;
              });
            }}
          />
        );
      })}
      <input
        ref={refInput}
        type="text"
        onChange={({ currentTarget }) => {
          todos.v[activeIndex.v].title.v = currentTarget.value;
        }}
      />
    </div>
  );
}

interface TodoItemProps {
  todo: { title: TRMapSignal<string>; done: TRMapSignal<boolean> };
  setActive: () => void;
  remove: () => void;
  replace: () => void;
}

const TodoItem = memo(({ todo, setActive, remove, replace }: TodoItemProps) => {
  const refInput = useRef<HTMLInputElement>(null);
  const myDiv = useRef<HTMLDivElement>(null);

  useWatch(() => {
    if (!refInput.current) return;
    if (!myDiv.current) return;
    refInput.current.checked = todo.done.v;
    myDiv.current.style.background = todo.done.v ? 'red' : 'green';
  });
  return (
    <div ref={myDiv}>
      <h4>{todo.title.c}</h4>
      <input
        ref={refInput}
        type="checkbox"
        checked={todo.done.v}
        onChange={() => {
          todo.done.v = !todo.done.v;
          setActive();
        }}
      />
      <button onClick={remove}>удалить</button>
      <button onClick={replace}>заменить</button>
    </div>
  );
});
