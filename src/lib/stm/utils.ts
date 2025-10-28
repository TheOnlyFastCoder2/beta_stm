import type {
  Accessor,
  isUpdated,
  MetaData,
  MetaWeakMap,
  ObservableState,
  PathSubscribers,
  SSRStore,
  Subscribes,
  SubsMetaData,
} from './types';

function getNormalizedBodyWithArgs(str: string): [string[], string] {
  let start = -1;
  let end = -1;
  const arrowQty = 3; // =>
  const args: string[] = [];
  let current = '';
  let newBody = '';
  let startBody = 0;
  let phase = 0; // 0 - аргументы, 1 - тело функции

  // Находим start и end за один проход
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(' && start === -1) start = i;
    if (str[i] === ')' && start !== -1) {
      end = i;
      break;
    }
  }

  if (start === -1 || end === -1) return [[], newBody];

  for (let i = start + 1; i < str.length; i++) {
    const char = str[i];

    if (phase === 0) {
      // Парсинг аргументов
      if (char === ')') {
        if (current.trim()) args.push(current.trim());
        phase = 1;
        i += arrowQty; // Пропускаем стрелку =>
        continue;
      }

      if (char === ',') {
        if (current.trim()) args.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    } else {
      if (startBody <= `${args[0]}.`.length) {
        startBody++;
        continue;
      }

      if (char !== '[' && char !== ']') {
        newBody += char;
      }

      if (char === ']' && str[i + 1] === '[') {
        newBody += '.';
      } else if (char === '[' && str[i - 1] !== ']') {
        newBody += '.';
      }
    }
  }

  // Добавляем последний аргумент, если есть
  if (current.trim() && phase === 0) {
    args.push(current.trim());
  }

  return [args, newBody];
}

function resolveAccessor<T>(store: T, cb: Accessor<T>): string {
  try {
    const str = String(cb);
    const [args, body] = getNormalizedBodyWithArgs(str);
    let newBody = body;

    if (args[1]) {
      const regex = new RegExp(`${args[1]}\\((.*?)\\)`, 'g');
      const resolvers = body.match(regex);
      let qtyCalled = 0;

      if (resolvers?.length) {
        cb(store, (v: any) => {
          const resolve = resolvers[qtyCalled];
          newBody = newBody.replace(resolve, `${v}`);
          qtyCalled++;
          return v;
        });
      }
    }

    return newBody;
  } catch (error) {
    return '';
  }
}

export function getPath<T>(store: T, fnOrStr: Accessor<T> | string): string {
  return typeof fnOrStr === 'function' ? resolveAccessor(store, fnOrStr) : fnOrStr;
}

export const getValue = <T>(path: string, data: T): any => {
  const segments = path.split('.');
  let value: any = data;
  for (const segment of segments) {
    value = value?.[segment];
  }
  return value;
};

export const resolveValue = <T>(cbOrVal: T | ((v: T) => T), oldVal: T) =>
  isUpdater(cbOrVal) ? cbOrVal(oldVal) : cbOrVal;

export const setValue = <T>(path: string, data: T, newValue: any): T => {
  const segments = path.split('.');
  let obj: any = data;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;

    if (i === segments.length - 1) {
      obj[segment] = newValue;
    } else {
      if (obj[segment] === undefined || obj[segment] === null) {
        obj[segment] = {};
      }
      obj = obj[segment];
    }
  }

  return data;
};

// ***notification*** start//
function shouldNotifyByCacheKeys(metaData: Omit<SubsMetaData, 'path'>, normalizedKey: string, data: any) {
  const { cacheKeys } = metaData;
  if (!Array.isArray(cacheKeys) || cacheKeys.length === 0) return true;

  return cacheKeys.some((key) => {
    const dep = getPath(data, key);
    return (
      normalizedKey === dep || normalizedKey.startsWith(dep + '.') || dep.startsWith(normalizedKey + '.') // <-- родитель затронул потомка
    );
  });
}

function shouldNotifyForCacheKeys(metaData: { cacheKeys?: any[] }, normalizedKey: string, data: any) {
  const { cacheKeys } = metaData;
  if (!Array.isArray(cacheKeys) || cacheKeys.length === 0) return false;

  return cacheKeys.some((key) => {
    const dep = getPath(data, key);
    return (
      normalizedKey === dep || normalizedKey.startsWith(dep + '.') || dep.startsWith(normalizedKey + '.') // <-- то же правило
    );
  });
}
function notifyPathSubscribers<T>(normalizedKey: string, pathSubscribers: PathSubscribers, data: T) {
  for (const [subPath, subs] of pathSubscribers.entries()) {
    subs.forEach((metaData) => {
      const shouldNotifyCache = shouldNotifyForCacheKeys(metaData, normalizedKey, data);
      const valueAtPath = getValue(metaData.path || subPath, data);
      if (valueAtPath === undefined) {
        metaData.unsubscribe?.();
        return;
      }
      if (subPath === normalizedKey || subPath.startsWith(normalizedKey + '.') || shouldNotifyCache) {
        metaData.callback();
      }
    });
  }
}

function notifyGlobalsSub(normalizedKey: string, subscribers: Subscribes, data: any) {
  Array.from(subscribers).forEach((metaData) => {
    if (!subscribers.has(metaData)) return;

    if (!Array.isArray(metaData.cacheKeys) || metaData.cacheKeys.length === 0) {
      metaData.callback();
      return;
    }

    console.log(metaData.cacheKeys);
    if (metaData.cacheKeys.length === 0) {
      metaData.callback();

      return;
    }

    if (shouldNotifyByCacheKeys(metaData, normalizedKey, data)) {
      metaData.callback();
    }
  });
}

export function notifyInvalidate<T>(
  normalizedKey: string,
  subscribers: Subscribes,
  pathSubscribers: PathSubscribers,
  data: T
) {
  notifyGlobalsSub(normalizedKey, subscribers, data);
  notifyPathSubscribers(normalizedKey, pathSubscribers, data);
}

export function notifyBatchInvalidate<T>(
  paths: Iterable<string>,
  subscribers: Subscribes,
  pathSubscribers: PathSubscribers,
  data: T
) {
  const normalizedKeys = Array.from(paths);
  const notifiedPaths = new Set<string>();

  normalizedKeys.forEach((path) => {
    if (notifiedPaths.has(path)) return;
    notifyPathSubscribers(path, pathSubscribers, data);
    notifiedPaths.add(path);
  });

  if (normalizedKeys.length > 0) {
    subscribers.forEach((metaData) => {
      metaData.callback();
    });
  }
}

// ***notification*** end//

// ***metadata*** start//

export function withMetaSupport<T>(target: T, cb: () => void | any): any {
  if (target === undefined) return false;
  return cb?.();
}

export function setMetaData<T extends object>(
  metaMap: MetaWeakMap | undefined,
  target: T,
  meta: MetaData,
  primitiveMetaMap?: Map<string, MetaData>,
  path?: string
): void {
  if (typeof target === 'object' && target !== null && metaMap) {
    withMetaSupport(target, () => metaMap.set(target, meta));
  } else if (path) {
    primitiveMetaMap?.set(path, meta);
  }
}

export function getMetaData<T extends object>(
  metaMap: WeakMap<object, MetaData>,
  target: T,
  primitiveMetaMap?: Map<string, MetaData>,
  path?: string
): MetaData | undefined {
  if (typeof target === 'object' && target !== null) {
    return withMetaSupport(target, () => metaMap.get(target));
  } else if (path) {
    return primitiveMetaMap?.get(path);
  }
  return undefined;
}

export function deleteMetaData<T extends object>(
  metaMap: WeakMap<object, MetaData>,
  target: T,
  primitiveMetaMap?: Map<string, MetaData>,
  path?: string
): void {
  if (typeof target === 'object' && target !== null) {
    withMetaSupport(target, () => metaMap.delete(target));
  } else if (path) {
    primitiveMetaMap?.delete(path);
  }
}

export function calculateSnapshotHash(obj: any): string | false {
  try {
    if (obj === null || obj === undefined) {
      return String(obj);
    }
    if (typeof obj !== 'object') {
      return String(obj);
    }

    const input = JSON.stringify(obj);
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      hash = (((hash << 5) + hash) ^ code) >>> 0;
    }
    return (hash >>> 0).toString(16);
  } catch {
    return false;
  }
}

// ***metadata*** end//

export function getRandomId() {
  return `${Math.floor(performance.now()).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const MUTATING_METHODS = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
] as const;

type MutatingMethod = (typeof MUTATING_METHODS)[number];

const WRAPPED_FLAG: unique symbol = Symbol('array_is_wrapped');

const normalizeStart = (start: number, len: number) => (start < 0 ? Math.max(len + start, 0) : Math.min(start, len));

export function wrapSignalArray(
  node: any,
  basePath: string,
  store: any,
  reIndexSignal: (signal: any, basePath: string) => void,
  createSignal: (signal: any, basePath: string) => void,
  removeCacheKeys: (path: string) => void
) {
  if (!Array.isArray(node) || (node as any)[WRAPPED_FLAG]) return node;

  const defineInstanceMethod = (method: MutatingMethod) => {
    const orig = (Array.prototype as any)[method];

    Object.defineProperty(node, method, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function (...args: any[]) {
        return store.batch(() => {
          const arr = node as any[];
          const oldLength = arr.length;

          let startIndex = 0;
          //prettier-ignore
          switch (method) {
          case 'push': break;
          case 'pop': break;
         
          case 'unshift':
          case 'shift':
          case 'sort':
          case 'reverse':
          case 'fill':
          case 'copyWithin': startIndex = 0; break;
          case 'splice': 
            const rawStart = args[0] ?? 0;
            startIndex = normalizeStart(rawStart, arr.length);
            break;
        }

          const newArgs = args.map((arg, i) => {
            const isToWrap = method === 'push' || method === 'unshift' || (method === 'splice' && i >= 2);
            // `${basePath}.${arr.length + i}` заглушка, все равно будет выполняться reIndexSignal
            return isToWrap ? createSignal(arg, `${basePath}.${arr.length + i}`) : arg;
          });

          const result = orig.apply(arr, newArgs);
          store.update(basePath, (oldVal: any[]) => {
            (Array.prototype as any)[method].apply(oldVal, args);
            return oldVal;
          });

          switch (method) {
            case 'unshift':
            case 'shift':
            case 'splice':
            case 'sort':
            case 'reverse':
            case 'fill':
            case 'copyWithin': {
              if (arr.length < oldLength) {
                for (let i = arr.length; i < oldLength; i++) {
                  removeCacheKeys(`${basePath}.${i}`);
                }
              }
              for (let i = startIndex; i < arr.length; i++) {
                const item = arr[i];
                if (item && typeof item === 'object') {
                  reIndexSignal(item, `${basePath}.${i}`);
                }
              }
              break;
            }
          }

          return result;
        });
      },
    });
  };

  for (const m of MUTATING_METHODS) {
    defineInstanceMethod(m);
  }

  Object.defineProperty(node, WRAPPED_FLAG, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  (node as any)._isWrapped = true;

  return node;
}

export function initializeValue<T extends object>(
  value: T,
  metaMap: WeakMap<object, MetaData>,
  primitiveMetaMap: Map<string, MetaData>
) {
  for (const { node, path } of iterateObjectTree(value)) {
    withMetaSupport(node, () => {
      const snapshot = calculateSnapshotHash(node);
      if (!snapshot) return;

      setMetaData(metaMap, node, { _prevSignature: snapshot }, primitiveMetaMap, path);
    });
  }
}

export function isUpdater<E>(val: unknown): val is (v: E) => E {
  return typeof val === 'function';
}

export function* iterateObjectTree(
  obj: any,
  showPrimitive: boolean = true,
  visited = new WeakSet(),
  currentPath: string = '',
  parent: any = null,
  parentKey: string | number | null = null
): IterableIterator<{ node: any; path: string; parent: any; key: string | number | null }> {
  if (obj == undefined || obj == null || typeof obj !== 'object' || visited.has(obj)) {
    return;
  }
  visited.add(obj);

  yield { node: obj, path: currentPath, parent, key: parentKey };

  if (Array.isArray(obj)) {
    for (let i = obj.length - 1; i >= 0; i--) {
      const nextPath = currentPath ? `${currentPath}.${i}` : String(i);
      if (showPrimitive || (obj[i] && typeof obj[i] === 'object')) {
        yield { node: obj[i], path: nextPath, parent: obj, key: i };
        if (obj[i] && typeof obj[i] === 'object') {
          yield* iterateObjectTree(obj[i], showPrimitive, visited, nextPath, obj, i);
        }
      }
    }
  } else {
    const keys = Object.keys(obj);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      if (!key) continue;
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      if (showPrimitive || (obj[key] && typeof obj[key] === 'object')) {
        yield { node: obj[key], path: nextPath, parent: obj, key };
        if (obj[key] && typeof obj[key] === 'object') {
          yield* iterateObjectTree(obj[key], showPrimitive, visited, nextPath, obj, key);
        }
      }
    }
  }
}
