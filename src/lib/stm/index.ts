import createObservableState from './lib/observable';
import { createQuery, type QueryInstance, type QueryOptions, type QueryState } from './lib/query';
import createStoreWithSignals from './lib/signal';
import type { Middleware, ObservableState, Signal, StoreWithSignals } from './types';

export default function stm<T extends object>(
  data: T,
  middlewares?: Middleware<T>[],
  options?: { isSignals?: false; isQuery?: false }
): ObservableState<T>;

export default function stm<T extends object>(
  data: T,
  middlewares?: Middleware<T>[],
  options?: { isSignals: true },
  defineProperty?: (signal: Signal<T>) => void
): StoreWithSignals<T>;

export default function stm<TData extends object, TParams extends object = any, PostData extends object = any>(
  data: QueryOptions<TData, TParams, PostData>,
  middlewares?: Middleware<QueryOptions<TData, TParams, PostData>>[],
  options?: { isQuery: true },
): QueryInstance<TData, TParams, PostData>;

export default function stm<T extends object>(
  data: T,
  middlewares: Middleware<T>[] = [],
  options: { isSignals?: boolean; isQuery?: boolean } = {},
  defineProperty?: (signal: Signal<T>) => void
) {
  if (options.isSignals) {
    return createStoreWithSignals(data, middlewares, defineProperty);
  }

  if (options.isQuery) {
    return createQuery(data as any, middlewares as any);
  }

  return createObservableState(data, middlewares);
}