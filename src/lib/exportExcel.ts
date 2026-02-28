import * as XLSX from 'xlsx';
import {
  ForecastProject,
  MONTH_KEYS,
  MONTH_LABELS,
  SUPPORTED_YEARS,
  ForecastYear,
  computeMonthlyByYear,
  computeTCV,
  COUNTRY_LABELS,
  Country,
} from './types';

export function exportToExcel(projects: ForecastProject[]): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: "Proyectos" — raw project data
  const projectRows = projects.map(p => ({
    'Cliente': p.parentClient || p.client,
    'Oportunidad': p.name,
    'Tipo': p.type === 'backlog' ? 'Backlog' : p.type === 'pipeline' ? 'Pipeline' : 'Producto',
    'Segmento': p.segment === 'ignis' ? 'Ignis' : 'No Ignis',
    'País': COUNTRY_LABELS[p.country as Country] || p.country,
    'Probabilidad': p.probability,
    'Importe Mensual': p.monthlyAmount,
    'Año Inicio': p.startYear ?? 2026,
    'Mes Inicio': MONTH_LABELS[p.startMonth],
    'Duración Meses': p.durationMonths,
    'TCV': computeTCV(p),
    'Producto': p.product || '',
  }));
  const ws1 = XLSX.utils.json_to_sheet(projectRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Proyectos');

  // Sheet per year with monthly breakdown
  for (const year of SUPPORTED_YEARS) {
    const rows = projects
      .map(p => {
        const m = computeMonthlyByYear(p, year as ForecastYear);
        const hasValue = MONTH_KEYS.some(k => m[k] > 0);
        if (!hasValue) return null;
        const row: Record<string, string | number> = {
          'Cliente': p.parentClient || p.client,
          'Oportunidad': p.name,
          'Tipo': p.type === 'backlog' ? 'Backlog' : p.type === 'pipeline' ? 'Pipeline' : 'Producto',
          'Probabilidad': p.probability,
          'TCV': computeTCV(p),
        };
        let totalPond = 0;
        MONTH_KEYS.forEach(k => {
          row[MONTH_LABELS[k]] = Math.round(m[k]);
          totalPond += m[k];
        });
        row['Total Ponderado'] = Math.round(totalPond);
        return row;
      })
      .filter((r): r is Record<string, string | number> => r !== null);

    if (rows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `Forecast ${year}`);
    }
  }

  XLSX.writeFile(wb, `BeAI_Forecast_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
