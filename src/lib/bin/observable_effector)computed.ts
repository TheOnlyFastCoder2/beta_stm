
// import type {
//   Batch,
//   CoreUpdate,
//   MetaData,
//   Middleware,
//   ObservableState,
//   PathSubscribers,
//   Subscribes,
// } from '../types';

// import {
//   calculateSnapshotHash,
//   getMetaData,
//   getPath,
//   getRandomId,
//   getValue,
//   initializeValue,
//   notifyBatchInvalidate,
//   notifyInvalidate,
//   setMetaData,
//   setValue,
//   withMetaSupport,
//   resolveValue,
// } from '../utils';

// export default function createObservableState<T extends object>(
//   data: T,
//   middlewares: Middleware<T>[] = []
// ): ObservableState<T> {
//   const subscribers: Subscribes = new Set();
//   const pathSubscribers: PathSubscribers = new Map();

//   const store: ObservableState<T> = {} as any;
//   const metaMap = new WeakMap<object, MetaData>();
//   const primitiveMetaMap = new Map<string, MetaData>();
//   const batchingStack = new Map<string, Batch>();

//   initializeValue(data, metaMap, primitiveMetaMap);

//   function shouldSkipValueUpdate(oldVal: any, newVal: any, path: string) {
//     let skipUpdate = false;
//     const isSupported = withMetaSupport(newVal, () => {
//       const meta = getMetaData(metaMap, oldVal, primitiveMetaMap, path);
//       const prevSig = meta?._prevSignature;
//       const currentSig = calculateSnapshotHash(newVal);

//       if (prevSig === currentSig) {
//         skipUpdate = true;
//         return true;
//       }
//       if (currentSig) {
//         setMetaData(metaMap, newVal, { _prevSignature: currentSig }, primitiveMetaMap, path);
//       }
//       return true;
//     });

//     return {
//       newVal,
//       oldVal,
//       bool: skipUpdate || !isSupported,
//       isSupportedMetaData: isSupported,
//       skipUpdate: skipUpdate,
//     };
//   }

//   const coreUpdate: CoreUpdate = (newVal, oldVal, path, options) => {
//     const isSkipUpdate = shouldSkipValueUpdate(oldVal, newVal, path);
//     if (isSkipUpdate.bool) return;
//     setValue(path, data, newVal);
//     if (options?.quietUpdate) return;
//     notifyInvalidate(path, subscribers, pathSubscribers, data);
//   };

//   function tryAddToBatch(path: string, newVal: any): boolean {
//     const activeBatch = Array.from(batchingStack.values()).pop();
//     if (!activeBatch) return false;

//     activeBatch.pending.set(path, newVal);
//     return true;
//   }

//   function startBatch(mode: 'user' = 'user') {
//     const key = getRandomId();
//     batchingStack.set(key, { modeBatching: mode, pending: new Map() });
//     return key;
//   }

//   function endBatch(key: string) {
//     const batch = batchingStack.get(key);
//     if (!batch) return;

//     batchingStack.delete(key);
//     const parentBatch = Array.from(batchingStack.values()).pop();
//     if (parentBatch) {
//       return batch.pending.forEach((value, path) => {
//         parentBatch.pending.set(path, value);
//       });
//     }

//     batch.pending.forEach((value, path) => {
//       setValue(path, data, value);
//     });

//     notifyBatchInvalidate(batch.pending.keys(), subscribers, pathSubscribers, data);
//   }

//   store.batch = async (fn, mode: 'user' = 'user') => {
//     const key = startBatch(mode);
//     try {
//       const result = fn();
//       if (result instanceof Promise) {
//         await result;
//       }
//     } finally {
//       endBatch(key);
//     }
//     return Promise.resolve();
//   };

//   store.get = (accessor) => {
//     const path = getPath<T>(data, accessor);
//     return getValue<T>(path, data);
//   };

//   const effectOrComputed = () => {
//     const dependencies = new Set<string>();
//     const originalGet = store.get;

//     store.get = (accessor) => {
//       const path = getPath(data, accessor);
//       dependencies.add(path);
//       return originalGet(accessor);
//     };

//     return {
//       run: (fn?: Function) => {
//         let result;
//         if (fn) result = fn();
//         store.get = originalGet;
//         return result;
//       },
//       collectedPaths: dependencies,
//       destroy: () => dependencies.clear(),
//     };
//   };

//   function collectPathToString(paths: Iterable<string>) {
//     return Array.from(paths).sort().join(';');
//   }

//   const computedTracking = new Map<Function, Set<string>>();

//   store.computed = function <R>(fn: () => R) {
//     let value: R;

//     const computed = effectOrComputed();
//     const get = () => {
//       return (value = fn());
//     };

//     const toComputed = () => {
//       computed.run(get);
//       const paths = collectPathToString(computed.collectedPaths);
//       const set = computedTracking.get(toComputed) || new Set();
//       set.add(paths);
//     };

//     computedTracking.set(toComputed, new Set());
//     return {
//       get,
//       destroy: () => {
//         const map = computedTracking.get(toComputed);
//         if (map) map.clear();
//         computed.destroy();
//         computedTracking.delete(toComputed);
//       },
//     };
//   };

//   store.effect = function (cb: Function) {
//     const effector = effectOrComputed();
//     effector.run(cb);
//     const effectPathsKey = collectPathToString(effector.collectedPaths);
//     if (effectPathsKey.length === 0) {
//       return {
//         destroy: () => {
//           effector.destroy();
//         },
//       };
//     }
//     let isRunCb = false;
//     for (const [toComputed] of computedTracking.entries()) {
//       toComputed();
//     }
//     const destroy = store.subscribe(() => {
//       for (const [toComputed, set] of computedTracking.entries()) {
//         for (const pathsKey of set) {
//           const compDeps = pathsKey.split(';');
//           const effectDeps = effectPathsKey.split(';');
//           isRunCb = !!compDeps?.some((p) => effectDeps.includes(p));
//           if (isRunCb) toComputed();
//         }
//       }

//       isRunCb && cb();
//     }, effector.collectedPaths as any);

//     return {
//       destroy: () => {
//         destroy();
//         effector.destroy();
//       },
//     };
//   };

//   store.invalidate = (accessor) => {
//     const path = getPath<T>(data, accessor);
//     notifyInvalidate(path, subscribers, pathSubscribers, data);
//   };

//   store.update = (accessor, cbOrVal, options) => {
//     const path = getPath<T>(data, accessor);
//     const oldVal = getValue<T>(path, data);
//     const newVal = resolveValue(cbOrVal, oldVal);
//     if (tryAddToBatch(path, newVal)) return;
//     coreUpdate(newVal, oldVal, path, {
//       quietUpdate: options?.quiet,
//     });
//   };

//   store.update.quite = (accessor, cbOrVal) => {
//     return store.update(accessor, cbOrVal, { quiet: true });
//   };

//   store.subscribe = (callback, cacheKeys = []) => {
//     const metaData = {
//       cacheKeys,
//       callback: () => {
//         callback(data);
//       },
//       unsubscribe: () => {
//         subscribers.delete(metaData);
//       },
//     };

//     subscribers.add(metaData);

//     return metaData.unsubscribe;
//   };

//   store.subscribeToPath = (accessor, callback, opt) => {
//     const { cacheKeys = [], immediate = false } = opt ?? {};
//     const path = getPath<T>(data, accessor);
//     const metaData = {
//       path,
//       cacheKeys,
//       callback: () => {
//         const value = getValue<T>(path, data);
//         callback(value, metaData.unsubscribe);
//       },
//       unsubscribe: () => {
//         const meteDates = pathSubscribers.get(path);
//         meteDates?.delete(metaData);
//         if (meteDates?.size === 0) {
//           pathSubscribers.delete(path);
//         }
//       },
//     };

//     let metaDates = pathSubscribers.get(path);
//     if (!metaDates) metaDates = new Set();
//     metaDates.add(metaData);
//     if (immediate) {
//       metaData.callback();
//     }
//     pathSubscribers.set(path, metaDates);
//     return metaData.unsubscribe;
//   };

//   let wrappedUpdate = store.update;
//   middlewares.reverse().forEach((mw) => {
//     wrappedUpdate = mw(wrappedUpdate, store);
//   });
//   store.update = (accessor, cbOrVal, opts) => {
//     const path = getPath(data, accessor);
//     const oldVal = getValue(path, data);
//     const newVal = resolveValue(cbOrVal, oldVal);
//     wrappedUpdate(path as any, newVal, opts);
//   };

//   return store;
// }
