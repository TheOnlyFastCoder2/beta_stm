import type { Middleware, StoreWithSignals, ObservableState, Signal } from '../types';
import { getPath, wrapSignalArray } from '../utils';
import createObservableState from './observable';

export default function createStoreWithSignals<T extends object>(
  data: T,
  middlewares: Middleware<T>[] = [],
  defineProperty?: (signal: Signal<T>) => void
): StoreWithSignals<T> {
  const store = createObservableState(data, middlewares) as StoreWithSignals<T>;
  const pathCache = new Map<string, { parentPath: string; key: string }>();
  const signalsMap = new Map<string, any>();

  function defineVProp(target: any, path: string, setIsOnlyPath = false) {
    if (setIsOnlyPath) {
      target._metaPath = path;
      return;
    }

    const createSignal = (updateMethod: 'update' | 'update.quiet') => {
      const isQuiet = updateMethod === 'update.quiet';
      const property = !isQuiet ? 'v' : 'q';

      const signal = Object.defineProperty(target, property, {
        get: () => store.get(target._metaPath as any),
        set: (newVal) => {
          store.update(target._metaPath as any, newVal, { quiet: isQuiet });
        },
      });
      return signal;
    };
    target._metaPath = path;
    createSignal('update');
    createSignal('update.quiet');
    defineProperty?.(target);
    signalsMap.set(path, target);
  }

  function createSignal(value: any, basePath = '', setIsOnlyPath = false) {
    const stack = [{ value, path: basePath }];

    while (stack.length > 0) {
      const { value: currentValue, path: currentPath } = stack[stack.length - 1];

      // Если это примитив - создаем сигнал и убираем из стека
      if (currentValue === null || typeof currentValue !== 'object') {
        const signal = {};
        defineVProp(signal, currentPath, setIsOnlyPath);
        stack.pop();
        continue;
      }

      // Если массив или объект - проверяем, все ли дети обработаны
      if (Array.isArray(currentValue)) {
        let hasUnprocessedChild = false;
        const arrSignals: any[] = [];
        for (let i = 0; i < currentValue.length; i++) {
          const childPath = `${currentPath}.${i}`;
          const childSignal = signalsMap.get(childPath);

          if (!childSignal && !hasUnprocessedChild) {
            // Находим первого необработанного ребенка — пушим в стек
            stack.push({ value: currentValue[i], path: childPath });
            hasUnprocessedChild = true;
          } else {
            // Если уже обработан — сохраняем в массив сигналов
            arrSignals[i] = childSignal;
          }
        }

        if (hasUnprocessedChild) continue;

        // Все дети обработаны — создаем сигнал для массива
        wrapSignalArray(arrSignals, currentPath, store, createSignal);
        defineVProp(arrSignals, currentPath, setIsOnlyPath);
        stack.pop();
        continue;
      }

      // Объект
      let hasUnprocessedChild = false;
      for (const key in currentValue) {
        const childPath = currentPath ? `${currentPath}.${key}` : key;
        if (!signalsMap.has(childPath)) {
          stack.push({ value: currentValue[key], path: childPath });
          hasUnprocessedChild = true;
          break; // добавляем только одного ребенка за раз
        }
      }

      if (hasUnprocessedChild) continue;

      // Все дети обработаны — создаем сигнал для объекта
      const signal: any = {};
      for (const key in currentValue) {
        const childPath = currentPath ? `${currentPath}.${key}` : key;
        signal[key] = signalsMap.get(childPath);
      }
      defineVProp(signal, currentPath, setIsOnlyPath);
      stack.pop();
    }

    return signalsMap.get(basePath);
  }

  function splitPath(path: string) {
    if (!pathCache.has(path)) {
      const parts = path.split('.');
      pathCache.set(path, {
        parentPath: parts.slice(0, -1).join('.'),
        key: parts[parts.length - 1],
      });
    }
    return pathCache.get(path)!;
  }

  function updateSignals(accessor: any) {
    const path = store.resolvePath(accessor);
    const { parentPath, key } = splitPath(path);

    const target: any = store.get(path as any);
    const parentSignal: any = store.getSignal(parentPath as any) || store.$;

    if (target === null || typeof target !== 'object') {
      if (!signalsMap.has(path)) {
        const signal = createSignal(target, path);
        signalsMap.set(path, signal);
        if (parentSignal && key) {
          parentSignal[key] = signal;
        }
      }
      return;
    }

    const oldTarget: any = store.getSignal(path as any) ?? {};
    for (const k in target) {
      const childPath = path ? `${path}.${k}` : k;
      if (!signalsMap.has(childPath)) {
        const childSignal = createSignal(target[k], childPath);
        oldTarget[k] = childSignal;
      }
    }
  }

  const originUpdate = store.update;
  const originUpdateQuiet = store.update.quiet;
  const originDestroy = store.destroy;
  const originSetStore = store.setStore;

  store.update = ((accessor, cbOrVal) => {
    const isUpdated = originUpdate(accessor, cbOrVal);
    if (!isUpdated) return false;
    updateSignals(accessor);
    return true;
  }) as ObservableState<T>['update'];

  store.update.quiet = (accessor, cbOrVal) => {
    const idUpdated = originUpdateQuiet(accessor, cbOrVal);
    if (!idUpdated) return false;
    updateSignals(accessor);
    return true;
  };

  store.setStore = (newData: T) => {
    originSetStore?.(newData);
    signalsMap.clear();
    pathCache.clear();
    store.$ = createSignal(newData, '');
  };

  store.destroy = () => {
    originDestroy?.();
    signalsMap.clear();
    pathCache.clear();
    (store.$ as any) = undefined;
  };

  store.$ = createSignal(data, '');

  store.getSignal = (accessor) => {
    const path = getPath(data, accessor);
    return signalsMap.get(path);
  };

  return store;
}
