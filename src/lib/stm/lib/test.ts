const BRAND = Symbol('mini-signal');

let currentContext: Computed | Effect | undefined;
let batchedEffects: Set<Effect> | null = null;

let pendingEffects: Set<Effect> | null = null;
let flushScheduled = false;

function scheduleEffectRun(eff: Effect) {
  if (!pendingEffects) pendingEffects = new Set();
  pendingEffects.add(eff);
  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(flushEffects);
  }
}

function flushEffects() {
  if (!pendingEffects) return;
  const toRun = Array.from(pendingEffects);
  pendingEffects = null;
  flushScheduled = false;
  for (const eff of toRun) eff.run();
}

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
      const link: Link = { source: this, target: ctx };
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
    for (let node = this._targets; node; node = node.nextTarget) {
      node.target.markDirty();
    }
  }
}
export class Computed<T = any> {
  _sources?: Link;
  _targets?: Link;
  _dirty = true;
  _value!: T;

  constructor(private fn: () => T) {}

  get value() {
    if (this._dirty) this.recompute();

    if (currentContext) {
      const link: Link = { source: this as any, target: currentContext };
      link.nextTarget = this._targets;
      this._targets = link;

      link.nextSource = currentContext._sources;
      currentContext._sources = link;
    }

    return this._value;
  }

  recompute() {
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
    if (!this._targets) return;
    const outerBatch = !!batchedEffects;
    if (!outerBatch) batchedEffects = new Set();

    for (let n = this._targets; n; n = n.nextTarget) {
      n.target.markDirty();
    }

    if (!outerBatch) {
      const toRun = Array.from(batchedEffects!);
      batchedEffects = null;
      for (const eff of toRun) eff.run();
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
      if (typeof cleanup === 'function') this.disposeFn = cleanup;
      this._dirty = false;
    } finally {
      currentContext = prev;
    }
  }

  markDirty() {
    if (!this._dirty) {
      this._dirty = true;
      scheduleEffectRun(this);
    }
  }

  dispose() {
    if (this.disposeFn) this.disposeFn();
    this._sources = undefined;
  }
}

export const signal = <T>(value: T) => new Signal<T>(value);
export const computed = <T>(fn: () => T) => new Computed<T>(fn);
export const effect = (fn: () => void | (() => void)) => new Effect(fn);

