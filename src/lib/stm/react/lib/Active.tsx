import { useState } from 'react';
import React from 'react';
import type { ReactSignal } from '../types';

interface ActiveProps<T> {
  sg: ReactSignal<T>;
  is: T;
  children: React.ReactNode;
}

export function Active<T>({ sg, is, children }: ActiveProps<T>) {
  const [val, set] = useState(false);
  sg.useComputed<any>(() => {
    is ? set(sg.v === is) : set((v) => !v);
  });
  return is ? val && children : children;
}
