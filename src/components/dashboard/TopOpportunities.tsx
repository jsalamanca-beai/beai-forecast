'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ForecastProject, computeTCV, computeWeightedTotal } from '@/lib/types';

interface Props {
  projects: ForecastProject[];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
}

export function TopOpportunities({ projects }: Props) {
  const pipeline = projects
    .filter(p => p.type === 'pipeline' || p.type === 'product')
    .sort((a, b) => computeTCV(b) - computeTCV(a))
    .slice(0, 7);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top oportunidades pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pipeline.map(p => (
          <div key={p.id} className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.client}</p>
            </div>
            <Badge variant="secondary" className="text-xs shrink-0">
              {(p.probability * 100).toFixed(0)}%
            </Badge>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">{fmt(computeTCV(p))}</p>
              <p className="text-xs text-muted-foreground">pond: {fmt(computeWeightedTotal(p))}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
