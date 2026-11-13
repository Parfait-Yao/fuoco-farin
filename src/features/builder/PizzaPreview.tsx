'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDataStore } from '@/store/dataStore';
import { seededRandom } from '@/lib/utils';
import type { CustomPizzaConfig } from '@/types';
import { useMessages } from '@/i18n/client';

/** Deterministic topping positions inside the sauce circle. */
function toppingPositions(seed: number, count: number) {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * 68;
    return { x: 100 + Math.cos(angle) * radius, y: 100 + Math.sin(angle) * radius, r: rand() * 360 };
  });
}

const hash = (s: string) => s.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

interface PizzaPreviewProps {
  config: Partial<CustomPizzaConfig>;
  /** Spin slowly (decorative). */
  spinning?: boolean;
  className?: string;
}

/** Illustrated SVG pizza composed from the selected ingredients. */
export function PizzaPreview({ config, spinning, className }: PizzaPreviewProps) {
  const ingredients = useDataStore((s) => s.ingredients);
  const t = useMessages('builder');
  const find = (id?: string) => ingredients.find((i) => i.id === id);
  const base = find(config.baseId);
  const sauce = find(config.sauceId);
  const cheese = find(config.cheeseId);
  const veggies = (config.veggieIds ?? []).map((id) => find(id)).filter((v): v is NonNullable<typeof v> => Boolean(v));
  const stuffed = config.baseId === 'base-stuffed';
  const thin = config.baseId === 'base-thin';

  return (
    <motion.svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={t.previewAria([base?.name, sauce?.name, cheese?.name, ...veggies.map((v) => v.name)].filter(Boolean).join(', '))}
      className={className}
      animate={spinning ? { rotate: 360 } : undefined}
      transition={spinning ? { duration: 60, repeat: Infinity, ease: 'linear' } : undefined}
    >
      <defs>
        <radialGradient id="crust" cx="50%" cy="45%" r="60%">
          <stop offset="70%" stopColor={base?.color ?? '#E9DBC1'} />
          <stop offset="100%" stopColor="#8A5A2B" stopOpacity={base ? 0.9 : 0.2} />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Plate */}
      <circle cx="100" cy="100" r="98" fill="#fff" opacity="0.6" />
      {/* Crust */}
      <motion.circle
        cx="100"
        cy="100"
        r={thin ? 90 : 94}
        fill="url(#crust)"
        stroke={base ? '#B07A3E' : '#D9CBB0'}
        strokeDasharray={base ? undefined : '6 6'}
        strokeWidth={stuffed ? 6 : 2}
        filter="url(#soft)"
        initial={false}
        animate={{ scale: base ? 1 : 0.96 }}
      />
      {/* Sauce */}
      <AnimatePresence>
        {sauce && (
          <motion.circle
            key={sauce.id}
            cx="100"
            cy="100"
            r="80"
            fill={sauce.color}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.95 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 16 }}
            style={{ originX: '100px', originY: '100px' }}
          />
        )}
      </AnimatePresence>
      {/* Cheese */}
      <AnimatePresence>
        {cheese && cheese.color !== 'transparent' && (
          <motion.g key={cheese.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            {toppingPositions(hash(cheese.id), 16).map((p, i) => (
              <motion.ellipse
                key={i}
                cx={p.x}
                cy={p.y}
                rx={13}
                ry={9}
                fill={cheese.color}
                opacity={0.92}
                transform={`rotate(${p.r} ${p.x} ${p.y})`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.02 }}
              />
            ))}
          </motion.g>
        )}
      </AnimatePresence>
      {/* Veggies */}
      <AnimatePresence>
        {veggies.map((veg) => (
          <motion.g key={veg.id} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
            {toppingPositions(hash(veg.id), 7).map((p, i) =>
              i % 2 === 0 ? (
                <circle key={i} cx={p.x} cy={p.y} r={5.5} fill={veg.color} stroke="rgba(0,0,0,.15)" strokeWidth={0.8} />
              ) : (
                <rect key={i} x={p.x - 6} y={p.y - 2.5} width={12} height={5} rx={2.5} fill={veg.color} transform={`rotate(${p.r} ${p.x} ${p.y})`} />
              ),
            )}
          </motion.g>
        ))}
      </AnimatePresence>
    </motion.svg>
  );
}

/** Compact, non-animated variant for cart lines. */
export function MiniPizzaPreview({ config }: { config: CustomPizzaConfig }) {
  return <PizzaPreview config={config} className="h-full w-full" />;
}
