'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Check } from 'lucide-react';

interface Props {
  totalBacklog: number;
  totalPipelineWeighted: number;
  totalProducts: number;
  annualTarget: number;
  selectedYear: number;
  onTargetChange: (year: number, amount: number) => void;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
}

export function TargetProgress({
  totalBacklog,
  totalPipelineWeighted,
  totalProducts,
  annualTarget,
  selectedYear,
  onTargetChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const totalForecast = totalBacklog + totalPipelineWeighted + totalProducts;
  const target = annualTarget || 1;
  const pctTotal = Math.min((totalForecast / target) * 100, 100);
  const pctBacklog = Math.min((totalBacklog / target) * 100, 100);
  const pctPipeline = Math.min(((totalBacklog + totalPipelineWeighted) / target) * 100, 100);
  const pctAll = Math.min(((totalBacklog + totalPipelineWeighted + totalProducts) / target) * 100, 100);
  const fulfillment = ((totalForecast / target) * 100);

  function startEdit() {
    setInputValue((annualTarget / 1_000_000).toFixed(2));
    setEditing(true);
  }

  function confirmEdit() {
    const parsed = parseFloat(inputValue.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      onTargetChange(selectedYear, Math.round(parsed * 1_000_000));
    }
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Target vs Forecast {selectedYear}</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Target:</span>
            {editing ? (
              <span className="flex items-center gap-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmEdit()}
                  className="w-20 px-1.5 py-0.5 border rounded text-sm text-right"
                  autoFocus
                />
                <span className="text-xs text-muted-foreground">M EUR</span>
                <button onClick={confirmEdit} className="p-0.5 hover:bg-muted rounded">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="font-semibold">{fmt(annualTarget)} EUR</span>
                <button onClick={startEdit} className="p-0.5 hover:bg-muted rounded">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="relative h-8 bg-muted rounded-full overflow-hidden">
          {/* Backlog layer */}
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500"
            style={{ width: `${pctBacklog}%` }}
          />
          {/* Pipeline layer */}
          <div
            className="absolute inset-y-0 left-0 bg-blue-500 opacity-80 transition-all duration-500"
            style={{ width: `${pctPipeline}%`, clipPath: `inset(0 0 0 ${pctBacklog}%)` }}
          />
          {/* Products layer */}
          <div
            className="absolute inset-y-0 left-0 bg-violet-500 opacity-80 transition-all duration-500"
            style={{ width: `${pctAll}%`, clipPath: `inset(0 0 0 ${pctPipeline}%)` }}
          />
          {/* Target line */}
          <div
            className="absolute inset-y-0 w-0.5 border-l-2 border-dashed border-red-500 z-10"
            style={{ left: `${Math.min(100, (annualTarget / Math.max(totalForecast, annualTarget)) * 100)}%` }}
          />
          {/* Percentage label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white drop-shadow-md">
              {fulfillment.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span>Backlog: {fmt(totalBacklog)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span>Pipeline pond.: {fmt(totalPipelineWeighted)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-violet-500" />
            <span>Productos: {fmt(totalProducts)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-3 border-l-2 border-dashed border-red-500" />
            <span>Target: {fmt(annualTarget)}</span>
          </div>
          <div className="ml-auto font-semibold">
            Total forecast: {fmt(totalForecast)} EUR ({fulfillment.toFixed(1)}% del target)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
