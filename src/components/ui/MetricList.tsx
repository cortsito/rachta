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

export function MetricList({ metrics, label }: { metrics: readonly Metric[]; label?: string }) {
  return (
    <dl className="metric-list" aria-label={label}>
      {metrics.map((metric) => (
        <div className="metric" key={metric.id} data-kind={metric.provenance.kind}>
          <dt className="metric__label">{metric.label}</dt>
          <dd className="metric__value">{metric.value}</dd>
          <dd className="metric__provenance">{provenanceLabel(metric.provenance)}</dd>
          {metric.detail && <dd className="metric__detail">{metric.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}
