export type Primitive = string | number | boolean | symbol | bigint | null | undefined;
export type Accessor<T, R = any> = ($: T, t: <K>(arg: K) => K) => R;

export type ExtractPathReturn<T, P extends Accessor<T>> = P extends Accessor<T, infer V> ? V : never;

export type MetaWeakMap = WeakMap<object, MetaData>;
export type MetaData = {
  _prevSignature?: any;
  _mutated?: boolean;
  _isWrapped?: boolean;
  _prevRevision?: string | null;
  revision?: string;

  [key: string]: any;
};

export type SubsMetaData = {
  path: string;
  callback: () => void;
  unsubscribe: () => void;
  cacheKeys: CacheKey<any>[];
};

export type Batch = {
  modeBatching: 'proxy' | 'user';
  pending: Map<string, any>;
};
export type CoreUpdate = (
  newVal: any,
  oldVal: any,
  path: string,
  options?: {
    quietUpdate?: boolean;
  }
) => void;

export type isUpdated = boolean;
export type PathSubscribers = Map<string, Set<SubsMetaData>>;
export type Subscribes = Set<Omit<SubsMetaData, 'path'>>;
export type UnSubscribe = () => void;
export type Updater<T extends object> = <P extends Accessor<T>, E extends ExtractPathReturn<T, P>>(
  accessor: P,
  cbOrVal: E | ((v: E) => E),
  options?: { quiet?: boolean }
) => isUpdated;
export type CacheKey<T> = Accessor<T> | string;

export type Middleware<T extends object> = (next: Updater<T>, store: ObservableState<T>) => Updater<T>;

export interface ObservableState<T extends object> {
  subscribeToPath: <P extends Accessor<T>>(
    accessor: P,
    callback: (v: ExtractPathReturn<T, P>, unSub: UnSubscribe) => void,
    options?: {
      cacheKeys?: CacheKey<T>[];
      immediate?: boolean;
    }
  ) => UnSubscribe;
  update: Updater<T> & {
    quiet: <P extends Accessor<T>, E extends ExtractPathReturn<T, P>>(
      accessor: P,
      cbOrVal: E | ((v: E) => E)
    ) => isUpdated;
  };
  subscribe: (callback: (data: T) => void, cacheKeys?: CacheKey<T>[]) => UnSubscribe;
  get: <P extends Accessor<T>>(accessor: P) => ExtractPathReturn<T, P>;
  resolvePath: <P extends Accessor<T>>(accessor: P) => string;
  batch(callback: () => void | Promise<void>): Promise<void> | void;
  invalidate<P extends Accessor<T>>(accessor: P | string): void;
  computed<R>(fn: () => R): {
    get: () => R;
    destroy: () => void;
  };
  shouldSkipValueUpdate(
    oldVal: any,
    newVal: any,
    path: string
  ): {
    newVal: any;
    oldVal: any;
    bool: boolean;
    isSupportedMetaData: any;
    skipUpdate: boolean;
  };

  destroy: () => void;
  setStore: (newData: T) => void;
  getInfo: <P extends Accessor<T>>(
    path?: P
  ) =>
    | {
        path: any;
        pathSubscribersCount: number;
        pathSubscribers: CacheKey<any>[][];
        totalGlobalSubscribers?: undefined;
        globalSubscribers?: undefined;
        totalPathSubscribers?: undefined;
        pathSubscribersMap?: undefined;
      }
    | {
        totalGlobalSubscribers: number;
        globalSubscribers: CacheKey<any>[][];
        totalPathSubscribers: number;
        pathSubscribersMap: Record<string, string[][]>;
        path?: undefined;
        pathSubscribersCount?: undefined;
        pathSubscribers?: undefined;
      };
}

export type InstanceCore = <T extends object>(data: T, middlewares?: Middleware<T>[]) => ObservableState<T>;

export type SignalArrayMethods<U, T, R extends object = {}> = {
  v: Signal<T>;
  q: Signal<T>;
  push: (...items: U[]) => number;
  pop: () => Signal<U, R> | undefined;
  shift: () => Signal<U, R> | undefined;
  unshift: (...items: U[]) => number;
  splice: (start: number, deleteCount?: number, ...items: U[]) => Signal<U, R>[];
  sort: (compareFn?: (a: Signal<U, R>, b: Signal<U, R>) => number) => Signal<U, R>[];
  reverse: () => Signal<U, R>[];
};

export type SignalValue<T, R extends object = any> = {
  v: T;
  q: T;
  _metaPath: string;
} & R;

export type Signal<T, R extends object = {}> = T extends Primitive
  ? SignalValue<T, R>
  : T extends (infer U)[]
  ? { [K in keyof T]: Signal<U, R> } & SignalArrayMethods<U, T, R> & Omit<SignalValue<T, R>, 'v'>
  : {
      [K in keyof T]: Signal<T[K], R>;
    } & SignalValue<T, R>;

export interface StoreWithSignals<T extends object, R extends object = {}> extends ObservableState<T> {
  $: Signal<T, R>;
  getSignal: <P extends Accessor<T>>(accessor: P) => Signal<ExtractPathReturn<T, P>, R>;
}

export type SSRStore<T extends object> = ObservableState<T> & {
  snapshot: () => Promise<T>;
  getSerializedStore: (type: 'window' | 'scriptTag' | 'serializedData') => Promise<string>;
  getSSRStoreId: () => number;
  hydrate: () => void;
  hydrateWithDocument: (delay?: number, callback?: () => void) => void;
  getIsSSR: () => boolean;

  updateSSR: {
    <P extends Accessor<T>, E extends ExtractPathReturn<T, P>>(
      accessor: P,
      cbOrVal: E | ((v: E) => E),
      options?: { quiet?: boolean }
    ): Promise<isUpdated>;
    quiet: <P extends Accessor<T>, E extends ExtractPathReturn<T, P>>(
      accessor: P,
      cbOrVal: E | ((v: E) => E)
    ) => Promise<isUpdated>;
  };
};
