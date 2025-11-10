const BRAND = Symbol("mini-signal");

let currentContext: Computed | Effect | undefined;
let batchedEffects: Set<Effect> | null = null;

function startBatch() {
  if (!batchedEffects) batchedEffects = new Set();
}

function endBatch() {
  if (!batchedEffects) return;
  const toRun = Array.from(batchedEffects);
  batchedEffects = null;
  for (const eff of toRun) eff.run();
}

// Basic dependency node linking source <-> target
interface Link {
  source: Signal;
  target: Computed | Effect;
  nextSource?: Link;
  prevSource?: Link;
  nextTarget?: Link;
  prevTarget?: Link;
}

export class Signal<T = any> {
  _value: T;
  _version = 0;
  _targets?: Link;

  constructor(value: T) {
    this._value = value;
  }

  get value() {
    const ctx = currentContext;
    if (ctx) {
      // Create or reuse link node
      const link: Link = { source: this, target: ctx };
      // attach link to source and target lists
      link.nextTarget = this._targets;
      this._targets = link;

      link.nextSource = ctx._sources;
      ctx._sources = link;
    }
    return this._value;
  }

  set value(v: T) {
    if (v === this._value) return;
    this._value = v;
    this._version++;
    this._notify();
  }

  _notify() {
    if (!this._targets) return;
    startBatch();
    for (let node = this._targets; node; node = node.nextTarget) {
      node.target.markDirty();
    }
    endBatch();
  }
}

export class Computed<T = any> {
  _sources?: Link;
  _dirty = true;
  _value!: T;

  constructor(private fn: () => T) {}

  get value() {
    if (this._dirty) this.recompute();
    // track dependency if inside another computed/effect
    if (currentContext) {
      const link: Link = { source: this as any, target: currentContext };
      link.nextSource = currentContext._sources;
      currentContext._sources = link;
    }
    return this._value;
  }

  recompute() {
    // clear previous deps
    this._sources = undefined;
    const prev = currentContext;
    currentContext = this;
    try {
      this._value = this.fn();
      this._dirty = false;
    } finally {
      currentContext = prev;
    }
  }

  markDirty() {
    if (!this._dirty) {
      this._dirty = true;
      this._notify();
    }
  }

  _notify() {
    // notify dependents
    for (let n = this._sources; n; n = n.nextSource) {
      n.target.markDirty();
    }
  }
}

export class Effect {
  _sources?: Link;
  _dirty = true;
  private disposeFn?: () => void;

  constructor(private fn: () => void | (() => void)) {
    this.run();
  }

  run() {
    if (this.disposeFn) this.disposeFn();
    this._sources = undefined;
    const prev = currentContext;
    currentContext = this;
    try {
      const cleanup = this.fn();
      if (typeof cleanup === "function") this.disposeFn = cleanup;
      this._dirty = false;
    } finally {
      currentContext = prev;
    }
  }

  markDirty() {
    if (!this._dirty) {
      this._dirty = true;
      if (batchedEffects) {
        batchedEffects.add(this);
      } else {
        this.run();
      }
    }
  }

  dispose() {
    if (this.disposeFn) this.disposeFn();
    this._sources = undefined;
  }
}




export function wrapArraySignals<T>(
  arr: T[],
  createSignalNode: (value: any, path: string) => any,
  path: string = ""
) {
  const signalArray: any[] = arr.map((v, i) => createSignalNode(v, `${path}.${i}`));
  const arraySignal = new Signal(signalArray);

  const methods = {
    push(...items: T[]) {
      const startIndex = signalArray.length;
      const newSignals = items.map((v, i) =>
        createSignalNode(v, `${path}.${startIndex + i}`)
      );
      signalArray.push(...newSignals);
      arraySignal.value = signalArray;
      return signalArray.length;
    },
    pop() {
      const removed = signalArray.pop();
      arraySignal.value = signalArray;
      return removed;
    },
    splice(start: number, deleteCount?: number, ...items: T[]) {
      const newItems = items.map((v, i) =>
        createSignalNode(v, `${path}.${start + i}`)
      );
      const result = signalArray.splice(start, deleteCount ?? signalArray.length, ...newItems);
      arraySignal.value = signalArray;
      return result;
    },
    sort(compareFn?: (a: any, b: any) => number) {
      signalArray.sort(compareFn);
      arraySignal.value = signalArray;
      return signalArray;
    },
    reverse() {
      signalArray.reverse();
      arraySignal.value = signalArray;
      return signalArray;
    },
    get length() {
      return signalArray.length;
    },
    [Symbol.iterator]() {
      return signalArray[Symbol.iterator]();
    },
  };

  Object.setPrototypeOf(signalArray, methods);
  (signalArray as any)._signal = arraySignal;
  return signalArray;
}



export function createSignalStore<T extends object>(data: T) {
  const signalMap = new WeakMap<object, any>();
  const signalCache = new Map<string, Signal<any>>();

  function buildSignalTree(root: any, basePath = "") {
    const stack = [{ value: root, path: basePath }];
    const rootNode: any = Array.isArray(root) ? [] : {};

    while (stack.length > 0) {
      const { value: current, path } = stack.pop()!;

      if (current === null || typeof current !== "object") {
        const s = new Signal(current);
        signalCache.set(path, s);
        setNodeAtPath(rootNode, path, s);
        continue;
      }

      // Уже создан узел?
      if (signalMap.has(current)) continue;

      if (Array.isArray(current)) {
        const arrNode: any[] = [];
        signalMap.set(current, arrNode);

        for (let i = 0; i < current.length; i++) {
          const childPath = path ? `${path}.${i}` : `${i}`;
          stack.push({ value: current[i], path: childPath });
        }

        arrNode._signal = new Signal(current);
        signalCache.set(path, arrNode._signal);
        setNodeAtPath(rootNode, path, arrNode);
        continue;
      }

      // объект
      const objNode: any = {};
      signalMap.set(current, objNode);

      for (const key in current) {
        const childPath = path ? `${path}.${key}` : key;
        stack.push({ value: current[key], path: childPath });
      }

      objNode._signal = new Signal(current);
      signalCache.set(path, objNode._signal);
      setNodeAtPath(rootNode, path, objNode);
    }

    return rootNode;
  }

  function setNodeAtPath(root: any, path: string, node: any) {
    if (!path) return Object.assign(root, node);
    const parts = path.split(".");
    let obj = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      obj = obj[key] ??= {};
    }
    obj[parts[parts.length - 1]] = node;
  }

  const $ = buildSignalTree(data, "");

  // ----------------------------
  // Быстрый доступ к сигналу по пути
  // ----------------------------
  function getSignal(path: string): Signal<any> {
    let s = signalCache.get(path);
    if (s) return s;
    const parts = path.split(".");
    let node: any = $;
    for (const p of parts) node = node?.[p];
    if (node instanceof Signal) s = node;
    else if (node?._signal instanceof Signal) s = node._signal;
    if (!s) throw new Error(`No signal found for path "${path}"`);
    signalCache.set(path, s);
    return s;
  }

  function bindSignal<T>(obj: any, path: string): Signal<T> {
    const s = getSignal(path);
    signalCache.set(path, s);
    return s;
  }

  return {
    $,
    signal: getSignal,
    bindSignal,
    computed: <R>(fn: () => R) => new Computed(fn),
    effect: (fn: () => void | (() => void)) => new Effect(fn),
  };
}

const store = createSignalStore({
  user: { name: "Alice", age: 25 },
  todos: [{ title: "Buy milk", done: false }],
});




new Effect(() => {
  console.log("Info:", store.$.todos);
});



console.log()