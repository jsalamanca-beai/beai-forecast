'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  ignisRevenue: number;
  totalForecast: number;
}

const COLORS = ['#f59e0b', '#6366f1'];

export function SegmentDonut({ ignisRevenue, totalForecast }: Props) {
  const noIgnis = totalForecast - ignisRevenue;
  const data = [
    { name: 'Ignis', value: Math.round(ignisRevenue) },
    { name: 'No Ignis', value: Math.round(noIgnis) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ignis vs No Ignis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => (typeof v === 'number' ? v : 0).toLocaleString('es-ES') + ' EUR'} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
