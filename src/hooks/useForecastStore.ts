'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ForecastProject,
  ForecastStore,
  MonthlyValues,
  MONTH_KEYS,
  computeMonthly,
  computeWeightedTotal,
  computeTCV,
  generateId,
  ForecastType,
  Segment,
  Country,
} from '@/lib/types';
import { SEED_PROJECTS } from '@/lib/data/seed';

const STORAGE_KEY = 'beai-forecast-v1';

function loadStore(): ForecastStore {
  if (typeof window === 'undefined') return { projects: SEED_PROJECTS, version: 1 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ForecastStore;
      if (parsed.projects && parsed.projects.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return { projects: SEED_PROJECTS, version: 1 };
}

function saveStore(store: ForecastStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export interface Filters {
  type?: ForecastType | 'all';
  segment?: Segment | 'all';
  country?: Country | 'all';
  client?: string;
  minProb?: number;
  maxProb?: number;
}

export function useForecastStore() {
  const [store, setStore] = useState<ForecastStore>({ projects: [], version: 1 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveStore(store);
  }, [store, loaded]);

  const addProject = useCallback((project: Omit<ForecastProject, 'id'>) => {
    setStore(prev => ({
      ...prev,
      projects: [...prev.projects, { ...project, id: generateId() }],
    }));
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<ForecastProject>) => {
    setStore(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setStore(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
    }));
  }, []);

  const resetToSeed = useCallback(() => {
    setStore({ projects: SEED_PROJECTS, version: 1 });
  }, []);

  const getFiltered = useCallback((filters: Filters = {}) => {
    return store.projects.filter(p => {
      if (filters.type && filters.type !== 'all' && p.type !== filters.type) return false;
      if (filters.segment && filters.segment !== 'all' && p.segment !== filters.segment) return false;
      if (filters.country && filters.country !== 'all' && p.country !== filters.country) return false;
      if (filters.client && p.client !== filters.client) return false;
      if (filters.minProb !== undefined && p.probability < filters.minProb) return false;
      if (filters.maxProb !== undefined && p.probability > filters.maxProb) return false;
      return true;
    });
  }, [store.projects]);

  // Computed aggregations
  const stats = useMemo(() => {
    const projects = store.projects;

    const backlog = projects.filter(p => p.type === 'backlog');
    const pipeline = projects.filter(p => p.type === 'pipeline');
    const products = projects.filter(p => p.type === 'product');

    const totalBacklog = backlog.reduce((sum, p) => sum + computeWeightedTotal(p), 0);
    const totalPipelineWeighted = pipeline.reduce((sum, p) => sum + computeWeightedTotal(p), 0);
    const totalPipelineTCV = pipeline.reduce((sum, p) => sum + computeTCV(p), 0);
    const totalProducts = products.reduce((sum, p) => sum + computeWeightedTotal(p), 0);
    const totalForecast = totalBacklog + totalPipelineWeighted + totalProducts;

    const ignisRevenue = projects
      .filter(p => p.segment === 'ignis')
      .reduce((sum, p) => sum + computeWeightedTotal(p), 0);
    const ignisPercent = totalForecast > 0 ? (ignisRevenue / totalForecast) * 100 : 0;

    // Monthly totals
    const monthlyTotals: MonthlyValues = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 };
    const monthlyBacklog: MonthlyValues = { ...monthlyTotals };
    const monthlyPipeline: MonthlyValues = { ...monthlyTotals };
    const monthlyProducts: MonthlyValues = { ...monthlyTotals };

    backlog.forEach(p => {
      const m = computeMonthly(p);
      MONTH_KEYS.forEach(k => { monthlyBacklog[k] += m[k]; monthlyTotals[k] += m[k]; });
    });
    pipeline.forEach(p => {
      const m = computeMonthly(p);
      MONTH_KEYS.forEach(k => { monthlyPipeline[k] += m[k]; monthlyTotals[k] += m[k]; });
    });
    products.forEach(p => {
      const m = computeMonthly(p);
      MONTH_KEYS.forEach(k => { monthlyProducts[k] += m[k]; monthlyTotals[k] += m[k]; });
    });

    // By country
    const byCountry: Record<string, number> = {};
    projects.forEach(p => {
      const val = computeWeightedTotal(p);
      byCountry[p.country] = (byCountry[p.country] || 0) + val;
    });

    // By client
    const byClient: Record<string, number> = {};
    projects.forEach(p => {
      const key = p.parentClient || p.client;
      const val = computeWeightedTotal(p);
      byClient[key] = (byClient[key] || 0) + val;
    });

    // Unique clients
    const clients = [...new Set(projects.map(p => p.client))].sort();

    return {
      totalBacklog,
      totalPipelineWeighted,
      totalPipelineTCV,
      totalProducts,
      totalForecast,
      ignisRevenue,
      ignisPercent,
      monthlyTotals,
      monthlyBacklog,
      monthlyPipeline,
      monthlyProducts,
      byCountry,
      byClient,
      clients,
      projectCount: projects.length,
    };
  }, [store.projects]);

  return {
    projects: store.projects,
    loaded,
    stats,
    addProject,
    updateProject,
    deleteProject,
    resetToSeed,
    getFiltered,
  };
}
