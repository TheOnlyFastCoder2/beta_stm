import { useImperativeHandle, useRef, type PropsWithChildren } from 'react';
import $ from './styles.module.css';
import { useSignalStore } from '../..';
import { Active } from '../Active';

export interface ImpRef {
  toOpen: () => void;
  toClose: (cb?: (isBlock: boolean) => void) => void;
}

export interface Props extends PropsWithChildren {
  impRef: React.RefObject<Partial<ImpRef>>;
  mode?: 'overlay' | 'normal';
  delay?: number;
  isCloseOnOverlay?: boolean;
  className?: string;
  classNameContent?: string;
}

export default function Popup({
  className,
  impRef,
  delay = 100,
  children,
  isCloseOnOverlay = false,
  classNameContent = '',
  mode = 'normal',
}: Props) {
  const refPopup = useRef<HTMLDivElement>(null);
  const { $: st } = useSignalStore({
    isOpen: false,
    timeId: -1,
  });

  useImperativeHandle(impRef, () => ({
    toOpen: () => (st.isOpen.v = true),
    toClose: (cb) => {
      if (!!~st.timeId.v) return;
      cb?.(true);
      refPopup.current?.setAttribute?.('remove', 'true');
      st.timeId.v = setTimeout(() => {
        refPopup.current?.removeAttribute?.('remove');
        st.timeId.v = -1;
        st.isOpen.v = false;
        cb?.(false);
      }, delay);
    },
  }));

  const handleClickOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCloseOnOverlay) return;
    e.currentTarget.setAttribute?.('remove', 'true');
    impRef.current.toClose?.();
  };

  return (
    <Active sg={st.isOpen} is={true}>
      <div
        onClick={handleClickOverlay}
        className={`${$.Popup} ${$[mode]} ${className}`}
        ref={refPopup}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`${$.content} ${classNameContent}`}
          children={children}
        />
      </div>
    </Active>
  );
}
