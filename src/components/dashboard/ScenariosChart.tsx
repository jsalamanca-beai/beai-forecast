'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ForecastProject, ForecastYear, MONTH_KEYS, MONTH_LABELS, MonthlyValues,
} from '@/lib/types';

interface Props {
  projects: ForecastProject[];
  selectedYear: ForecastYear;
}

function computeMonthlyOverride(
  project: ForecastProject,
  year: ForecastYear,
  probOverride?: number,
): MonthlyValues {
  const monthly: MonthlyValues = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 };
  const startIdx = MONTH_KEYS.indexOf(project.startMonth);
  if (startIdx === -1) return monthly;
  const projectYear = project.startYear ?? 2026;
  const prob = probOverride ?? project.probability;

  for (let i = 0; i < project.durationMonths; i++) {
    const absoluteIdx = startIdx + i;
    const yearOffset = Math.floor(absoluteIdx / 12);
    const monthIdx = absoluteIdx % 12;
    const currentYear = projectYear + yearOffset;
    if (currentYear === year) {
      monthly[MONTH_KEYS[monthIdx]] += project.monthlyAmount * prob;
    }
  }
  return monthly;
}

export function ScenariosChart({ projects, selectedYear }: Props) {
  const backlog = projects.filter(p => p.type === 'backlog');
  const pipelineAndProducts = projects.filter(p => p.type === 'pipeline' || p.type === 'product');

  const data = MONTH_KEYS.map((k, idx) => {
    // Pessimistic: only backlog (already prob=1)
    let pessimistic = 0;
    backlog.forEach(p => {
      pessimistic += computeMonthlyOverride(p, selectedYear)[k];
    });

    // Expected: backlog + pipeline/products weighted (current probability)
    let expected = pessimistic;
    pipelineAndProducts.forEach(p => {
      expected += computeMonthlyOverride(p, selectedYear)[k];
    });

    // Optimistic: everything at 100%
    let optimistic = 0;
    projects.forEach(p => {
      optimistic += computeMonthlyOverride(p, selectedYear, 1)[k];
    });

    return {
      month: MONTH_LABELS[k],
      Pesimista: Math.round(pessimistic),
      Esperado: Math.round(expected),
      Optimista: Math.round(optimistic),
    };
  });

  // Accumulate month over month
  const accumulated = data.map((d, i) => {
    if (i === 0) return { ...d };
    return {
      ...d,
      Pesimista: d.Pesimista + data.slice(0, i).reduce((s, x) => s + x.Pesimista, 0),
      Esperado: d.Esperado + data.slice(0, i).reduce((s, x) => s + x.Esperado, 0),
      Optimista: d.Optimista + data.slice(0, i).reduce((s, x) => s + x.Optimista, 0),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Escenarios acumulados {selectedYear}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={accumulated} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
            <Tooltip
              formatter={(value) => (typeof value === 'number' ? value : 0).toLocaleString('es-ES') + ' EUR'}
              contentStyle={{ fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Area
              type="monotone"
              dataKey="Optimista"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="4 2"
            />
            <Area
              type="monotone"
              dataKey="Esperado"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.2}
              strokeWidth={2.5}
            />
            <Area
              type="monotone"
              dataKey="Pesimista"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
