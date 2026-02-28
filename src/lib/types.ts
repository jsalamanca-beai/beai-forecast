export type ForecastType = 'backlog' | 'pipeline' | 'product';
export type Segment = 'ignis' | 'no-ignis';
export type Country = 'spain' | 'netherlands' | 'usa' | 'colombia' | 'japan' | 'other';

export interface MonthlyValues {
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

export const MONTH_KEYS: (keyof MonthlyValues)[] = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

export const MONTH_LABELS: Record<keyof MonthlyValues, string> = {
  jan: 'Ene', feb: 'Feb', mar: 'Mar', apr: 'Abr',
  may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Ago',
  sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dic',
};

export const COUNTRY_LABELS: Record<Country, string> = {
  spain: 'España',
  netherlands: 'Países Bajos',
  usa: 'USA',
  colombia: 'Colombia',
  japan: 'Japón',
  other: 'Otro',
};

export interface ForecastProject {
  id: string;
  name: string;
  type: ForecastType;
  segment: Segment;
  client: string;
  parentClient?: string;
  country: Country;
  probability: number;
  tcv: number;
  startMonth: keyof MonthlyValues;
  durationMonths: number;
  monthlyAmount: number;
  product?: string;
}

export interface ForecastStore {
  projects: ForecastProject[];
  version: number;
}

// Computed from a project
export function computeMonthly(project: ForecastProject): MonthlyValues {
  const monthly: MonthlyValues = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 };
  const startIdx = MONTH_KEYS.indexOf(project.startMonth);
  if (startIdx === -1) return monthly;

  for (let i = 0; i < project.durationMonths && startIdx + i < 12; i++) {
    const key = MONTH_KEYS[startIdx + i];
    monthly[key] = project.monthlyAmount * project.probability;
  }
  return monthly;
}

export function computeWeightedTotal(project: ForecastProject): number {
  const m = computeMonthly(project);
  return MONTH_KEYS.reduce((sum, k) => sum + m[k], 0);
}

export function computeTCV(project: ForecastProject): number {
  return project.monthlyAmount * project.durationMonths;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
