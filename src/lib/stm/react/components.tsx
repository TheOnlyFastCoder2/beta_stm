import { useState } from "react";
import type { ReactSignal } from "./types";
import React from "react";

interface ActiveProps<T> {
  sg: ReactSignal<T>;
  is: T;
  children: React.ReactNode;
}

export function Active<T>({ sg, is, children }: ActiveProps<T>) {
  const [val, set] = useState(false);
  sg.useComputed<any>(() => {
    set(sg.v === is);
  });
  return val && children;
}
