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
  options?: { isQuery: true }
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

// const store = stm({
//   todos: [
//     { title: 'Learn STM', done: false },
//     { title: 'Learn React', done: false },
//     { title: 'Learn LOL', done: false },
//   ],
// });

// store.get(($) => $.todos).forEach((_, index) => {
//   store.computed(() => {
//     store.get(($, t) => $.todos[t(index)]);
//   })
// })
  
// store.update(
//   ($) => $.todos,
//   (state) => {
//     state.splice(1, 1);
//     return state;
//   }
// );


  
// store.update(
//   ($) => $.todos,
//   (state) => {
//     state.unshift();
//     return state;
//   }
// );

// console.log(store.getInfo())
// // console.log(store.get(($) => $.todos));

