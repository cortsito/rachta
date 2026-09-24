import type { ReactNode } from 'react';
import { EXACT_LABEL, estimatedLabel } from '../../lib/format.ts';

/**
 * Where a number comes from. Every metric must declare one, so an estimate
 * can never be displayed as if it were exact.
 */
export type Provenance =
  | { kind: 'exact' }
  | { kind: 'estimated'; samples: number }
  /** A single illustrative run (e.g. the displayed future), not an estimate. */
  | { kind: 'sample'; description: string };

export interface Metric {
  id: string;
  label: string;
  /** Already formatted for display. */
  value: string;
  provenance: Provenance;
  /** Optional secondary line, e.g. a confidence interval or raw counts. */
  detail?: string;
}

export function provenanceLabel(provenance: Provenance): string {
  switch (provenance.kind) {
    case 'exact':
      return EXACT_LABEL;
    case 'estimated':
      return estimatedLabel(provenance.samples);
    case 'sample':
      return provenance.description;
  }
}

/**
 * The visible provenance label. Each kind has its own marker and colour role,
 * but the text always carries the meaning.
 */
export function ProvenanceTag({ kind, children }: { kind: Provenance['kind']; children: ReactNode }) {
  return (
    <span className="provenance" data-provenance={kind}>
      {children}
    </span>
  );
}

export interface MetricListProps {
  metrics: readonly Metric[];
  label?: string;
  /** Presents the metrics as the lab's main answer rather than supporting figures. */
  primary?: boolean;
}

export function MetricList({ metrics, label, primary = false }: MetricListProps) {
  return (
    <dl className="metric-list" aria-label={label}>
      {metrics.map((metric) => (
        <div className={primary ? 'metric metric--primary' : 'metric'} key={metric.id} data-kind={metric.provenance.kind}>
          <dt className="metric__label">{metric.label}</dt>
          <dd className="metric__value">{metric.value}</dd>
          <dd className="metric__provenance">
            <ProvenanceTag kind={metric.provenance.kind}>{provenanceLabel(metric.provenance)}</ProvenanceTag>
          </dd>
          {metric.detail && <dd className="metric__detail">{metric.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}
