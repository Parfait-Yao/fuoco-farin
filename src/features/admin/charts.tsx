'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { useFormat, useMessages } from '@/i18n/client';
import { CHART_AXIS, CHART_COLORS, CHART_GRID } from './analytics';

/** Axis labels: amounts in cents shown as compact dollars ($1.2k). */
const compactMoney = (cents: number) => {
  const v = cents / 100;
  return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`;
};

function ChartTooltip({ active, payload, label, money }: TooltipProps<number, string> & { money?: boolean }) {
  const fmt = useFormat();
  if (!active || !payload?.length) return null;
  return (
    <Box className="rounded-xl border border-solid border-black/5 bg-white px-3 py-2 shadow-soft">
      {label && (
        <Typography variant="caption" color="text.secondary" className="block">
          {label}
        </Typography>
      )}
      {payload.map((p) => (
        <Box key={String(p.dataKey ?? p.name)} className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: (p.payload?.fill as string) ?? p.color }} />
          <Typography variant="body2" fontWeight={700}>
            {p.name}: {money ? fmt.price(Number(p.value)) : fmt.number(Number(p.value))}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

const axisProps = { stroke: CHART_AXIS, tickLine: false, axisLine: false, fontSize: 12 } as const;

/** Revenue over time: single series, area. */
export function RevenueChart({ data, height = 300 }: { data: { label: string; revenue: number }[]; height?: number }) {
  const reduced = useReducedMotion();
  const t = useMessages('admin');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} tickFormatter={compactMoney} width={52} />
        <Tooltip content={<ChartTooltip money />} cursor={{ stroke: CHART_AXIS, strokeDasharray: '4 4' }} />
        <Area type="monotone" dataKey="revenue" name={t.revenue} stroke={CHART_COLORS[0]} strokeWidth={2} fill="url(#rev)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={!reduced} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Orders per bucket: single series, bars. */
export function OrdersChart({ data, height = 300 }: { data: { label: string; orders: number }[]; height?: number }) {
  const reduced = useReducedMotion();
  const t = useMessages('admin');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(31,28,26,0.04)' }} />
        <Bar dataKey="orders" name={t.orders} fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={!reduced} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Ranked horizontal bars (top products, districts…). */
export function RankingChart({ data, dataKey, nameKey = 'name', money, height }: { data: Record<string, string | number>[]; dataKey: string; nameKey?: string; money?: boolean; height?: number }) {
  const reduced = useReducedMotion();
  const t = useMessages('admin');
  const fmt = useFormat();
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(160, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey={nameKey} {...axisProps} width={140} tick={{ fill: '#1F1C1A', fontSize: 12 }} />
        <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: 'rgba(31,28,26,0.04)' }} />
        <Bar
          dataKey={dataKey}
          name={money ? t.revenue : t.quantity}
          fill={CHART_COLORS[0]}
          radius={[0, 4, 4, 0]}
          barSize={18}
          isAnimationActive={!reduced}
          label={{ position: 'right', fontSize: 12, fill: '#4A4542', formatter: (v: number) => (money ? compactMoney(v) : fmt.number(v)) }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Part-to-whole donut with legend and percentages (identity never by color alone). */
export function DonutChart({ data, height = 240 }: { data: { name: string; value: number }[]; height?: number }) {
  const reduced = useReducedMotion();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const t = useMessages('admin');
  return (
    <Box className="grid items-center gap-4 sm:grid-cols-[1fr_1fr]">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="#fff" strokeWidth={2} isAnimationActive={!reduced}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <Box component="ul" className="m-0 list-none space-y-2 p-0" aria-label={t.legend}>
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="flex-1 text-charcoal-700">{d.name}</span>
            <strong className="text-charcoal-800">{Math.round((d.value / total) * 100)}%</strong>
          </li>
        ))}
      </Box>
    </Box>
  );
}
