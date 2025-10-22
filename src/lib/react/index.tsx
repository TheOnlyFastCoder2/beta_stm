import { memo, useEffect, useLayoutEffect, useRef, useSyncExternalStore, type PropsWithChildren } from 'react';
import type { Accessor, CacheKey, Middleware, ObservableState, Signal, StoreWithSignals } from '../stm/types';
import type { ReactSignal, ReactSignalsStore, ReactStore, useStoreReturn } from './types';

import React from 'react';
import stm from '../stm';
import type { LocalState, QueryInstance, QueryOptions, QueryState } from '../stm/lib/query';

export default function createReactStore<T extends object>(
  data: T,
  middlewares?: Middleware<T>[],
  options?: { isSignals?: false; isQuery?: false }
): ObservableState<T> & Omit<ReactStore<T>, 'useSignal'>;

export default function createReactStore<T extends object>(
  data: T,
  middlewares?: Middleware<T>[],
  options?: { isSignals: true; isQuery?: false },
  defineProperty?: (signal: Signal<T>) => void
): ReactSignalsStore<T> & ReactStore<T>;

export default function createReactStore<T extends object, TParams extends object>(
  data: QueryOptions<T, TParams>,
  middlewares?: Middleware<QueryOptions<T, TParams>>[],
  options?: { isQuery: true; isSignals?: false }
): QueryInstance<T, TParams> & ReactStore<T>;

export default function createReactStore<T extends object, TParams extends object>(
  data: T | QueryOptions<T, TParams>,
  middlewares: Middleware<T | QueryOptions<T, TParams>>[] = [],
  options: { isSignals?: boolean; isQuery?: boolean } = {},
  defineProperty?: (signal: Signal<T>) => void
): ObservableState<T> | StoreWithSignals<T> | (QueryInstance<T, TParams> & ReactStore<T>) {
  const store: ObservableState<T> & ReactSignalsStore<T> & ReactStore<T> = stm(
    data,
    middlewares,
    options as any,
    defineProperty as any
  ) as any;

  const getSnapshotValues = <P extends readonly Accessor<T>[]>(cacheKeys: CacheKey<T>[]): useStoreReturn<T, P> => {
    return cacheKeys.map((p) => store.get(p as any)) as useStoreReturn<T, P>;
  };

  store.useStore = <P extends readonly Accessor<T>[]>(paths: P, options: { cacheKeys?: CacheKey<T>[] }) => {
    const cacheKeys = [...paths, ...(options?.cacheKeys ?? [])];
    const snapshotRef = useRef<useStoreReturn<T, P>>(getSnapshotValues(cacheKeys));

    const getSnapshot = () => snapshotRef.current;
    const subscribe = (onChange: () => void) => {
      return store.subscribe(() => {
        snapshotRef.current = getSnapshotValues(cacheKeys);
        onChange();
      }, cacheKeys);
    };

    return useSyncExternalStore(subscribe, getSnapshot);
  };

  store.useEffect = (cacheKeys = [], callback: Function) => {
    const snapshotRef = useRef<any>(getSnapshotValues(cacheKeys as any));

    useEffect(() => {
      if (!cacheKeys.length) return;
      callback?.(snapshotRef.current);
      return store.subscribe(() => {
        snapshotRef.current = getSnapshotValues(cacheKeys as any);
        callback?.(snapshotRef.current);
      }, cacheKeys as any);
    }, []);
  };

  store.useComputed = (fn: Function) => {
    const ref = useRef<any>(null);
    useEffect(() => {
      const res = store.computed(() => {
        fn(ref);
      });
      return () => {
        res.destroy();
      };
    }, []);
    return ref;
  };

  store.useField = (path, options) => {
    const [value] = store.useStore([path], options);
    const setValue = function (valueOrFunc: any) {
      store.update(path, valueOrFunc);
    };
    setValue.quiet = (valueOrFunc: any) => {
      store.update(path, valueOrFunc, { quiet: true });
    };
    return [value, setValue];
  };

  if (options.isSignals) {
    store.useSignal = (accessor) => {
      const signal = store.getSignal(accessor) as any;

      if (!('c' in signal)) {
        const Signal = React.memo(() => {
          store.useField(accessor);
          return signal.v;
        });
        Signal.displayName = signal._metaPath;
        Object.defineProperty(signal, 'c', {
          value: <Signal />,
        });
      }

      return signal as any;
    };
  }

  return store;
}

interface createQueryInstance<
  LocalState extends object,
  T extends object,
  TParams extends object,
  PostData extends object = any
> extends QueryInstance<LocalState, TParams, PostData>,
    ReactStore<LocalState> {
  useQuery: (params?: TParams) => QueryState<T>;
}

export function createQueryReact<TData extends object, TParams extends object = any, PostData extends object = any>(
  data: QueryOptions<TData, TParams, PostData>,
  middlewares?: Middleware<QueryOptions<TData, TParams, PostData>>[]
): createQueryInstance<LocalState<TData>, TData, TParams, PostData> {
  const store = createReactStore(data as any, middlewares as any, { isQuery: true }) as any as createQueryInstance<
    LocalState<TData>,
    TData,
    TParams,
    PostData
  >;

  store.useQuery = (params) => {
    const [values] = store.useField(($) => $.current);
    useEffect(() => {
      store.setParams(params);
    }, []);

    return values;
  };

  return store;
}

export function createSignal<T extends object>(
  data: T,
  middlewares: Middleware<T>[] = [],
  defineProperty?: (signal: Signal<T>) => void
): ReactSignalsStore<T> & ReactStore<T> {
  const store: ReactSignalsStore<T> & ReactStore<T> = createReactStore(
    data,
    middlewares,
    { isSignals: true },
    defineProperty
  ) as any;
  return store;
}

export function useSignalStore<T extends object>(initialData: T): ReactSignalsStore<T> & ReactStore<T> {
  const ref = useRef<(ReactSignalsStore<T> & ReactStore<T>) | null>(null);

  if (!ref.current) {
    const store = createSignal(initialData, [], (signal) => {
      if (signal.v === null || typeof signal.v !== 'object') {
        if (!('c' in signal)) {
          const Signal = React.memo(() => {
            store.useField(signal._metaPath as any);
            return <>{signal.v}</>;
          });
          Signal.displayName = signal._metaPath;
          Object.defineProperty(signal, 'c', {
            value: <Signal />,
          });
        }
      }
      if (!('useComputed' in signal)) {
        Object.defineProperty(signal, 'useComputed', {
          value: (fn: Function) => {
            const ref = useRef<any>(null);
            useEffect(() => {
              const res = store.computed(() => {
                fn(ref);
              });
              return () => {
                res.destroy();
              };
            }, []);
            return ref;
          },
        });
      }
      if (Array.isArray(signal.v)) {
        const originMap = (signal as any).map;

        // console.log(originMap) // тут он есть
        Object.defineProperty(signal, 'map', {
          value: (renderFn: (item: Signal<any>, i: number) => React.ReactNode) => {
            const componentCache = new Map<string, React.ReactElement>();

            const Component = React.memo(() => {
              store.useField(signal._metaPath as any);
              return originMap.call(signal, (item: Signal<any>, i: number) => {
                const prev = componentCache.get(item._metaPath);

                if (prev && (prev.props as any).value === item.v) {
                  return prev;
                }

                const SignalComponent = React.memo((_: { value: any }) => {
                  // store.useField(item._metaPath as any);
                  return renderFn(item, i) as any;
                });

                SignalComponent.displayName = item._metaPath;
                const element = <SignalComponent key={i} value={item.v} />;
                componentCache.set(item._metaPath, element);
                return element;
              });
            });
            return <Component />;
          },
        });
      }
    });
    ref.current = store;
  }

  useLayoutEffect(() => {
    ref.current?.destroy?.();
    ref.current = null;
  }, []);

  return ref.current;
}
