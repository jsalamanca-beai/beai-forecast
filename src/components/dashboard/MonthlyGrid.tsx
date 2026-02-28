'use client';

import { useMemo, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ForecastProject,
  ForecastType,
  Segment,
  MONTH_KEYS,
  MONTH_LABELS,
  computeMonthly,
  MonthlyValues,
} from '@/lib/types';

interface Props {
  projects: ForecastProject[];
}

const TYPE_COLORS: Record<ForecastType, string> = {
  backlog: 'bg-emerald-100 text-emerald-800',
  pipeline: 'bg-blue-100 text-blue-800',
  product: 'bg-violet-100 text-violet-800',
};

const TYPE_LABELS: Record<ForecastType, string> = {
  backlog: 'Backlog',
  pipeline: 'Pipeline',
  product: 'Producto',
};

function fmt(n: number): string {
  if (n === 0) return '';
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 });
}

function fmtTotal(n: number): string {
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 });
}

function cellBg(value: number, max: number): string {
  if (value === 0 || max === 0) return '';
  const intensity = Math.min(value / max, 1);
  const alpha = Math.round(intensity * 20 + 5);
  return `bg-blue-${alpha > 15 ? '100' : '50'}`;
}

// Group projects by segment > client
interface GroupedRow {
  type: 'segment-header' | 'client-header' | 'project' | 'segment-total' | 'grand-total';
  label: string;
  badge?: { text: string; className: string };
  probability?: number;
  monthly: MonthlyValues;
  total: number;
  depth: number;
}

export function MonthlyGrid({ projects }: Props) {
  const [filterType, setFilterType] = useState<ForecastType | 'all'>('all');
  const [groupBy, setGroupBy] = useState<'segment' | 'type' | 'flat'>('segment');

  const rows = useMemo(() => {
    const filtered = filterType === 'all' ? projects : projects.filter(p => p.type === filterType);
    const result: GroupedRow[] = [];

    const emptyMonthly = (): MonthlyValues => ({ jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 });
    const addMonthly = (target: MonthlyValues, source: MonthlyValues) => {
      MONTH_KEYS.forEach(k => { target[k] += source[k]; });
    };
    const sumMonthly = (m: MonthlyValues): number => MONTH_KEYS.reduce((s, k) => s + m[k], 0);

    if (groupBy === 'flat') {
      // Simple flat list sorted by total desc
      const grandMonthly = emptyMonthly();
      filtered
        .map(p => ({ project: p, monthly: computeMonthly(p) }))
        .sort((a, b) => sumMonthly(b.monthly) - sumMonthly(a.monthly))
        .forEach(({ project, monthly }) => {
          addMonthly(grandMonthly, monthly);
          result.push({
            type: 'project',
            label: `${project.name} (${project.client})`,
            badge: { text: TYPE_LABELS[project.type], className: TYPE_COLORS[project.type] },
            probability: project.probability,
            monthly,
            total: sumMonthly(monthly),
            depth: 0,
          });
        });
      result.push({
        type: 'grand-total',
        label: 'TOTAL',
        monthly: grandMonthly,
        total: sumMonthly(grandMonthly),
        depth: 0,
      });
    } else {
      // Group by segment or type
      const groupKey = groupBy === 'segment' ? 'segment' : 'type';
      const groups = new Map<string, ForecastProject[]>();

      filtered.forEach(p => {
        const key = groupBy === 'segment' ? (p.segment === 'ignis' ? 'Ignis' : 'No Ignis') : TYPE_LABELS[p.type];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(p);
      });

      const grandMonthly = emptyMonthly();

      for (const [groupName, groupProjects] of groups) {
        const groupMonthly = emptyMonthly();

        // Sub-group by client within each group
        const byClient = new Map<string, ForecastProject[]>();
        groupProjects.forEach(p => {
          const ck = p.parentClient || p.client;
          if (!byClient.has(ck)) byClient.set(ck, []);
          byClient.get(ck)!.push(p);
        });

        // Sort clients by total desc
        const sortedClients = [...byClient.entries()].sort((a, b) => {
          const totalA = a[1].reduce((s, p) => { const m = computeMonthly(p); return s + MONTH_KEYS.reduce((ss, k) => ss + m[k], 0); }, 0);
          const totalB = b[1].reduce((s, p) => { const m = computeMonthly(p); return s + MONTH_KEYS.reduce((ss, k) => ss + m[k], 0); }, 0);
          return totalB - totalA;
        });

        result.push({
          type: 'segment-header',
          label: groupName,
          monthly: emptyMonthly(), // will be filled
          total: 0,
          depth: 0,
        });
        const segHeaderIdx = result.length - 1;

        for (const [clientName, clientProjects] of sortedClients) {
          const clientMonthly = emptyMonthly();

          if (clientProjects.length > 1) {
            result.push({
              type: 'client-header',
              label: clientName,
              monthly: emptyMonthly(),
              total: 0,
              depth: 1,
            });
            const clientHeaderIdx = result.length - 1;

            clientProjects.forEach(p => {
              const m = computeMonthly(p);
              addMonthly(clientMonthly, m);
              result.push({
                type: 'project',
                label: p.name,
                badge: { text: TYPE_LABELS[p.type], className: TYPE_COLORS[p.type] },
                probability: p.probability,
                monthly: m,
                total: sumMonthly(m),
                depth: 2,
              });
            });

            result[clientHeaderIdx].monthly = { ...clientMonthly };
            result[clientHeaderIdx].total = sumMonthly(clientMonthly);
          } else {
            const p = clientProjects[0];
            const m = computeMonthly(p);
            addMonthly(clientMonthly, m);
            result.push({
              type: 'project',
              label: `${p.name} (${clientName})`,
              badge: { text: TYPE_LABELS[p.type], className: TYPE_COLORS[p.type] },
              probability: p.probability,
              monthly: m,
              total: sumMonthly(m),
              depth: 1,
            });
          }

          addMonthly(groupMonthly, clientMonthly);
        }

        result[segHeaderIdx].monthly = { ...groupMonthly };
        result[segHeaderIdx].total = sumMonthly(groupMonthly);
        addMonthly(grandMonthly, groupMonthly);
      }

      result.push({
        type: 'grand-total',
        label: 'TOTAL',
        monthly: grandMonthly,
        total: sumMonthly(grandMonthly),
        depth: 0,
      });
    }

    return result;
  }, [projects, filterType, groupBy]);

  // Find max monthly value for heatmap
  const maxMonthly = useMemo(() => {
    let max = 0;
    rows.forEach(r => {
      if (r.type === 'project') {
        MONTH_KEYS.forEach(k => { if (r.monthly[k] > max) max = r.monthly[k]; });
      }
    });
    return max;
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Vista mensual (Ene - Dic 2026)</CardTitle>
          <div className="flex gap-2">
            <Select value={groupBy} onValueChange={v => setGroupBy(v as 'segment' | 'type' | 'flat')}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="segment">Agrupar: Segmento</SelectItem>
                <SelectItem value="type">Agrupar: Tipo</SelectItem>
                <SelectItem value="flat">Sin agrupar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={v => setFilterType(v as ForecastType | 'all')}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="pipeline">Pipeline</SelectItem>
                <SelectItem value="product">Producto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[220px]">Proyecto</TableHead>
              <TableHead className="text-center w-12">Prob</TableHead>
              <TableHead className="text-right font-semibold min-w-[80px]">Total</TableHead>
              {MONTH_KEYS.map(k => (
                <TableHead key={k} className="text-right min-w-[70px]">{MONTH_LABELS[k]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => {
              const isHeader = row.type === 'segment-header' || row.type === 'client-header';
              const isTotal = row.type === 'grand-total';
              const isSectionTotal = row.type === 'segment-header';

              return (
                <TableRow
                  key={i}
                  className={
                    isTotal ? 'bg-gray-100 font-bold border-t-2' :
                    isSectionTotal ? 'bg-gray-50 font-semibold' :
                    row.type === 'client-header' ? 'bg-gray-50/50 font-medium' :
                    ''
                  }
                >
                  <TableCell
                    className={`sticky left-0 z-10 text-sm ${
                      isTotal ? 'bg-gray-100 font-bold' :
                      isSectionTotal ? 'bg-gray-50 font-semibold' :
                      row.type === 'client-header' ? 'bg-gray-50/50 font-medium' :
                      'bg-background'
                    }`}
                    style={{ paddingLeft: `${(row.depth * 16) + 16}px` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate">{row.label}</span>
                      {row.badge && (
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${row.badge.className}`}>
                          {row.badge.text}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {row.probability !== undefined && (
                      <span className={row.probability >= 0.9 ? 'text-emerald-700' : row.probability >= 0.5 ? 'text-blue-700' : 'text-amber-700'}>
                        {(row.probability * 100).toFixed(0)}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums font-semibold">
                    {fmtTotal(row.total)}
                  </TableCell>
                  {MONTH_KEYS.map(k => {
                    const val = row.monthly[k];
                    const isProjectRow = row.type === 'project';
                    const intensity = isProjectRow && maxMonthly > 0 ? val / maxMonthly : 0;
                    return (
                      <TableCell
                        key={k}
                        className={`text-right text-sm tabular-nums ${
                          isTotal || isSectionTotal ? '' :
                          val > 0 && isProjectRow ? (intensity > 0.5 ? 'bg-blue-100' : intensity > 0.2 ? 'bg-blue-50' : '') : ''
                        }`}
                      >
                        {fmt(val)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
