'use client';

import { useForecastStore } from '@/hooks/useForecastStore';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { SegmentDonut } from '@/components/dashboard/SegmentDonut';
import { CountryBar } from '@/components/dashboard/CountryBar';
import { TopOpportunities } from '@/components/dashboard/TopOpportunities';
import { ProjectsTable } from '@/components/dashboard/ProjectsTable';
import { MonthlyGrid } from '@/components/dashboard/MonthlyGrid';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function Home() {
  const {
    projects,
    loaded,
    stats,
    selectedYear,
    setSelectedYear,
    addProject,
    updateProject,
    deleteProject,
    resetToSeed,
  } = useForecastStore();

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Cargando forecast...</div>
      </div>
    );
  }

  async function handleExport() {
    const { exportToExcel } = await import('@/lib/exportExcel');
    exportToExcel(projects);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">BeAI Forecast 2026-2027</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dashboard de operaciones &middot; {stats.projectCount} proyectos &middot; Vista {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={handleExport} className="h-8 text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar Excel
          </Button>
          <div className="text-right text-xs text-muted-foreground">
            <p>Datos actualizados</p>
            <p className="font-mono">{new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <KpiCards
        totalBacklog={stats.totalBacklog}
        totalPipelineWeighted={stats.totalPipelineWeighted}
        totalPipelineTCV={stats.totalPipelineTCV}
        totalForecast={stats.totalForecast}
        ignisPercent={stats.ignisPercent}
      />

      {/* Charts row */}
      <MonthlyChart
        monthlyBacklog={stats.monthlyBacklog}
        monthlyPipeline={stats.monthlyPipeline}
        monthlyProducts={stats.monthlyProducts}
        selectedYear={selectedYear}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SegmentDonut
          ignisRevenue={stats.ignisRevenue}
          totalForecast={stats.totalForecast}
        />
        <CountryBar byCountry={stats.byCountry} />
        <TopOpportunities projects={projects} />
      </div>

      {/* Monthly grid view (Excel-like) */}
      <MonthlyGrid
        projects={projects}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />

      {/* Full table with CRUD */}
      <ProjectsTable
        projects={projects}
        onAdd={addProject}
        onUpdate={updateProject}
        onDelete={deleteProject}
        onReset={resetToSeed}
      />
    </div>
  );
}
