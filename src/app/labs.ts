/**
 * The fixed catalogue of labs: ids (also the `lab` URL value), navigation
 * copy and parameter schemas. React components are wired in `App.tsx`.
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
}

export const labInfo: Record<LabId, LabInfo> = {
  streaks: {
    title: 'Rachas de derrotas',
    question: 'Si gano el 55 % de las veces, ¿qué tan normal es perder ocho seguidas?',
  },
  bayes: {
    title: 'Bayes con personas',
    question: 'Si una prueba sale positiva, ¿cuál es la probabilidad real de tener la condición?',
  },
  ruin: {
    title: 'Riesgo de ruina',
    question: '¿Basta una pequeña ventaja para sobrevivir a una mala secuencia?',
  },
  'compound-loss': {
    title: 'Pérdidas compuestas',
    question: '¿Por qué un promedio no describe los eventos raros y costosos?',
  },
};

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
