'use client';

import * as React from 'react';
import { Paper, type PaperProps } from '@mui/material';
import { motion } from 'framer-motion';

const motionProps = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { type: 'spring', stiffness: 380, damping: 30 },
};

/**
 * Paper surface animated with Framer Motion. Used as the paper of dialogs and
 * menus so every overlay shares the same spring entrance (reduced-motion aware
 * through the global MotionConfig).
 */
export const MotionPaper = React.forwardRef<HTMLDivElement, PaperProps>(function MotionPaper(props, ref) {
  // MUI and Framer Motion event typings differ (onDrag); the runtime props are compatible.
  return <Paper {...props} {...(motionProps as object)} ref={ref} component={motion.div as unknown as React.ElementType} />;
});
