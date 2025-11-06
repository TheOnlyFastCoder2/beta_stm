import React from 'react';
import type { ReactSignal } from '../types';

interface ActiveProps<T> {
  sg: ReactSignal<T>;
  is?: T | T[] | ((v: T) => boolean);
  callback?: (v:boolean) => void;
  children: React.ReactNode;
}

export function Active<T>({ sg, is, children, callback }: ActiveProps<T>) {
  const [visible, setVisible] = React.useState(false);

  sg.useComputed(() => {
    const val = sg.v;
    let result = false;

    if (is === undefined) {
      result = !visible;
    } else if (typeof is === 'function') {
      result = (is as any)(val);
    } else if (Array.isArray(is)) {
      result = is.includes(val as any);
    } else {
      result = val === is;
    }

    callback?.(result)
    setVisible(result);
  });

  return visible ? <>{children}</> : null;
}
