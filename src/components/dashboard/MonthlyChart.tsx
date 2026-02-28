'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MonthlyValues, MONTH_KEYS, MONTH_LABELS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  monthlyBacklog: MonthlyValues;
  monthlyPipeline: MonthlyValues;
  monthlyProducts: MonthlyValues;
}

export function MonthlyChart({ monthlyBacklog, monthlyPipeline, monthlyProducts }: Props) {
  const data = MONTH_KEYS.map(k => ({
    month: MONTH_LABELS[k],
    Backlog: Math.round(monthlyBacklog[k]),
    Pipeline: Math.round(monthlyPipeline[k]),
    Productos: Math.round(monthlyProducts[k]),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue mensual 2026</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
            <Tooltip
              formatter={(value) => (typeof value === 'number' ? value : 0).toLocaleString('es-ES') + ' EUR'}
              contentStyle={{ fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="Backlog" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Pipeline" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Productos" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
