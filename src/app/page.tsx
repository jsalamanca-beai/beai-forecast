'use client';

import { useForecastStore } from '@/hooks/useForecastStore';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { SegmentDonut } from '@/components/dashboard/SegmentDonut';
import { CountryBar } from '@/components/dashboard/CountryBar';
import { TopOpportunities } from '@/components/dashboard/TopOpportunities';
import { ProjectsTable } from '@/components/dashboard/ProjectsTable';
import { MonthlyGrid } from '@/components/dashboard/MonthlyGrid';

export default function Home() {
  const {
    projects,
    loaded,
    stats,
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">BeAI Forecast 2026</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dashboard de operaciones &middot; {stats.projectCount} proyectos
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Datos actualizados</p>
          <p className="font-mono">{new Date().toLocaleDateString('es-ES')}</p>
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
      <MonthlyGrid projects={projects} />

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
