import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import gsap from 'gsap';
import './CardSwap.css';

export const Card = forwardRef(({ customClass, ...rest }, ref) => (
  <div ref={ref} {...rest} className={`card ${customClass ?? ''} ${rest.className ?? ''}`.trim()} />
));
Card.displayName = 'Card';

const makeSlot = (i, distX, distY, total) => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
});
const placeNow = (el, slot, skew) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true,
  });

const CardSwap = forwardRef(
  (
    {
      width = 500,
      height = 400,
      cardDistance = 60,
      verticalDistance = 70,
      delay = 1000,
      pauseOnHover = false,
      onCardClick,
      skewAmount = 6,
      easing = 'elastic',
      children,
    },
    ref
  ) => {
    const config =
      easing === 'elastic'
        ? {
            ease: 'elastic.out(0.8,0.6)',
            durDrop: 0.9,
            durMove: 0.9,
            durReturn: 0.9,
            promoteOverlap: 0.85,
            returnDelay: 0.08,
          }
        : {
            ease: 'power1.inOut',
            durDrop: 0.8,
            durMove: 0.8,
            durReturn: 0.8,
            promoteOverlap: 0.45,
            returnDelay: 0.2,
          };

    const childArr = useMemo(() => Children.toArray(children), [children]);
    const refs = useMemo(() => childArr.map(() => React.createRef()), [childArr.length]);

    const order = useRef(Array.from({ length: childArr.length }, (_, i) => i));

    const tlRef = useRef(null);
    const intervalRef = useRef();
    const container = useRef(null);
    const swapFuncRef = useRef(null);

    const swapReverseFuncRef = useRef(null);

    // Expose swap functions via ref
    useImperativeHandle(ref, () => ({
      swap: () => {
        if (swapFuncRef.current) {
          swapFuncRef.current();
        }
      },
      swapReverse: () => {
        if (swapReverseFuncRef.current) {
          swapReverseFuncRef.current();
        }
      },
    }));

    useEffect(() => {
      const total = refs.length;
      refs.forEach((r, i) => placeNow(r.current, makeSlot(i, cardDistance, verticalDistance, total), skewAmount));

      const swap = () => {
        if (order.current.length < 2) return;

        // Kill any ongoing animation and complete its state immediately
        if (tlRef.current && tlRef.current.isActive()) {
          tlRef.current.progress(1).kill();
        }

        const [front, ...rest] = order.current;
        const elFront = refs[front].current;
        const tl = gsap.timeline();
        tlRef.current = tl;

        tl.to(elFront, {
          y: '+=500',
          duration: config.durDrop,
          ease: config.ease,
        });

        tl.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`);
        rest.forEach((idx, i) => {
          const el = refs[idx].current;
          const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
          tl.set(el, { zIndex: slot.zIndex }, 'promote');
          tl.to(
            el,
            {
              x: slot.x,
              y: slot.y,
              z: slot.z,
              duration: config.durMove,
              ease: config.ease,
            },
            `promote+=${i * 0.15}`
          );
        });

        const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length);
        tl.addLabel('return', `promote+=${config.durMove * config.returnDelay}`);
        tl.call(
          () => {
            gsap.set(elFront, { zIndex: backSlot.zIndex });
          },
          undefined,
          'return'
        );
        tl.to(
          elFront,
          {
            x: backSlot.x,
            y: backSlot.y,
            z: backSlot.z,
            duration: config.durReturn,
            ease: config.ease,
          },
          'return'
        );

        tl.call(() => {
          order.current = [...rest, front];
        });
      };

      const swapReverse = () => {
        if (order.current.length < 2) return;

        // Kill any ongoing animation and complete its state immediately
        if (tlRef.current && tlRef.current.isActive()) {
          tlRef.current.progress(1).kill();
        }

        // Get the last card and bring it to front
        const back = order.current[order.current.length - 1];
        const rest = order.current.slice(0, -1);
        const elBack = refs[back].current;
        const tl = gsap.timeline();
        tlRef.current = tl;

        // First, move the back card out and down (prepare for the move)
        tl.to(elBack, {
          y: '+=500',
          duration: config.durDrop,
          ease: config.ease,
        });

        tl.addLabel('demote', `-=${config.durDrop * config.promoteOverlap}`);

        // Move all other cards back one position
        rest.forEach((idx, i) => {
          const el = refs[idx].current;
          const slot = makeSlot(i + 1, cardDistance, verticalDistance, refs.length);
          tl.set(el, { zIndex: slot.zIndex }, 'demote');
          tl.to(
            el,
            {
              x: slot.x,
              y: slot.y,
              z: slot.z,
              duration: config.durMove,
              ease: config.ease,
            },
            `demote+=${i * 0.15}`
          );
        });

        // Return the back card to the front position
        const frontSlot = makeSlot(0, cardDistance, verticalDistance, refs.length);
        tl.addLabel('return', `demote+=${config.durMove * config.returnDelay}`);
        tl.call(
          () => {
            gsap.set(elBack, { zIndex: frontSlot.zIndex });
          },
          undefined,
          'return'
        );
        tl.to(
          elBack,
          {
            x: frontSlot.x,
            y: frontSlot.y,
            z: frontSlot.z,
            duration: config.durReturn,
            ease: config.ease,
          },
          'return'
        );

        tl.call(() => {
          order.current = [back, ...rest];
        });
      };

      // Store swap functions in refs so they can be called externally
      swapFuncRef.current = swap;
      swapReverseFuncRef.current = swapReverse;

      // Start the interval without calling swap immediately, so the first card shows first
      intervalRef.current = window.setInterval(swap, delay);

      if (pauseOnHover) {
        const node = container.current;
        const pause = () => {
          tlRef.current?.pause();
          clearInterval(intervalRef.current);
        };
        const resume = () => {
          tlRef.current?.play();
          intervalRef.current = window.setInterval(swap, delay);
        };
        node.addEventListener('mouseenter', pause);
        node.addEventListener('mouseleave', resume);
        return () => {
          node.removeEventListener('mouseenter', pause);
          node.removeEventListener('mouseleave', resume);
          clearInterval(intervalRef.current);
        };
      }
      return () => clearInterval(intervalRef.current);
    }, [cardDistance, verticalDistance, delay, pauseOnHover, skewAmount, easing]);

    const rendered = childArr.map((child, i) =>
      isValidElement(child)
        ? cloneElement(child, {
            key: i,
            ref: refs[i],
            style: { width, height, ...(child.props.style ?? {}) },
            onClick: (e) => {
              child.props.onClick?.(e);
              onCardClick?.(i);
            },
          })
        : child
    );

    return (
      <div ref={container} className="card-swap-container" style={{ width, height }}>
        {rendered}
      </div>
    );
  }
);

CardSwap.displayName = 'CardSwap';

export default CardSwap;
