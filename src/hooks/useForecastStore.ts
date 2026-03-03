'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ForecastProject,
  ForecastStore,
  ForecastYear,
  MonthlyValues,
  MONTH_KEYS,
  SUPPORTED_YEARS,
  computeMonthlyByYear,
  computeWeightedTotalByYear,
  computeTCV,
  generateId,
  ForecastType,
  Segment,
  Country,
  DEFAULT_ANNUAL_TARGETS,
} from '@/lib/types';
import { SEED_PROJECTS } from '@/lib/data/seed';

const STORAGE_KEY = 'beai-forecast-v1';
const POLL_INTERVAL = 5000; // 5 seconds

function migrateProjects(projects: ForecastProject[]): ForecastProject[] {
  return projects.map(p => ({
    ...p,
    startYear: p.startYear ?? 2026,
  }));
}

// localStorage fallback (for offline or when API is unavailable)
function loadFromLocal(): ForecastStore {
  if (typeof window === 'undefined') return { projects: SEED_PROJECTS, version: 1, annualTarget: DEFAULT_ANNUAL_TARGETS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ForecastStore;
      if (parsed.projects && parsed.projects.length > 0) {
        return {
          ...parsed,
          projects: migrateProjects(parsed.projects),
          annualTarget: parsed.annualTarget ?? DEFAULT_ANNUAL_TARGETS,
        };
      }
    }
  } catch { /* ignore */ }
  return { projects: SEED_PROJECTS, version: 1, annualTarget: DEFAULT_ANNUAL_TARGETS };
}

function saveToLocal(store: ForecastStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// API calls for shared persistence
async function loadFromAPI(): Promise<ForecastStore | null> {
  try {
    const res = await fetch('/api/store', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.projects) return null;
    return {
      ...data,
      projects: migrateProjects(data.projects),
      annualTarget: data.annualTarget ?? DEFAULT_ANNUAL_TARGETS,
    };
  } catch {
    return null;
  }
}

async function saveToAPI(store: ForecastStore): Promise<number | null> {
  try {
    const res = await fetch('/api/store', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.version ?? null;
  } catch {
    return null;
  }
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
  const [selectedYear, setSelectedYear] = useState<ForecastYear>(2026);
  const [syncing, setSyncing] = useState(false);
  const versionRef = useRef(0);
  const savingRef = useRef(false);

  // Initial load: try API first, fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const apiStore = await loadFromAPI();
      if (cancelled) return;
      if (apiStore) {
        versionRef.current = apiStore.version ?? 0;
        setStore(apiStore);
        saveToLocal(apiStore); // cache locally
      } else {
        // API unavailable - use localStorage
        const local = loadFromLocal();
        setStore(local);
        // Try to push local data to API for first-time setup
        const version = await saveToAPI(local);
        if (version !== null) versionRef.current = version;
      }
      setLoaded(true);
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Poll for remote changes every 5 seconds
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(async () => {
      if (savingRef.current) return; // skip poll while saving
      const remote = await loadFromAPI();
      if (!remote) return;
      const remoteVersion = remote.version ?? 0;
      if (remoteVersion > versionRef.current) {
        versionRef.current = remoteVersion;
        setStore(remote);
        saveToLocal(remote);
        setSyncing(true);
        setTimeout(() => setSyncing(false), 1500);
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loaded]);

  // Save to both API and localStorage on changes
  const persistStore = useCallback(async (newStore: ForecastStore) => {
    saveToLocal(newStore);
    savingRef.current = true;
    const version = await saveToAPI(newStore);
    if (version !== null) {
      versionRef.current = version;
    }
    savingRef.current = false;
  }, []);

  const addProject = useCallback((project: Omit<ForecastProject, 'id'>) => {
    setStore(prev => {
      const next = {
        ...prev,
        projects: [...prev.projects, { ...project, id: generateId() }],
      };
      persistStore(next);
      return next;
    });
  }, [persistStore]);

  const updateProject = useCallback((id: string, updates: Partial<ForecastProject>) => {
    setStore(prev => {
      const next = {
        ...prev,
        projects: prev.projects.map(p => p.id === id ? { ...p, ...updates } : p),
      };
      persistStore(next);
      return next;
    });
  }, [persistStore]);

  const deleteProject = useCallback((id: string) => {
    setStore(prev => {
      const next = {
        ...prev,
        projects: prev.projects.filter(p => p.id !== id),
      };
      persistStore(next);
      return next;
    });
  }, [persistStore]);

  const resetToSeed = useCallback(() => {
    const next = { projects: SEED_PROJECTS, version: 1, annualTarget: DEFAULT_ANNUAL_TARGETS };
    setStore(next);
    persistStore(next);
  }, [persistStore]);

  const setAnnualTarget = useCallback((year: number, amount: number) => {
    setStore(prev => {
      const next = {
        ...prev,
        annualTarget: { ...(prev.annualTarget ?? DEFAULT_ANNUAL_TARGETS), [year]: amount },
      };
      persistStore(next);
      return next;
    });
  }, [persistStore]);

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

  // Computed aggregations (year-aware)
  const stats = useMemo(() => {
    const projects = store.projects;
    const computeW = (p: ForecastProject) => computeWeightedTotalByYear(p, selectedYear);
    const computeM = (p: ForecastProject) => computeMonthlyByYear(p, selectedYear);

    const backlog = projects.filter(p => p.type === 'backlog');
    const pipeline = projects.filter(p => p.type === 'pipeline');
    const products = projects.filter(p => p.type === 'product');

    const totalBacklog = backlog.reduce((sum, p) => sum + computeW(p), 0);
    const totalPipelineWeighted = pipeline.reduce((sum, p) => sum + computeW(p), 0);
    const totalPipelineTCV = pipeline.reduce((sum, p) => sum + computeTCV(p), 0);
    const totalProducts = products.reduce((sum, p) => sum + computeW(p), 0);
    const totalForecast = totalBacklog + totalPipelineWeighted + totalProducts;

    const ignisRevenue = projects
      .filter(p => p.segment === 'ignis')
      .reduce((sum, p) => sum + computeW(p), 0);
    const ignisPercent = totalForecast > 0 ? (ignisRevenue / totalForecast) * 100 : 0;

    // Monthly totals
    const monthlyTotals: MonthlyValues = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 };
    const monthlyBacklog: MonthlyValues = { ...monthlyTotals };
    const monthlyPipeline: MonthlyValues = { ...monthlyTotals };
    const monthlyProducts: MonthlyValues = { ...monthlyTotals };

    backlog.forEach(p => {
      const m = computeM(p);
      MONTH_KEYS.forEach(k => { monthlyBacklog[k] += m[k]; monthlyTotals[k] += m[k]; });
    });
    pipeline.forEach(p => {
      const m = computeM(p);
      MONTH_KEYS.forEach(k => { monthlyPipeline[k] += m[k]; monthlyTotals[k] += m[k]; });
    });
    products.forEach(p => {
      const m = computeM(p);
      MONTH_KEYS.forEach(k => { monthlyProducts[k] += m[k]; monthlyTotals[k] += m[k]; });
    });

    // By country (year-filtered)
    const byCountry: Record<string, number> = {};
    projects.forEach(p => {
      const val = computeW(p);
      if (val > 0) byCountry[p.country] = (byCountry[p.country] || 0) + val;
    });

    // By client (year-filtered)
    const byClient: Record<string, number> = {};
    projects.forEach(p => {
      const key = p.parentClient || p.client;
      const val = computeW(p);
      if (val > 0) byClient[key] = (byClient[key] || 0) + val;
    });

    const clients = [...new Set(projects.map(p => p.client))].sort();

    // Check which years have data
    const activeYears = SUPPORTED_YEARS.filter(y =>
      projects.some(p => {
        const m = computeMonthlyByYear(p, y);
        return MONTH_KEYS.some(k => m[k] > 0);
      })
    );

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
      activeYears,
    };
  }, [store.projects, selectedYear]);

  return {
    projects: store.projects,
    loaded,
    syncing,
    stats,
    selectedYear,
    setSelectedYear,
    addProject,
    updateProject,
    deleteProject,
    resetToSeed,
    getFiltered,
    annualTarget: store.annualTarget ?? DEFAULT_ANNUAL_TARGETS,
    setAnnualTarget,
  };
}
