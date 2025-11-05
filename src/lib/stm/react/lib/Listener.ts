import { useState } from 'react';
import React from 'react';
import type { ReactSignal } from '../types';


interface Listener<T> {
  sg: ReactSignal<T>;
  children: () => React.ReactNode;
}

export function Listener<T>({ sg, children }: Listener<T>) {
  const [val, set] = useState<any>(undefined);
  sg.useComputed<any>(() => {
    set(children());
  });
  return val;
}