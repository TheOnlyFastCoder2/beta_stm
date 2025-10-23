import { useRef, useEffect } from 'react';
import type { ObservableState, Signal } from '../types';
import React from 'react';
import type { ReactStore, RefMap } from './types';

export function cr_useComputed<T extends ObservableState<any>>(cbStore: () => T) {
  function useComputed<MainEl extends HTMLElement, ExtraRefs extends Record<string, HTMLElement> = {}>(
    fn: (refs: RefMap<MainEl> & ExtraRefs) => void
  ): RefMap<MainEl> & ExtraRefs {
    const mainRef = useRef<MainEl>(null);
    const extraRefs = useRef<Record<string, React.RefObject<any>>>({});

    const get = (key: string) => {
      return (extraRefs.current[key] ??= { current: null });
    };

    function mergeRefs() {
      const mergedRefs = {} as any;
      mergedRefs.get = get;
      mergedRefs.current = mainRef.current;
      for (const key in extraRefs.current) {
        mergedRefs[key] = extraRefs.current[key].current;
      }

      return mergedRefs;
    }

    useEffect(() => {
      const store = cbStore();
      const reaction = store.computed(() => {
        const mergedRefs = mergeRefs();
        fn(mergedRefs);
      });
      return () => {
        reaction.destroy();
      };
    }, []);

    (mainRef as any).get = get;
    return mainRef as RefMap<MainEl> & ExtraRefs;
  }

  return useComputed;
}
export function defineSignalComponent<T extends ReactStore<any>>(cbStore: () => T, signal: Signal<any>) {
  if ('c' in signal) return;
  const Signal = React.memo(() => {
    cbStore().useField(signal._metaPath as any);
    console.log(signal.v);
    return signal.v;
  });
  Signal.displayName = signal._metaPath;
  Object.defineProperty(signal, 'c', {
    value: <Signal />,
  });
}

export function defineSignalMap<T extends ReactStore<any>>(cbStore: () => T, signal: Signal<any>) {
  const originMap = (signal as any).map;
  const newMap = (renderFn: (item: Signal<T>, index: number) => React.ReactNode) => {
    const cache = new Map();
    const Component = React.memo(() => {
      cbStore().useField(signal._metaPath as any);
      return originMap.call(signal, (item: Signal<T>, i: number) => {
        const prev = cache.get(item._metaPath);

        if (prev?.props?.value === item.v) return prev;

        const SignalComponent = React.memo((_: { value: any }) => renderFn(item, i));
        SignalComponent.displayName = item._metaPath;
        const element = <SignalComponent key={i} value={item.v} />;
        cache.set(item._metaPath, element);
        return element;
      });
    });
    return <Component />;
  };
  Object.defineProperty(signal, 'map', {
    value: newMap,
  });
}
