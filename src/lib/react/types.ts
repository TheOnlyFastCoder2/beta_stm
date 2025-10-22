import type { Accessor, CacheKey, ExtractPathReturn, Signal, StoreWithSignals } from '../stm/types';

export type useStoreReturn<T extends object, P extends readonly Accessor<T>[]> = {
  [K in keyof P]: ExtractPathReturn<T, P[K]>;
};

export type ReactSignal<E> = Signal<E, R<any>>
export type R<T extends object> = { c: React.JSX.Element, useComputed: ReactStore<T>['useComputed'] };

export interface ReactStore<T extends object> {
  useStore<const P extends readonly Accessor<T>[]>(
    paths: P,
    options?: { cacheKeys?: CacheKey<T>[] }
  ): useStoreReturn<T, P>;

  useEffect<const P extends readonly Accessor<T>[]>(
    paths: P | CacheKey<T>[],
    callback: (values: useStoreReturn<T, P>) => void
  ): void;

  useField<const P extends Accessor<T>>(
    paths: P,
    options?: { cacheKeys?: CacheKey<T>[] }
  ): [ExtractPathReturn<T, P>, (value: ExtractPathReturn<T, P>) => void];

  useComputed<R>(fn: (el: React.RefObject<R>) => void): React.RefObject<R>;
}


export interface ReactSignalsStore<T extends object> extends ReactStore<T>, StoreWithSignals<T, R<T>> {
  useSignal<const P extends Accessor<T>, E = ExtractPathReturn<T, P>>(paths: P): ReactSignal<E>;
}
