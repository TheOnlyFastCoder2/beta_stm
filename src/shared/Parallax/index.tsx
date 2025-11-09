import type { PropsWithChildren } from 'react';
import $ from './styles.module.css';
import React, { useEffect, useRef } from 'react';
import { useSignalStore } from '../../lib/stm/react';
import { Spring } from '../../lib/stm/react/lib/animation/Spring';

interface Props {
  height?: number;
  children: React.ReactElement<typeof Parallax.Item> | React.ReactElement<typeof Parallax.Item>[];
}

export default function Parallax({ children, height = 100 }: Props) {
  const count = React.Children.count(children);

  return (
    <div className={$.Parallax} style={{ height: `${count * height}vh` }}>
      {React.Children.map(children, (child, index) => (
        <div className={$.section} key={index}>
          {child}
        </div>
      ))}
    </div>
  );
}

Parallax.Item = function ParallaxItem({ children }: PropsWithChildren) {
  return <div className={$.section}>{children}</div>;
};

export function Container() {
  return (
    <div className={$.container}>
      <div className={$.div}>div1</div>

      <Parallax>
        {['Первый экран', 'Второй экран', 'Третий экран'].map((name, index, arr) => {
          console.log(0.42 + index * 0.2);
          return (
            <Parallax.Item key={index}>
              <Spring
                coverThreshold={0.5}
                className={$.spring}
                index={index}
                total={arr.length}
                visibility={{
                  enterAt: [[0.42 - index / 100, 0.9]],

                  watchNext: 2,
                  debug: true,
                }}
                spring={{
                  opacity: { values: { default: 0, active: 1 }, stiffness: 100, damping: 20 },
                  scale: { values: { default: 0, active: 1 }, stiffness: 140, damping: 20 },
                }}
              >
                {name}
              </Spring>
            </Parallax.Item>
          );
        })}
      </Parallax>

      <div className={$.div}>div2</div>
    </div>
  );
}
