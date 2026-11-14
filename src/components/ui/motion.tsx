'use client';

import * as React from 'react';
import { animate, motion, useInView, type HTMLMotionProps, type Variants } from 'framer-motion';
import { useFormat } from '@/i18n/client';

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/** Fades its children in when they scroll into view. */
export function Reveal({ children, delay = 0, className, ...rest }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeUp}
      transition={{ delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Grid/list wrapper that staggers the reveal of its <StaggerItem> children. */
export function Stagger({ children, className, ...rest }: HTMLMotionProps<'div'>) {
  // Items often arrive after mount (async catalog). If the grid was already in view
  // while empty, the one-shot reveal has fired and late items would stay hidden, so
  // remount the wrapper once it gets its first items to replay the reveal.
  const filled = React.Children.count(children) > 0;
  return (
    <motion.div key={filled ? 'filled' : 'empty'} className={className} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} {...rest}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={className} variants={fadeUp} {...rest}>
      {children}
    </motion.div>
  );
}

/** Page-level enter animation used by route templates. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

/** Counts up to a value when visible. Default format: rounded number in the page language. */
export function AnimatedNumber({ value, format: formatProp, duration = 1.2 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const fmt = useFormat();
  const format = formatProp ?? ((n: number) => fmt.number(Math.round(n)));
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = React.useState(format(0));
  // Keep the latest formatter without restarting the animation on every render.
  const formatRef = React.useRef(format);
  formatRef.current = format;
  const from = React.useRef(0);

  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(from.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        from.current = v;
        setDisplay(formatRef.current(v));
      },
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return <span ref={ref}>{display}</span>;
}
