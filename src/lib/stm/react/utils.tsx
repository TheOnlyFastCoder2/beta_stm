import { useRef, useEffect } from 'react';
import type { ObservableState, Signal } from '../types';
import React from 'react';
import type { ReactSignalsStore, ReactStore, RefMap } from './types';

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
    return signal.v;
  });
  Signal.displayName = signal._metaPath;
  Object.defineProperty(signal, 'c', {
    value: <Signal />,
  });
}


export function defineSignalMap<T extends ReactSignalsStore<any>>(
  cbStore: () => T,
  signal: Signal<any>
) {
  const originMap = (signal as any).map;

  const newMap = (renderFn: (item: Signal<any>, index: number) => React.ReactNode) => {
    const cache = new WeakMap<Signal<any>, React.ReactElement<{ value: any }>>();

    const Component = React.memo(() => {
      const store = cbStore();
      store.useField(signal._metaPath as any);
      const _signal = store.getSignal(signal._metaPath as any);

      return originMap.call(_signal, (item: Signal<any>, i: number) => {
        const prev = cache.get(item);
        
        if (prev && prev.props.value === item) return prev;
        const SignalComponent = React.memo((_: { value: any }) => renderFn(item, i), 
          (prevProps, nextProps) => prevProps.value === nextProps.value
        );

        SignalComponent.displayName = item._metaPath;

        const element = <SignalComponent key={item._metaPath} value={item} />;
        cache.set(item, element);

        return element;
      });
    });

    return <Component />;
  };

  Object.defineProperty(signal, 'map', {
    value: newMap,
    writable: true,
    configurable: true,
  });
}
