/** Series and reference lines of the ruin chart (pure, shared by the screen and its tests). */
import type { ChartMarker } from '../../components/charts/Histogram.tsx';
import type { LineSeries } from '../../components/charts/LinePlot.tsx';
import { formatNumber, formatPercent } from '../../lib/format.ts';
import { RUIN_FRACTION, type RuinResult } from './model.ts';

export function ruinChart(result: RuinResult): { series: LineSeries[]; references: ChartMarker[] } {
  const { capital } = result.input;
  const { checkpoints, bands, ruinLevel, samplePaths } = result;
  const [p10, p50, p90] = bands;
  return {
    references: [
      { value: capital, label: `Capital inicial: ${formatNumber(capital)}` },
      { value: ruinLevel, label: `Ruina: ${formatPercent(RUIN_FRACTION)} del capital inicial`, tone: 'risk' },
    ],
    series: [
      // Sample paths are context: a single explosive path must not squeeze the percentiles and references.
      ...samplePaths.map((path, i) => ({
        id: `sample-${i}`,
        label: 'Futuros de muestra',
        values: path,
        variant: 'muted' as const,
        fitDomain: false,
      })),
      { id: 'p10', label: 'Percentiles 10–90', values: p10!.values, x: checkpoints, variant: 'secondary' },
      { id: 'p90', label: 'Percentiles 10–90', values: p90!.values, x: checkpoints, variant: 'secondary' },
      { id: 'p50', label: 'Mediana (P50)', values: p50!.values, x: checkpoints, variant: 'primary' },
    ],
  };
}
