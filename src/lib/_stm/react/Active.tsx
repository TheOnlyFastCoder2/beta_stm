import { useState } from 'react';
import { useWatch, type TRSignal } from './react';

interface ActiveProps<T> {
  sg: TRSignal<any>;
  is?: T | T[] | ((v: T) => boolean);
  callback?: (v: boolean) => void;
  children: React.ReactNode;
}

export function Active<T>({ sg, is, children, callback }: ActiveProps<T>) {
  const [visible, setVisible] = useState(false);

  useWatch(() => {
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

    callback?.(result);
    setVisible(result);
  });

  return visible ? <>{children}</> : null;
}
