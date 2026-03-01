'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ForecastProject, computeTCV } from '@/lib/types';

interface Props {
  projects: ForecastProject[];
}

const RANGES = [
  { label: 'Muy alta (75-100%)', min: 0.75, max: 1.0, color: 'bg-emerald-500', text: 'text-emerald-700' },
  { label: 'Alta (50-74%)', min: 0.50, max: 0.74, color: 'bg-blue-500', text: 'text-blue-700' },
  { label: 'Media (25-49%)', min: 0.25, max: 0.49, color: 'bg-amber-500', text: 'text-amber-700' },
  { label: 'Baja (0-24%)', min: 0.0, max: 0.24, color: 'bg-red-500', text: 'text-red-700' },
] as const;

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
}

export function PipelineFunnel({ projects }: Props) {
  // Exclude backlog (prob=1, already secured revenue)
  const pipelineProjects = projects.filter(p => p.type === 'pipeline' || p.type === 'product');

  const rangeData = RANGES.map(range => {
    const inRange = pipelineProjects.filter(
      p => p.probability >= range.min && p.probability <= range.max
    );
    const tcv = inRange.reduce((sum, p) => sum + computeTCV(p), 0);
    return { ...range, count: inRange.length, tcv };
  });

  const maxTcv = Math.max(...rangeData.map(r => r.tcv), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Funnel pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rangeData.map(range => (
          <div key={range.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${range.text}`}>{range.label}</span>
              <span className="text-muted-foreground">
                {range.count} proy. &middot; {fmt(range.tcv)} EUR
              </span>
            </div>
            <div className="h-5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${range.color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                style={{ width: `${Math.max((range.tcv / maxTcv) * 100, range.count > 0 ? 8 : 0)}%` }}
              >
                {range.count > 0 && (
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">
                    {fmt(range.tcv)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="pt-1 border-t text-xs text-muted-foreground">
          Total pipeline: {pipelineProjects.length} proyectos &middot; TCV: {fmt(pipelineProjects.reduce((s, p) => s + computeTCV(p), 0))} EUR
        </div>
      </CardContent>
    </Card>
  );
}
