import createObservableState from './observable';
import type { Accessor, Middleware, ObservableState } from '../types';

export interface QueryOptions<TData extends object, TParams extends object = any, PostData extends object = any> {
  key: (params?: TParams) => string | string[];
  fetcher: (params?: TParams, postData?: PostData) => Promise<TData>;
  initialData?: TData;
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (error: unknown) => void;
}

export interface QueryState<TData> {
  data: TData | undefined;
  error: unknown | null;
  updatedAt: number | null;

  isLoading: boolean;
  isFetching: boolean;
  isStale: boolean;
}

export interface LocalState<TData extends object, PostData extends object = any> {
  current: QueryState<TData>;
  cacheKey: string | null;
  version: number;
  postData: PostData | undefined;
  onSuccessCb?: (data: TData) => void;
  onErrorCb?: (error:unknown) => void;
}

export interface QueryInstance<TData extends object, TParams extends object = any, PostData extends object = any>
  extends ObservableState<LocalState<TData, PostData>> {
  fetch: (params?: TParams, postData?: PostData) => Promise<TData>;
  refetch: () => Promise<TData>;
  invalidate: () => void;
  setParams(params?: TParams): void;
  setPostData(data: PostData, params?: TParams): Promise<TData | void>;
  addOnSuccess: (cb: (data:TData) => void) => void;
  addOnError: (cb: (error:unknown) => void) => void;
  destroy: () => void;
}

export function createQuery<TData extends object, TParams extends object = any, PostData extends object = any>(
  options: QueryOptions<TData, TParams, PostData>,
  middlewares: Middleware<LocalState<TData, PostData>>[] = []
): QueryInstance<TData, TParams, PostData> {
  const { key, fetcher, initialData, staleTime = 0, enabled = true, onSuccess, onError } = options;
  const cacheKey = getQueryKey(key());
  const store = createObservableState<LocalState<TData, PostData>>(
    {
      current: {
        data: initialData,
        error: null,
        isLoading: !!enabled,
        isFetching: false,
        isStale: false,
        updatedAt: null,
      },
      cacheKey: cacheKey,
      version: 0,
      postData: undefined,
      onSuccessCb: undefined,
    },
    middlewares
  );

  function getQueryKey(key: string | string[]): string {
    return Array.isArray(key) ? key.join('.') : key;
  }

  let timer: ReturnType<typeof setTimeout> | null = null;

  async function setParams(params?: TParams) {
    const newCacheKey = getQueryKey(key(params));
    const cacheKey = store.get(($) => $.cacheKey);
    const version = store.get(($) => $.version);
    const postData = store.get(($) => $.postData);
    if (!enabled) return;
    if (version < 1) return await runFetch(params, postData);
    if (cacheKey !== newCacheKey) return await runFetch(params, postData);
    invalidate();
  }

  async function setPostData(newData: PostData, params?: TParams): Promise<TData | void> {
    const path = store.resolvePath(($) => $.postData);
    const oldData = store.get(path as any);
    if (!store.shouldSkipValueUpdate(oldData, newData, path).bool) {
      return await runFetch(params, newData);
    }
  }
  function addCallback(cb: Function, accessor: Accessor<LocalState<TData>>) {
    store.update.quiet(accessor, () => {
      return () => cb;
    });
  }
  function addOnSuccess(cb: (data: TData) => void) {
    addCallback(cb, (s) => s.onSuccessCb);
  }
  
  function addOnError(cb: (error:unknown) => void) {
    addCallback(cb, (s) => s.onErrorCb);
  }

  async function runFetch(params?: TParams, postData?: PostData): Promise<TData> {
    store.update.quiet(
      (s) => s.version,
      (v) => v + 1
    );
    store.update.quiet(
      (s) => s.postData,
      () => postData
    );

    store.update(
      (s) => s.current,
      (state) => {
        state.isFetching = true;
        state.isLoading = !state.data;
        return state;
      }
    );
    const onSuccessCb = store.get(($) => $.onSuccessCb);
    const onErrorCb = store.get(($) => $.onErrorCb);
    try {
      const data = await fetcher(params, postData);

      store.update(
        (s) => s.current,
        (state) => {
          state.data = data;
          state.error = null;
          state.isFetching = false;
          state.isLoading = false;
          state.isStale = false;
          state.updatedAt = Date.now();
          return state;
        }
      );
      // console.log(data)
      // запланировать устаревание
      if (staleTime > 0) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
          invalidate();
          if (enabled) {
            try {
              await runFetch();
            } catch (_) {}
          }
        }, staleTime);
      }

      onSuccess?.(data);
      onSuccessCb?.(data);

      return data;
    } catch (err) {
      store.update(
        (s) => s.current,
        (state) => {
          state.error = err;
          state.isFetching = false;
          state.isLoading = false;
          return state;
        }
      );
      onError?.(err);
      onErrorCb?.(err);
      console.log(3434)
      throw err;
    }
  }

  function invalidate() {
    store.update(
      (s) => s.current,
      (state) => {
        state.isStale = true;
        return state;
      }
    );
  }

  function destroy() {
    if (timer) clearTimeout(timer);
  }

  const api: QueryInstance<TData, TParams, PostData> = {
    ...store,
    fetch: runFetch,
    refetch: () => runFetch(),
    invalidate,
    destroy,
    setParams,
    setPostData,
    addOnSuccess,
    addOnError,
  };

  return api;
}
