'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  ForecastProject,
  ForecastType,
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

function fmtK(n: number): string {
  if (n === 0) return '';
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + 'K';
  return n.toFixed(0);
}

function fmtTotalK(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + 'K';
  return n.toFixed(0);
}

// Row model
interface GridRow {
  id: string; // unique key for collapse tracking
  type: 'segment-header' | 'client-header' | 'project' | 'grand-total';
  label: string;
  badge?: { text: string; className: string };
  probability?: number;
  monthly: MonthlyValues;
  total: number;
  depth: number;
  parentId?: string; // client-header id for projects, segment id for clients
  collapsible: boolean; // can be toggled
  childCount?: number;
}

const emptyMonthly = (): MonthlyValues => ({ jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 });
const addMonthly = (target: MonthlyValues, source: MonthlyValues) => {
  MONTH_KEYS.forEach(k => { target[k] += source[k]; });
};
const sumMonthly = (m: MonthlyValues): number => MONTH_KEYS.reduce((s, k) => s + m[k], 0);

export function MonthlyGrid({ projects }: Props) {
  const [filterType, setFilterType] = useState<ForecastType | 'all'>('all');
  const [groupBy, setGroupBy] = useState<'segment' | 'type' | 'flat'>('segment');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsed(new Set(rows.filter(r => r.collapsible).map(r => r.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, filterType, groupBy]);

  const expandAll = useCallback(() => {
    setCollapsed(new Set());
  }, []);

  const rows = useMemo(() => {
    const filtered = filterType === 'all' ? projects : projects.filter(p => p.type === filterType);
    const result: GridRow[] = [];

    if (groupBy === 'flat') {
      const grandMonthly = emptyMonthly();
      filtered
        .map(p => ({ project: p, monthly: computeMonthly(p) }))
        .sort((a, b) => sumMonthly(b.monthly) - sumMonthly(a.monthly))
        .forEach(({ project, monthly }) => {
          addMonthly(grandMonthly, monthly);
          result.push({
            id: project.id,
            type: 'project',
            label: `${project.name} (${project.client})`,
            badge: { text: TYPE_LABELS[project.type], className: TYPE_COLORS[project.type] },
            probability: project.probability,
            monthly,
            total: sumMonthly(monthly),
            depth: 0,
            collapsible: false,
          });
        });
      result.push({
        id: 'grand-total',
        type: 'grand-total',
        label: 'TOTAL',
        monthly: grandMonthly,
        total: sumMonthly(grandMonthly),
        depth: 0,
        collapsible: false,
      });
    } else {
      const groups = new Map<string, ForecastProject[]>();
      filtered.forEach(p => {
        const key = groupBy === 'segment' ? (p.segment === 'ignis' ? 'Ignis' : 'No Ignis') : TYPE_LABELS[p.type];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(p);
      });

      const grandMonthly = emptyMonthly();

      for (const [groupName, groupProjects] of groups) {
        const segId = `seg-${groupName}`;
        const groupMonthly = emptyMonthly();

        const byClient = new Map<string, ForecastProject[]>();
        groupProjects.forEach(p => {
          const ck = p.parentClient || p.client;
          if (!byClient.has(ck)) byClient.set(ck, []);
          byClient.get(ck)!.push(p);
        });

        const sortedClients = [...byClient.entries()].sort((a, b) => {
          const totalA = a[1].reduce((s, p) => s + sumMonthly(computeMonthly(p)), 0);
          const totalB = b[1].reduce((s, p) => s + sumMonthly(computeMonthly(p)), 0);
          return totalB - totalA;
        });

        // Segment header placeholder
        result.push({
          id: segId,
          type: 'segment-header',
          label: groupName,
          monthly: emptyMonthly(),
          total: 0,
          depth: 0,
          collapsible: true,
          childCount: sortedClients.length,
        });
        const segIdx = result.length - 1;

        for (const [clientName, clientProjects] of sortedClients) {
          const clientId = `${segId}-${clientName}`;
          const clientMonthly = emptyMonthly();

          if (clientProjects.length > 1) {
            // Client header (collapsible to hide its projects)
            clientProjects.forEach(p => {
              const m = computeMonthly(p);
              addMonthly(clientMonthly, m);
            });

            result.push({
              id: clientId,
              type: 'client-header',
              label: clientName,
              monthly: { ...clientMonthly },
              total: sumMonthly(clientMonthly),
              depth: 1,
              parentId: segId,
              collapsible: true,
              childCount: clientProjects.length,
            });

            clientProjects.forEach(p => {
              const m = computeMonthly(p);
              result.push({
                id: p.id,
                type: 'project',
                label: p.name,
                badge: { text: TYPE_LABELS[p.type], className: TYPE_COLORS[p.type] },
                probability: p.probability,
                monthly: m,
                total: sumMonthly(m),
                depth: 2,
                parentId: clientId,
                collapsible: false,
              });
            });
          } else {
            const p = clientProjects[0];
            const m = computeMonthly(p);
            addMonthly(clientMonthly, m);
            result.push({
              id: p.id,
              type: 'project',
              label: `${p.name} (${clientName})`,
              badge: { text: TYPE_LABELS[p.type], className: TYPE_COLORS[p.type] },
              probability: p.probability,
              monthly: m,
              total: sumMonthly(m),
              depth: 1,
              parentId: segId,
              collapsible: false,
            });
          }

          addMonthly(groupMonthly, clientMonthly);
        }

        result[segIdx].monthly = { ...groupMonthly };
        result[segIdx].total = sumMonthly(groupMonthly);
        addMonthly(grandMonthly, groupMonthly);
      }

      result.push({
        id: 'grand-total',
        type: 'grand-total',
        label: 'TOTAL',
        monthly: grandMonthly,
        total: sumMonthly(grandMonthly),
        depth: 0,
        collapsible: false,
      });
    }

    return result;
  }, [projects, filterType, groupBy]);

  // Filter visible rows based on collapsed state
  const visibleRows = useMemo(() => {
    return rows.filter(row => {
      if (!row.parentId) return true;
      // Check if any ancestor is collapsed
      let pid: string | undefined = row.parentId;
      while (pid) {
        if (collapsed.has(pid)) return false;
        const parent = rows.find(r => r.id === pid);
        pid = parent?.parentId;
      }
      return true;
    });
  }, [rows, collapsed]);

  // Max for heatmap
  const maxMonthly = useMemo(() => {
    let max = 0;
    rows.forEach(r => {
      if (r.type === 'project') {
        MONTH_KEYS.forEach(k => { if (r.monthly[k] > max) max = r.monthly[k]; });
      }
    });
    return max;
  }, [rows]);

  const hasCollapsible = rows.some(r => r.collapsible);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Vista mensual (Ene - Dic 2026)</CardTitle>
          <div className="flex gap-2 items-center">
            {hasCollapsible && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={collapseAll}>
                  <ChevronsUpDown className="w-3 h-3 mr-1" /> Plegar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={expandAll}>
                  <ChevronsUpDown className="w-3 h-3 mr-1" /> Desplegar
                </Button>
              </div>
            )}
            <Select value={groupBy} onValueChange={v => { setGroupBy(v as 'segment' | 'type' | 'flat'); setCollapsed(new Set()); }}>
              <SelectTrigger className="w-[150px] h-7 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="segment">Agrupar: Segmento</SelectItem>
                <SelectItem value="type">Agrupar: Tipo</SelectItem>
                <SelectItem value="flat">Sin agrupar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={v => setFilterType(v as ForecastType | 'all')}>
              <SelectTrigger className="w-[110px] h-7 text-[11px]">
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
      <CardContent className="overflow-x-auto px-3">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b">
              <th className="sticky left-0 bg-background z-10 text-left py-1.5 px-2 font-medium w-[200px] min-w-[200px]">Proyecto</th>
              <th className="text-center py-1.5 px-1 font-medium w-[36px]">%</th>
              <th className="text-right py-1.5 px-1.5 font-semibold w-[52px]">Total</th>
              {MONTH_KEYS.map(k => (
                <th key={k} className="text-right py-1.5 px-1 font-medium w-[48px]">{MONTH_LABELS[k]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isTotal = row.type === 'grand-total';
              const isSegment = row.type === 'segment-header';
              const isClient = row.type === 'client-header';
              const isCollapsed = collapsed.has(row.id);

              const rowBg =
                isTotal ? 'bg-gray-100' :
                isSegment ? 'bg-gray-50' :
                isClient ? 'bg-gray-50/50' : '';

              const rowFont =
                isTotal ? 'font-bold' :
                isSegment ? 'font-semibold' :
                isClient ? 'font-medium' : '';

              return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 ${rowBg} ${rowFont} ${isTotal ? 'border-t-2 border-t-gray-300' : ''}`}
                >
                  <td
                    className={`sticky left-0 z-10 py-1 px-1 whitespace-nowrap ${
                      isTotal ? 'bg-gray-100' :
                      isSegment ? 'bg-gray-50' :
                      isClient ? 'bg-gray-50/50' :
                      'bg-background'
                    }`}
                    style={{ paddingLeft: `${(row.depth * 12) + 4}px` }}
                  >
                    <div className="flex items-center gap-1">
                      {row.collapsible ? (
                        <button
                          onClick={() => toggleCollapse(row.id)}
                          className="p-0.5 rounded hover:bg-gray-200 shrink-0"
                        >
                          {isCollapsed
                            ? <ChevronRight className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />
                          }
                        </button>
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}
                      <span className="truncate">{row.label}</span>
                      {row.collapsible && isCollapsed && row.childCount && (
                        <span className="text-[9px] text-muted-foreground">({row.childCount})</span>
                      )}
                      {row.badge && (
                        <Badge variant="secondary" className={`text-[9px] px-1 py-0 leading-tight ${row.badge.className}`}>
                          {row.badge.text}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="text-center py-1 px-0.5">
                    {row.probability !== undefined && (
                      <span className={
                        row.probability >= 0.9 ? 'text-emerald-700' :
                        row.probability >= 0.5 ? 'text-blue-700' :
                        row.probability >= 0.25 ? 'text-amber-700' : 'text-red-600'
                      }>
                        {(row.probability * 100).toFixed(0)}
                      </span>
                    )}
                  </td>
                  <td className="text-right py-1 px-1.5 font-semibold tabular-nums">
                    {fmtTotalK(row.total)}
                  </td>
                  {MONTH_KEYS.map(k => {
                    const val = row.monthly[k];
                    const isProjectRow = row.type === 'project';
                    const intensity = isProjectRow && maxMonthly > 0 ? val / maxMonthly : 0;
                    return (
                      <td
                        key={k}
                        className={`text-right py-1 px-1 tabular-nums ${
                          isTotal || isSegment || isClient ? '' :
                          val > 0 && isProjectRow ? (intensity > 0.5 ? 'bg-blue-100' : intensity > 0.15 ? 'bg-blue-50' : '') : ''
                        }`}
                      >
                        {fmtK(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
