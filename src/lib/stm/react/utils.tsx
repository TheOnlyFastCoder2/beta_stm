import { useRef, useEffect } from 'react';
import type { ObservableState, Signal } from '../types';
import React from 'react';
import type { ReactSignalsStore, ReactStore, RefMap } from './types';

export function cr_useComputed<T extends ObservableState<any>>(cbStore: () => T) {
  function useComputed<
    MainEl extends HTMLElement,
    ExtraRefs extends Record<string, HTMLElement> = {},
  >(
    fn: (refs: RefMap<MainEl> & ExtraRefs) => void
  ): RefMap<MainEl> & ExtraRefs & { get: (key: string) => React.RefObject<any> } {
    const extraRefs = useRef<Record<string, React.RefObject<any>>>({});

    const get = (key: string) => {
      return (extraRefs.current[key] ??= { current: null });
    };

    const mainRef = React.useMemo(() => {
      const o: any = { current: null };
      o.get = get;
      return o as RefMap<MainEl> & ExtraRefs & { get: (key: string) => React.RefObject<any> };
    }, []);

    function mergeRefs() {
      const merged: any = { current: mainRef.current };
      for (const k in extraRefs.current) merged[k] = extraRefs.current[k].current;
      return merged;
    }

    useEffect(() => {
      const store = cbStore();
      const reaction = store.computed(() => {
        fn(mergeRefs());
      });
      return () => reaction.destroy();
    }, []);

    return mainRef;
  }

  return useComputed;
}

export function defineSignalComponent<T extends ReactStore<any>>(
  cbStore: () => T,
  signal: Signal<any>
) {
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

  const newMap = (renderFn: (item: Signal<any>, index: number) => React.ReactNode, isListen: boolean = false) => {
    const cache = new Map<string, React.ReactElement<{ value: any }>>();

    const Component = React.memo(() => {
      const store = cbStore();
      store.useField(signal._metaPath as any);
      const _signal = store.getSignal(signal._metaPath as any);

      return originMap.call(_signal, (item: Signal<any>, i: number) => {
        if (!item) return null;
        const prev = cache.get(item._metaPath);

        if (prev && prev.props.value === item) return prev;
        const SignalComponent = React.memo((_: { value: Signal<any> }) => {
          isListen && store.useField(item._metaPath as any);
          return renderFn(item, i);
        });

        SignalComponent.displayName = item._metaPath;

        const element = <SignalComponent key={item._metaPath} value={item} />;
        cache.set(item._metaPath, element);

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
