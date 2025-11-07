import { useRef } from 'react';
import $ from './styles.module.css';
import { useSignalStore } from '../../lib/stm/react';

export default function Button({
  className = '',
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const store = useSignalStore({
    x: 0,
    y: 0,
  });
  const timeId = useRef<number | undefined>(undefined);

  const ref = store.useComputed<HTMLDivElement>(({ current: el }) => {
    el.style.left = `${store.$.x.v}px`;
    el.style.top = `${store.$.y.v}px`;
    clearTimeout(timeId.current);
    el.classList.remove($.animation);
    void el.offsetWidth;
    el.classList.add($.animation);
    timeId.current = setTimeout(() => {
      el.classList.remove($.animation);
    }, 600);
  });

  const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    store.$.x.v = e.clientX - rect.left;
    store.$.y.v = e.clientY - rect.top;
    onClick?.(e);
  };

  return (
    <button {...props} className={`${$.Button} ${className}`} onClick={handleClick}>
      <div className={ $.Button_wrapper } /> 
      ref={ref}
      {children}
    </button>
  );
}
