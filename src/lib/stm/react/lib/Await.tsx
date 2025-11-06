import React, { useImperativeHandle, useRef } from 'react';
import { useSignalStore } from '..';
import { Active } from './Active';
import type { ReactSignal } from '../types';
import createObservableState from '../../lib/observable';

interface GlobalStore {
  subscribes: Array<{
    params: any;
    reset: AwaitHandle['reset'];
    run: AwaitHandle['run'];
  }>;
}

const global = createObservableState<GlobalStore>({
  subscribes: [],
});

export function useAwaitRef<T>() {
  const ref = useRef<AwaitHandle<T>>(null);
  return {
    ref,
    get run() { return ref.current?.run!; },
    get reset() { return ref.current?.reset!; },
    get status() { return ref.current?.status!; },
    get value() { return ref.current?.value!; },
    get error() { return ref.current?.error!; },
  };
}

export const AwaitGlobal = {
  get: (selector: (s: GlobalStore) => any) => global.get(selector),

  update: (selector: (s: GlobalStore) => any, updater: (value: any) => any) => global.update(selector, updater),

  invalidate: (matchParams?: any, newParams?: any) => {
    const subs = global.get(($) => $.subscribes);

    for (const sub of subs) {
      const subParams = sub.params;
      if (!matchParams) {
        sub.run(newParams ?? sub.params);
        continue;
      }

      const matches = Array.isArray(subParams)
        ? Array.isArray(matchParams)
          ? JSON.stringify(subParams) === JSON.stringify(matchParams)
          : subParams.includes(matchParams)
        : typeof subParams === 'object' && typeof matchParams === 'object'
        ? Object.entries(matchParams).every(([k, v]) => subParams[k] === v)
        : subParams === matchParams;

      if (matches) {
        sub.run(newParams ?? sub.params);
      }
    }
  },
};

export interface AwaitHandle<T = any> {
  run: (...args: any[]) => Promise<T>;
  reset: () => void;
  status: ReactSignal<'idle' | 'pending' | 'fulfilled' | 'rejected'>;
  value: ReactSignal<T | null>;
  error: ReactSignal<any>;
}

interface AwaitProps<T> {
  from: (params?: any) => () => Promise<T>;
  params?: any;
  cacheTime?: number;
  children: React.ReactNode;
  ref?: React.Ref<AwaitHandle<T>>;
  isOptimistic?: boolean;
}

function AwaitBase<T>({ from, params, cacheTime = 5 * 60 * 1000, children, ref, isOptimistic = false }: AwaitProps<T>) {
  const { $: st } = useSignalStore({
    status: 'idle' as 'idle' | 'pending' | 'fulfilled' | 'rejected',
    value: null as any,
    error: null as any,
    isRefreshing: false,
  });

  const cacheRef = React.useRef(new Map<string, { data: any; ts: number }>());
  const getCacheKey = (p: any) => JSON.stringify(p ?? {});

  const run = React.useCallback(
    async (p = params) => {
      const key = getCacheKey(p);
      const now = performance.now();

      const cached = cacheRef.current.get(key);
      if (cached && now - cached.ts < cacheTime) {
        st.value.v = cached.data;
        st.status.v = 'fulfilled';
        return cached.data;
      }

      st.isRefreshing.v = !!st.value.v;
      st.status.v = 'pending';
      st.error.v = null;

      try {
        const fn = Array.isArray(p) ? from(...p) : from(p);
        const data = await fn();
        cacheRef.current.set(key, { data, ts: performance.now() });
        st.value.v = data;
        st.status.v = 'fulfilled';
        return data;
      } catch (err) {
        st.error.v = err;
        st.status.v = 'rejected';
        throw err;
      } finally {
        st.isRefreshing.v = false;
      }
    },
    [from, params, cacheTime]
  );

  const reset = React.useCallback(() => {
    st.status.v = 'idle';
    st.value.v = null;
    st.error.v = null;
  }, []);

  React.useEffect(() => {
    global.update(
      ($) => $.subscribes,
      (subs) => {
        const next = subs.filter((s) => JSON.stringify(s.params) !== JSON.stringify(params));
        next.push({ params, reset, run });
        return next;
      }
    );

    return () => {
      global.update(
        ($) => $.subscribes,
        (subs) => subs.filter((s) => JSON.stringify(s.params) !== JSON.stringify(params))
      );
    };
  }, [params, run, reset]);

  useImperativeHandle(ref, () => ({
    run,
    reset,
    status: st.status,
    value: st.value,
    error: st.error,
  }));

  React.useEffect(() => {
    if (params !== undefined) run(params);
  }, [params, run]);

  return (
    <>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? React.cloneElement(child, { st, isOptimistic } as any) : child
      )}
    </>
  );
}

AwaitBase.displayName = 'Await';

const Pending = ({ st, children, isOptimistic }: { st?: any; children: React.ReactNode; isOptimistic?: boolean }) => {
  const [refreshing, setRefreshing] = React.useState(st?.isRefreshing.v);
  st?.isRefreshing.useComputed(() => setRefreshing(st.isRefreshing.v));
  if (refreshing && isOptimistic) return null;
  return (
    <Active sg={st!.status} is="pending">
      {children}
    </Active>
  );
};

const Then = <T,>({ st, children }: { st?: any; children: (v: T) => React.ReactNode }) => {
  const [val, setVal] = React.useState<T | null>(st?.value.v);
  st?.value.useComputed(() => setVal(st.value.v));
  return st?.status.v === 'fulfilled' && val ? <>{children(val)}</> : null;
};

const Catch = ({ st, children }: { st?: any; children: (e: any) => React.ReactNode }) => {
  const [err, setErr] = React.useState<any>(st?.error.v);
  st?.error.useComputed(() => setErr(st.error.v));
  return st?.status.v === 'rejected' && err ? <>{children(err)}</> : null;
};

export const Await = Object.assign(AwaitBase, {
  Pending,
  Then,
  Catch,
});
