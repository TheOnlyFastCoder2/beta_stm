import type {
  CoreUpdate,
  MetaData,
  Middleware,
  ObservableState,
  PathSubscribers,
  Subscribes,
  UnSubscribe,
} from '../types';

import {
  calculateSnapshotHash,
  getMetaData,
  getPath,
  getValue,
  initializeValue,
  notifyBatchInvalidate,
  notifyInvalidate,
  setMetaData,
  setValue,
  withMetaSupport,
  resolveValue,
} from '../utils';

export default function createObservableState<T extends object>(
  data: T,
  middlewares: Middleware<T>[] = []
): ObservableState<T> {
  const store: ObservableState<T> = {} as any;
  const subscribers: Subscribes = new Set();
  const pathSubscribers: PathSubscribers = new Map();

  const primitiveMetaMap = new Map<string, MetaData>();
  let metaMap = new WeakMap<object, MetaData>();

  let batchDepth = 0;
  let batchedPaths = new Set<string>();

  initializeValue(data, metaMap, primitiveMetaMap);

  function shouldSkipValueUpdate(oldVal: any, newVal: any, path: string) {
    let skipUpdate = false;
    const isSupported = withMetaSupport(newVal, () => {
      const meta = getMetaData(metaMap, oldVal, primitiveMetaMap, path);
      const prevSig = meta?._prevSignature;
      const currentSig = calculateSnapshotHash(newVal);

      if (prevSig === currentSig) {
        skipUpdate = true;
        return true;
      }
      if (currentSig) {
        setMetaData(metaMap, newVal, { _prevSignature: currentSig }, primitiveMetaMap, path);
      }
      return true;
    });

    return {
      newVal,
      oldVal,
      bool: skipUpdate || !isSupported,
      isSupportedMetaData: isSupported,
      skipUpdate: skipUpdate,
    };
  }
  store.shouldSkipValueUpdate = shouldSkipValueUpdate;
  const coreUpdate: CoreUpdate = (newVal, oldVal, path, options) => {
    const isSkipUpdate = shouldSkipValueUpdate(oldVal, newVal, path);
    if (isSkipUpdate.bool) return false;
    setValue(path, data, newVal);
    if (options?.quietUpdate) return true;
    notifyInvalidate(path, subscribers, pathSubscribers, data);
    return true;
  };
  
  function startBatch() {
    batchDepth++;
  }

  function endBatch(data: any) {
    if (batchDepth > 1) {
      batchDepth--;
      return;
    }

    notifyBatchInvalidate(batchedPaths, subscribers, pathSubscribers, data);
    batchedPaths.clear();
    batchDepth--;
  }

  store.batch = (fn) => {
    if (batchDepth > 0) {
      return fn();
    }
    startBatch();
    try {
      return fn();
    } finally {
      endBatch(data);
    }
  };

  store.get = (accessor) => {
    const path = getPath<T>(data, accessor);
    return getValue<T>(path, data);
  };

  store.resolvePath = (accessor) => {
    return getPath<T>(data, accessor);
  };


  store.computed = function <R>(fn: () => R) {
    let value: R;
    const originalGet = store.get;
    let dependencies = new Set<string>();
    const destroy: { current: UnSubscribe | null } = { current: null };

    const compute = () => {
      dependencies.clear();
      store.get = (accessor) => {
        const path = getPath(data, accessor);
        dependencies.add(path);
        return originalGet(accessor);
      };

      const result = fn();
      store.get = originalGet;
      return result;
    };

    value = compute();

    destroy.current = store.subscribe(() => {
      value = compute();
    }, Array.from(dependencies));

    return {
      get: () => value,
      destroy: () => {
        destroy.current?.();
        dependencies?.clear?.();
      },
    };
  };

  store.invalidate = (accessor) => {
    const path = getPath<T>(data, accessor);
    notifyInvalidate(path, subscribers, pathSubscribers, data);
  };

  store.update = ((accessor, cbOrVal, options) => {
    const path = getPath<T>(data, accessor);
    const oldVal = getValue<T>(path, data);
    const newVal = resolveValue(cbOrVal, oldVal);
    const _update = (isQuite?: boolean) => {
      return coreUpdate(newVal, oldVal, path, {
        quietUpdate: isQuite,
      });
    };
    if (batchDepth > 0) {
      batchedPaths.add(path);
      return _update(true);
    }
    return _update(options?.quiet);
  }) as ObservableState<T>['update'];

  store.update.quiet = (accessor, cbOrVal) => {
    return store.update(accessor, cbOrVal, { quiet: true });
  };
  

  store.setStore = (newData: T) => {
    store.destroy();
    (store as any)._destroyed = undefined;
    initializeValue(newData, metaMap, primitiveMetaMap);
    data = newData;
  };

  store.getInfo = (path) => {
    if (path) {
      const _path = store.resolvePath(path as any);
      const pathSubs = pathSubscribers.get(_path) || new Set();
      return {
        path,
        pathSubscribersCount: pathSubs.size,
        pathSubscribers: Array.from(pathSubs).map((sub) => sub.cacheKeys),
      };
    } else {
      return {
        totalGlobalSubscribers: subscribers.size,
        globalSubscribers: Array.from(subscribers).map((sub) => sub.cacheKeys),
        totalPathSubscribers: Array.from(pathSubscribers.values()).reduce((acc, subs) => acc + subs.size, 0),
        pathSubscribersMap: Array.from(pathSubscribers.entries()).reduce((acc, [key, subs]) => {
          acc[key] = Array.from(subs).map((sub) => sub.cacheKeys) as any;
          return acc;
        }, {} as Record<string, string[][]>),
      };
    }
  };

  store.destroy = () => {
    if ((store as any)._destroyed) return;
    (store as any)._destroyed = true;
    subscribers.forEach((sub) => sub.unsubscribe?.());
    subscribers.clear();

    pathSubscribers.forEach((subs) => {
      subs.forEach((sub) => sub.unsubscribe?.());
      subs.clear();
    });
    pathSubscribers.clear();

    if (metaMap) (metaMap as any) = new WeakMap();
    primitiveMetaMap.clear();

    batchedPaths.clear();
    batchDepth = 0;
  };

  store.subscribe = (callback, cacheKeys = []) => {
    const metaData = {
      cacheKeys: cacheKeys,
      callback: () => {
        callback(data);
      },
      unsubscribe: () => {
        subscribers.delete(metaData);
      },
    };

    subscribers.add(metaData);
    return metaData.unsubscribe;
  };

  store.subscribeToPath = (accessor, callback, opt) => {
    const { cacheKeys = [], immediate = false } = opt ?? {};
    const path = getPath<T>(data, accessor);
    const metaData = {
      path,
      cacheKeys,
      callback: () => {
        const value = getValue<T>(path, data);
        callback(value, metaData.unsubscribe);
      },
      unsubscribe: () => {
        const meteDates = pathSubscribers.get(path);
        meteDates?.delete(metaData);
        if (meteDates?.size === 0) {
          pathSubscribers.delete(path);
        }
      },
    };

    let metaDates = pathSubscribers.get(path);
    if (!metaDates) metaDates = new Set();
    metaDates.add(metaData);
    if (immediate) {
      metaData.callback();
    }
    pathSubscribers.set(path, metaDates);
    return metaData.unsubscribe;
  };

  let wrappedUpdate = store.update;
  let originQuiet = store.update.quiet;
  middlewares.reverse().forEach((mw) => {
    wrappedUpdate = mw(wrappedUpdate, store) as any;
  });
  (store.update as any) = (accessor: any, cbOrVal: any, opts: any) => {
    const path = getPath(data, accessor);
    const oldVal = getValue(path, data);
    const newVal = resolveValue(cbOrVal, oldVal);
    wrappedUpdate(path as any, newVal, opts);
  };
  store.update.quiet = originQuiet;

  return store;
}
