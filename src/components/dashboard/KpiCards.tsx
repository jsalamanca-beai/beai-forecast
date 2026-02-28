'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';

interface KpiCardsProps {
  totalBacklog: number;
  totalPipelineWeighted: number;
  totalPipelineTCV: number;
  totalForecast: number;
  ignisPercent: number;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
}

export function KpiCards({ totalBacklog, totalPipelineWeighted, totalPipelineTCV, totalForecast, ignisPercent }: KpiCardsProps) {
  const cards = [
    {
      label: 'Backlog',
      value: fmt(totalBacklog),
      sub: 'Contratos firmados',
      icon: Briefcase,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pipeline ponderado',
      value: fmt(totalPipelineWeighted),
      sub: `TCV: ${fmt(totalPipelineTCV)}`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Forecast total',
      value: fmt(totalForecast),
      sub: 'Backlog + Pipeline + Productos',
      icon: DollarSign,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Concentración Ignis',
      value: ignisPercent.toFixed(0) + '%',
      sub: ignisPercent > 40 ? 'Riesgo alto' : 'Diversificado',
      icon: AlertTriangle,
      color: ignisPercent > 40 ? 'text-amber-600' : 'text-emerald-600',
      bg: ignisPercent > 40 ? 'bg-amber-50' : 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold mt-1">{c.value} <span className="text-sm font-normal text-muted-foreground">EUR</span></p>
                <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
