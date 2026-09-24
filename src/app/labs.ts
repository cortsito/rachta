/**
 * The fixed catalogue of labs: ids (also the `lab` URL value), navigation
 * copy, parameter schemas and the shape of each lab's method/uses content
 * (the content itself lives with each feature, in `features/<lab>/guide.ts`).
 * React components are wired in `App.tsx`.
 */
import { bayesSchema } from '../features/bayes/params.ts';
import { compoundLossSchema } from '../features/compound-loss/params.ts';
import { ruinSchema } from '../features/ruin/params.ts';
import { streaksSchema } from '../features/streaks/params.ts';
import type { ParamValues } from '../lib/params.ts';

export const LAB_IDS = ['streaks', 'bayes', 'ruin', 'compound-loss'] as const;
export type LabId = (typeof LAB_IDS)[number];

export const labSchemas = {
  streaks: streaksSchema,
  bayes: bayesSchema,
  ruin: ruinSchema,
  'compound-loss': compoundLossSchema,
} as const;

export type LabParams<L extends LabId> = ParamValues<(typeof labSchemas)[L]['specs']>;

export interface LabInfo {
  /** Short navigation label. */
  title: string;
  /** The human question the lab answers; used as its heading. */
  question: string;
  /** One sentence for the catalogue: what the visitor does in the lab. */
  summary: string;
}

export const labInfo: Record<LabId, LabInfo> = {
  streaks: {
    title: 'Rachas de derrotas',
    question: 'Si gano el 55 % de las veces, ¿qué tan normal es perder ocho seguidas?',
    summary: 'Simula miles de futuros con la misma ventaja y mira con qué frecuencia aparece una racha larga de fallos.',
  },
  bayes: {
    title: 'Bayes con personas',
    question: 'Si una prueba sale positiva, ¿cuál es la probabilidad real de tener la condición?',
    summary: 'Reparte una población entre positivos verdaderos y falsos para ver cuánto pesa la prevalencia.',
  },
  ruin: {
    title: 'Riesgo de ruina',
    question: '¿Basta una pequeña ventaja para sobrevivir a una mala secuencia?',
    summary: 'Sigue el capital hipotético de miles de futuros y compara la ventaja media con el crecimiento típico.',
  },
  'compound-loss': {
    title: 'Pérdidas compuestas',
    question: '¿Por qué un promedio no describe los eventos raros y costosos?',
    summary: 'Suma eventos raros de coste variable y observa por qué la media se aleja del periodo típico.',
  },
};

/** Two-digit catalogue number ("01"…"04"), in LAB_IDS order. */
export function labNumber(lab: LabId): string {
  return String(LAB_IDS.indexOf(lab) + 1).padStart(2, '0');
}

/** Short line above a lab's question: "Laboratorio 01 · Rachas de derrotas". */
export function labEyebrow(lab: LabId): string {
  return `Laboratorio ${labNumber(lab)} · ${labInfo[lab].title}`;
}

/** A symbol or name and what it means. */
export interface MethodTerm {
  term: string;
  meaning: string;
}

/**
 * The fixed schema of a lab's `Método` entry (docs/DESIGN_SYSTEM.md, "Method").
 * Every statement must match the lab's model.ts and its tests.
 */
export interface LabMethod {
  /** Pregunta: the decision or intuition being examined. */
  question: string;
  /** Modelo: the variables and how they relate. */
  model: string;
  variables: readonly MethodTerm[];
  /** Fórmula o procedimiento: display lines of the exact formulas… */
  formulas: readonly string[];
  /** …and the ordered steps of the seeded simulation. */
  procedure: readonly string[];
  /** Qué se calcula exactamente: analytic results (shown as "Exacto")… */
  exact: readonly string[];
  /** …estimates (shown as "Estimado con N simulaciones")… */
  estimated: readonly string[];
  /** …and single illustrative runs, which are neither. */
  sample?: readonly string[];
  /** Supuestos; the lab screen shows the same list. */
  assumptions: readonly string[];
  /** Límites: what the output does not predict or recommend. */
  limits: readonly string[];
}

/** A `Usos` pattern: when the lab helps a person reason, and its limitation. */
export interface LabUse {
  title: string;
  situation: string;
  insight: string;
  limit: string;
}

export interface LabGuide {
  method: LabMethod;
  use: LabUse;
}

export function isLabId(value: unknown): value is LabId {
  return typeof value === 'string' && (LAB_IDS as readonly string[]).includes(value);
}

/** Props every lab view receives from the app shell. */
export interface LabViewProps<L extends LabId> {
  /** Committed parameters: the ones the shown results and the URL describe. */
  params: LabParams<L>;
  seed: string;
  /** Absolute URL that reproduces the current results. */
  shareUrl: string;
  /** Commits a new run: updates the URL (replace), which triggers the simulation. */
  onRun: (params: LabParams<L>, seed: string) => void;
}
