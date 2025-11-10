import { memo, useEffect as _useEffect, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { Computed, computed, Effect, effect, Signal, SignalMap, type TSignal } from '../index';

export function useSignal<T>(initialValue: T) {
  const listeners = useRef<Set<() => void>>(new Set());

  const middleware = useRef(() => {
    for (const l of listeners.current) l();
  });

  const sigRef = useRef<Signal>(null);
  if (!sigRef.current) {
    sigRef.current = new Signal(initialValue, () => middleware.current());
    const sig = sigRef.current;

    const Comp = memo(() => {
      const value = useSyncExternalStore(
        (listener) => {
          listeners.current.add(listener);
          return () => listeners.current.delete(listener);
        },
        () => sig.v
      );
      return renderValue(value);
    });

    Object.defineProperty(sig, 'c', {
      configurable: true,
      enumerable: false,
      value: <Comp />,
    });
  }

  return sigRef.current;
}

export function useComputed<T>(fn: () => T) {
  const listeners = useRef(new Set<() => void>());

  const middleware = useRef(() => {
    for (const l of listeners.current) l();
  });

  const compRef = useRef<Computed<T>>(null);
  if (!compRef.current) {
    compRef.current = computed(fn);

    const comp = compRef.current;

    effect(() => {
      comp.v;
      middleware.current();
    });

    const Comp = memo(() => {
      const value = useSyncExternalStore(
        (listener) => {
          listeners.current.add(listener);
          return () => listeners.current.delete(listener);
        },
        () => comp.v
      );
      return renderValue(value);
    });

    Object.defineProperty(comp, 'c', {
      configurable: true,
      enumerable: false,
      value: <Comp key="computed" />,
    });
  }

  return compRef.current!;
}

export function useWatch(fn: () => void | (() => void)) {
  const cb = useRef(fn);
  cb.current = fn;

  _useEffect(() => {
    const eff = new Effect(() => {
      return cb.current();
    });

    return () => eff.dispose();
  }, [cb]);
}

export function renderValue<T>(value: T): React.ReactElement {
  if (typeof value === 'object' && value !== null && 'type' in (value as any)) {
    return value as unknown as React.ReactElement;
  }

  return <>{String(value)}</>;
}

export function useSignalMap<T extends any[]>(initialValue: T): TSignal<T> {
  const listeners = useRef<Set<() => void>>(new Set());

  const middleware = useRef(() => {
    for (const l of listeners.current) l();
  });

  const sigMapRef = useRef<SignalMap<T>>(null);
  if (!sigMapRef.current) {
    sigMapRef.current = new SignalMap(
      initialValue,
      () => middleware.current(),
      (comp:TSignal<any>) => {
        const Comp = memo(() => {
          const value = useSyncExternalStore(
            (listener) => {
              listeners.current.add(listener);
              return () => listeners.current.delete(listener);
            },
            () => comp.v
          );
          return renderValue(value);
        });

        Object.defineProperty(comp, 'c', {
          configurable: true,
          enumerable: false,
          value: <Comp key="computed" />,
        });
      }
    );

    const signal = sigMapRef.current;
    const originMap = signal.effectMap;

    Object.defineProperty(signal, 'map', {
      configurable: true,
      enumerable: false,
      value: (renderFn: (item: any, index: number) => React.ReactNode) => {
        const state = useSyncExternalStore(
          (listener) => {
            const eff = originMap.call(signal, () => listener());
            return () => eff.dispose();
          },
          () => signal.v
        );
        return state.map(renderFn);
      },
    });
  }

  return sigMapRef.current as any as TSignal<T>;
}
