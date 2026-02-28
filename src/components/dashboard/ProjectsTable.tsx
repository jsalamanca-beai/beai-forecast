'use client';

import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Plus, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { ForecastProject, computeWeightedTotal, computeTCV, MONTH_LABELS, MONTH_KEYS, COUNTRY_LABELS, Country, ForecastType, Segment } from '@/lib/types';
import { ProjectForm } from '@/components/forms/ProjectForm';

interface Props {
  projects: ForecastProject[];
  onAdd: (p: Omit<ForecastProject, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<ForecastProject>) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
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

function probColor(p: number): string {
  if (p >= 0.9) return 'bg-emerald-100 text-emerald-800';
  if (p >= 0.5) return 'bg-blue-100 text-blue-800';
  if (p >= 0.25) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

function fmt(n: number): string {
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 });
}

type SortKey = 'name' | 'client' | 'type' | 'country' | 'probability' | 'monthlyAmount' | 'startMonth' | 'durationMonths' | 'tcv' | 'weighted';
type SortDir = 'asc' | 'desc';

function getSortValue(p: ForecastProject, key: SortKey): number | string {
  switch (key) {
    case 'name': return p.name.toLowerCase();
    case 'client': return p.client.toLowerCase();
    case 'type': return p.type;
    case 'country': return p.country;
    case 'probability': return p.probability;
    case 'monthlyAmount': return p.monthlyAmount;
    case 'startMonth': return MONTH_KEYS.indexOf(p.startMonth);
    case 'durationMonths': return p.durationMonths;
    case 'tcv': return computeTCV(p);
    case 'weighted': return computeWeightedTotal(p);
  }
}

interface SortableHeadProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortableHead({ label, sortKey, currentSort, currentDir, onSort, className = '' }: SortableHeadProps) {
  const active = currentSort === sortKey;
  return (
    <TableHead className={`cursor-pointer select-none hover:bg-muted/50 ${className}`} onClick={() => onSort(sortKey)}>
      <div className={`flex items-center gap-1 ${className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : ''}`}>
        {label}
        {active ? (
          currentDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

export function ProjectsTable({ projects, onAdd, onUpdate, onDelete, onReset }: Props) {
  const [filterType, setFilterType] = useState<ForecastType | 'all'>('all');
  const [filterSegment, setFilterSegment] = useState<Segment | 'all'>('all');
  const [filterCountry, setFilterCountry] = useState<Country | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('weighted');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingProject, setEditingProject] = useState<ForecastProject | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    const lowerSearch = searchText.toLowerCase();
    return projects
      .filter(p => {
        if (filterType !== 'all' && p.type !== filterType) return false;
        if (filterSegment !== 'all' && p.segment !== filterSegment) return false;
        if (filterCountry !== 'all' && p.country !== filterCountry) return false;
        if (lowerSearch && !p.name.toLowerCase().includes(lowerSearch) && !p.client.toLowerCase().includes(lowerSearch)) return false;
        return true;
      })
      .sort((a, b) => {
        const va = getSortValue(a, sortKey);
        const vb = getSortValue(b, sortKey);
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [projects, filterType, filterSegment, filterCountry, searchText, sortKey, sortDir]);

  // Unique countries present in data
  const countries = useMemo(() => [...new Set(projects.map(p => p.country))].sort(), [projects]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Proyectos ({filtered.length})</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onReset} className="h-8 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" /> Reset
              </Button>
              <Button size="sm" onClick={() => setShowNewForm(true)} className="h-8 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Nuevo
              </Button>
            </div>
          </div>
          {/* Filters row */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar proyecto o cliente..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="h-8 text-xs pl-8 w-[220px]"
              />
            </div>
            <Select value={filterType} onValueChange={v => setFilterType(v as ForecastType | 'all')}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="pipeline">Pipeline</SelectItem>
                <SelectItem value="product">Producto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSegment} onValueChange={v => setFilterSegment(v as Segment | 'all')}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos seg.</SelectItem>
                <SelectItem value="ignis">Ignis</SelectItem>
                <SelectItem value="no-ignis">No Ignis</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCountry} onValueChange={v => setFilterCountry(v as Country | 'all')}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos países</SelectItem>
                {countries.map(c => (
                  <SelectItem key={c} value={c}>{COUNTRY_LABELS[c as Country] || c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterType !== 'all' || filterSegment !== 'all' || filterCountry !== 'all' || searchText) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => { setFilterType('all'); setFilterSegment('all'); setFilterCountry('all'); setSearchText(''); }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Proyecto" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Cliente" sortKey="client" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Tipo" sortKey="type" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="País" sortKey="country" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Prob" sortKey="probability" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-center" />
              <SortableHead label="Mensual" sortKey="monthlyAmount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHead label="Inicio" sortKey="startMonth" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-center" />
              <SortableHead label="Meses" sortKey="durationMonths" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-center" />
              <SortableHead label="TCV" sortKey="tcv" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHead label="Ponderado" sortKey="weighted" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <TableHead className="text-center w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-sm max-w-[180px] truncate">{p.name}</TableCell>
                <TableCell className="text-sm">{p.client}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`text-xs ${TYPE_COLORS[p.type]}`}>
                    {TYPE_LABELS[p.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{COUNTRY_LABELS[p.country as Country] || p.country}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary" className={`text-xs ${probColor(p.probability)}`}>
                    {(p.probability * 100).toFixed(0)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmt(p.monthlyAmount)}</TableCell>
                <TableCell className="text-center text-xs">{MONTH_LABELS[p.startMonth]}</TableCell>
                <TableCell className="text-center text-sm">{p.durationMonths}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmt(computeTCV(p))}</TableCell>
                <TableCell className="text-right text-sm tabular-nums font-semibold">{fmt(computeWeightedTotal(p))}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-center">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingProject(p)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setConfirmDelete(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  No se encontraron proyectos con estos filtros
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Summary row */}
        <div className="flex justify-end gap-8 mt-3 pt-3 border-t text-sm">
          <div>
            <span className="text-muted-foreground">Total TCV: </span>
            <span className="font-bold">{fmt(filtered.reduce((s, p) => s + computeTCV(p), 0))} EUR</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Ponderado: </span>
            <span className="font-bold">{fmt(filtered.reduce((s, p) => s + computeWeightedTotal(p), 0))} EUR</span>
          </div>
        </div>
      </CardContent>

      {/* New project dialog */}
      <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo proyecto</DialogTitle>
          </DialogHeader>
          <ProjectForm
            onSubmit={data => { onAdd(data); setShowNewForm(false); }}
            onCancel={() => setShowNewForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit project dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar: {editingProject?.name}</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <ProjectForm
              initial={editingProject}
              onSubmit={data => {
                onUpdate(editingProject.id, data);
                setEditingProject(null);
              }}
              onCancel={() => setEditingProject(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar proyecto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer. El proyecto se eliminará permanentemente.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (confirmDelete) onDelete(confirmDelete); setConfirmDelete(null); }}>
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
