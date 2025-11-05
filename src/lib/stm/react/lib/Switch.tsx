import React from 'react';
import { Active } from './Active';
import { useSignalStore } from '..';
import type { ReactSignal } from '../types';

interface SwitchProps<T> {
  sg: ReactSignal<T>;
  children: React.ReactNode;
}

type CaseCondition<T> = T | T[] | ((v: T) => boolean);

interface CaseProps<T> {
  is: CaseCondition<T>;
  children: React.ReactNode;
}

interface DefaultProps {
  children: React.ReactNode;
}

export function Switch<T>({ sg, children }: SwitchProps<T>) {
  const { $: store } = useSignalStore({
    isDefault: false,
    count: [0, 0],
    len: React.Children.count(children),
  });

  return (
    <>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              sg,
              isDefault: store.isDefault,
              count: store.count,
              len: store.len,
            } as any)
          : child
      )}
    </>
  );
}

Switch.Case = function Case<T>({
  sg,
  is,
  isDefault,
  count,
  len,
  children,
}: CaseProps<T> & {
  sg?: ReactSignal<T>;
  isDefault?: ReactSignal<boolean>;
  count?: ReactSignal<[number, number]>;
  len?: ReactSignal<number>;
}) {
  const condition = is as T | T[] | ((v: NonNullable<T>) => boolean);

  return (
    <Active
      sg={sg!}
      is={condition}
      callback={(match) => {
        count![0].v = (count![0].v + 1) % len!.v;

        if (match) {
          count![1].v += 1;
        }

        isDefault!.v = count![1].v === 0;

        if (count![0].v >= len!.v - 1) {
          count![0].v = 0;
          count![1].v = 0;
        }
      }}
    >
      {children}
    </Active>
  );
};

Switch.Default = function Default<T>({
  isDefault,
  children,
}: DefaultProps & { sg?: ReactSignal<T>; isDefault?: ReactSignal<boolean> }) {
  return (
    <Active sg={isDefault!} is={true}>
      {children}
    </Active>
  );
};
