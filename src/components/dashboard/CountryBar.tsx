'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COUNTRY_LABELS, Country } from '@/lib/types';

interface Props {
  byCountry: Record<string, number>;
}

export function CountryBar({ byCountry }: Props) {
  const data = Object.entries(byCountry)
    .map(([k, v]) => ({
      country: COUNTRY_LABELS[k as Country] || k,
      value: Math.round(v),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue por país</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ left: 70 }}>
            <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
            <YAxis type="category" dataKey="country" tick={{ fontSize: 12 }} width={65} />
            <Tooltip formatter={(v) => (typeof v === 'number' ? v : 0).toLocaleString('es-ES') + ' EUR'} />
            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
