import React, { useEffect, useRef, useState } from 'react';
import { useSignalMap, useWatch } from '../../lib/_stm/react/react';
import type { SignalMap } from '../../lib/_stm';
import { useSignal } from '../../lib/stm/react';

export function TodoApp() {
  const activeIndex = useSignal(0);
  const todos = useSignalMap([
    { title: 'Learn React', done: false },
    { title: 'Learn TypeScript', done: false },
  ]);

  const addTodo = () => {
    const newTodo = { title: 'New Task', done: false };
    todos.push(newTodo);
  };

  const removeTodo = () => {
    todos.pop();
  };

  return (
    <div>
      <h3>Todos</h3>

      {/* Кнопки для добавления и удаления задач */}
      <button onClick={addTodo}>Добавить задачу</button>
      <button onClick={removeTodo}>Удалить задачу</button>

      {/* Используем компонент TodoItem для рендеринга задач */}
      {todos.map((todo: any, index: number) => (
        <TodoItem
          key={index}
          todo={todo}
          setActive={() => {
            activeIndex.v = index;
            todos.forEach((item, _i) => {
              if (index === _i) return;
              item.done.v = false;
            });
          }}
        />
      ))}
    </div>
  );
}

interface TodoItemProps {
  todo: { title: { v: string }; done: { v: boolean } };
  setActive: () => void;
}

function TodoItem({ todo, setActive }: TodoItemProps) {
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
      <h4>{todo.title.v}</h4>
      <input
        ref={refInput}
        type="checkbox"
        checked={todo.done.v}
        onChange={() => {
          todo.done.v = !todo.done.v;
          setActive();
        }}
      />
    </div>
  );
}
