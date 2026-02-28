'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ForecastProject,
  ForecastType,
  Segment,
  Country,
  MONTH_KEYS,
  MONTH_LABELS,
  COUNTRY_LABELS,
  SUPPORTED_YEARS,
  MonthlyValues,
} from '@/lib/types';

interface ProjectFormProps {
  initial?: ForecastProject;
  onSubmit: (data: Omit<ForecastProject, 'id'>) => void;
  onCancel: () => void;
}

export function ProjectForm({ initial, onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<ForecastType>(initial?.type ?? 'pipeline');
  const [segment, setSegment] = useState<Segment>(initial?.segment ?? 'no-ignis');
  const [client, setClient] = useState(initial?.client ?? '');
  const [parentClient, setParentClient] = useState(initial?.parentClient ?? '');
  const [country, setCountry] = useState<Country>(initial?.country ?? 'spain');
  const [probability, setProbability] = useState(initial?.probability ?? 0.5);
  const [monthlyAmount, setMonthlyAmount] = useState(initial?.monthlyAmount ?? 0);
  const [startYear, setStartYear] = useState(initial?.startYear ?? 2026);
  const [startMonth, setStartMonth] = useState<keyof MonthlyValues>(initial?.startMonth ?? 'jan');
  const [durationMonths, setDurationMonths] = useState(initial?.durationMonths ?? 6);
  const [product, setProduct] = useState(initial?.product ?? '');

  const tcv = monthlyAmount * durationMonths;
  const weighted = tcv * probability;

  // Compute end period label
  const startIdx = MONTH_KEYS.indexOf(startMonth);
  const endAbsoluteIdx = startIdx + durationMonths - 1;
  const endYearOffset = Math.floor(endAbsoluteIdx / 12);
  const endMonthIdx = endAbsoluteIdx % 12;
  const endYear = startYear + endYearOffset;
  const endMonthLabel = MONTH_LABELS[MONTH_KEYS[endMonthIdx]];

  // Max duration: can extend to end of 2027
  const maxDuration = startYear === 2026
    ? 24 - startIdx   // Jan 2026 → up to 24, Dec 2026 → up to 13
    : 12 - startIdx;  // 2027 projects end in Dec 2027

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      type,
      segment,
      client,
      parentClient: parentClient || undefined,
      country,
      probability,
      tcv,
      startYear,
      monthlyAmount,
      startMonth,
      durationMonths,
      product: product || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del proyecto</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client">Cliente</Label>
          <Input id="client" value={client} onChange={e => setClient(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={v => setType(v as ForecastType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="pipeline">Pipeline</SelectItem>
              <SelectItem value="product">Producto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Segmento</Label>
          <Select value={segment} onValueChange={v => setSegment(v as Segment)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ignis">Ignis</SelectItem>
              <SelectItem value="no-ignis">No Ignis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>País</Label>
          <Select value={country} onValueChange={v => setCountry(v as Country)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(COUNTRY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        <div className="space-y-2">
          <Label htmlFor="probability">Prob. (%)</Label>
          <Input
            id="probability"
            type="number"
            min={0}
            max={100}
            step={5}
            value={probability * 100}
            onChange={e => setProbability(Number(e.target.value) / 100)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tcvInput">TCV total (EUR)</Label>
          <Input
            id="tcvInput"
            type="number"
            min={0}
            step={1000}
            value={Math.round(monthlyAmount * durationMonths)}
            onChange={e => {
              const newTcv = Number(e.target.value);
              setMonthlyAmount(durationMonths > 0 ? Math.round(newTcv / durationMonths) : newTcv);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlyAmount">Mensual (EUR)</Label>
          <Input
            id="monthlyAmount"
            type="number"
            min={0}
            step={100}
            value={monthlyAmount}
            onChange={e => setMonthlyAmount(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Año</Label>
          <Select value={String(startYear)} onValueChange={v => setStartYear(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUPPORTED_YEARS.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Mes inicio</Label>
          <Select value={startMonth} onValueChange={v => setStartMonth(v as keyof MonthlyValues)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_KEYS.map(k => (
                <SelectItem key={k} value={k}>{MONTH_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Meses</Label>
          <Input
            id="duration"
            type="number"
            min={1}
            max={maxDuration}
            value={durationMonths}
            onChange={e => setDurationMonths(Math.min(Number(e.target.value), maxDuration))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="parentClient">Cliente padre (opcional)</Label>
          <Input id="parentClient" value={parentClient} onChange={e => setParentClient(e.target.value)} />
        </div>
        {type === 'product' && (
          <div className="space-y-2">
            <Label htmlFor="product">Nombre del producto</Label>
            <Input id="product" value={product} onChange={e => setProduct(e.target.value)} />
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">TCV (valor total contrato)</span>
          <span className="font-semibold">{tcv.toLocaleString('es-ES')} EUR</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valor ponderado (TCV x prob)</span>
          <span className="font-semibold">{weighted.toLocaleString('es-ES')} EUR</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Periodo</span>
          <span>{MONTH_LABELS[startMonth]} {startYear} → {endMonthLabel} {endYear}</span>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{initial ? 'Guardar cambios' : 'Crear proyecto'}</Button>
      </div>
    </form>
  );
}
