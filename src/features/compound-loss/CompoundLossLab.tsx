import { ChartFigure } from '../../components/charts/ChartFigure.tsx';
import { Histogram } from '../../components/charts/Histogram.tsx';
import { LabLayout } from '../../components/lab/LabLayout.tsx';
import { SimulationForm } from '../../components/lab/SimulationForm.tsx';
import { useParamDraft } from '../../components/lab/useParamDraft.ts';
import { MetricList, type Metric } from '../../components/ui/MetricList.tsx';
import { RangeField } from '../../components/ui/RangeField.tsx';
import { labInfo, type LabViewProps } from '../../app/labs.ts';
import { useSimulation } from '../../app/useSimulation.ts';
import { formatInteger, formatInterval, formatNumber, formatPercent, formatSampleCount } from '../../lib/format.ts';
import { generateSeed } from '../../lib/random.ts';
import { lossHistogram } from './histogram.ts';
import { interpretCompoundLoss } from './interpretation.ts';
import type { CompoundLossResult } from './model.ts';
import { compoundLossSchema } from './params.ts';

const { specs } = compoundLossSchema;
const BIN_COUNT = 40;

function buildMetrics(result: CompoundLossResult): Metric[] {
  const { futures } = result.input;
  const { exact, mean, median, p90, exceedance } = result;
  return [
    {
      id: 'mean-estimated',
      label: 'Pérdida media por periodo, simulada',
      value: formatNumber(mean),
      provenance: { kind: 'estimated', samples: futures },
    },
    {
      id: 'mean-exact',
      label: 'La misma media, calculada con fórmula',
      value: formatNumber(exact.mean),
      provenance: { kind: 'exact' },
      detail: 'No depende de la semilla ni del número de futuros.',
    },
    {
      id: 'median-estimated',
      label: 'Pérdida mediana por periodo',
      value: formatNumber(median),
      provenance: { kind: 'estimated', samples: futures },
    },
    {
      id: 'p90-estimated',
      label: 'Percentil 90 de la pérdida por periodo',
      value: formatNumber(p90),
      provenance: { kind: 'estimated', samples: futures },
    },
    {
      id: 'exceedance-estimated',
      label: `Probabilidad de superar ${formatNumber(result.input.threshold)} en un periodo`,
      value: formatPercent(exceedance.value),
      provenance: { kind: 'estimated', samples: futures },
      detail: `${formatInteger(exceedance.successes)} de ${formatInteger(exceedance.trials)} futuros · IC 95 %: ${formatInterval(exceedance.interval95)}`,
    },
    {
      id: 'no-loss-exact',
      label: 'Probabilidad de que un periodo no tenga ningún evento',
      value: formatPercent(exact.probabilityOfNoLoss),
      provenance: { kind: 'exact' },
    },
  ];
}

function Results({ result }: { result: CompoundLossResult }) {
  const { threshold, futures } = result.input;
  const { sortedTotals, mean, median, p90, p99 } = result;
  const upper = Math.max(p99, threshold);
  const { bins, overflow } = lossHistogram(sortedTotals, threshold, upper, BIN_COUNT);

  const description =
    `Distribución de la pérdida total en ${formatInteger(futures)} periodos simulados, hasta ${formatNumber(upper)}. ` +
    `La media es ${formatNumber(mean)}, la mediana ${formatNumber(median)} y el percentil 90 ${formatNumber(p90)}. La ` +
    `parte rayada de cada barra son los periodos con una pérdida mayor que el umbral de ${formatNumber(threshold)}; ` +
    `una barra que contiene el umbral solo está rayada en parte.` +
    (overflow > 0 ? ` ${formatInteger(overflow)} futuros superaron ${formatNumber(upper)} y no se ven en detalle.` : '');

  return (
    <>
      <MetricList metrics={buildMetrics(result)} label="Métricas de pérdidas compuestas" />
      <div className="lab__interpretation">
        {interpretCompoundLoss(result).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <ChartFigure
        title="Distribución de la pérdida total por periodo"
        description={description}
        table={{
          caption: 'Periodos según su pérdida total',
          columns: ['Rango de pérdida', 'Periodos', 'Proporción', `Periodos por encima de ${formatNumber(threshold)}`],
          rows: [
            ...bins
              .filter((bin) => bin.count > 0)
              .map((bin) => [
                `${formatNumber(bin.x0)} – ${formatNumber(bin.x1)}`,
                formatInteger(bin.count),
                formatPercent(bin.count / futures),
                formatInteger(bin.highlightedCount ?? 0),
              ]),
            ...(overflow > 0
              ? [
                  [
                    `Más de ${formatNumber(upper)}`,
                    formatInteger(overflow),
                    formatPercent(overflow / futures),
                    formatInteger(overflow),
                  ],
                ]
              : []),
          ],
        }}
      >
        {(labelling) => (
          <Histogram
            labelling={labelling}
            bins={bins}
            xLabel="Pérdida total del periodo"
            yLabel="Periodos"
            formatX={formatNumber}
            markers={[
              { value: median, label: `Mediana: ${formatNumber(median)}` },
              { value: p90, label: `P90: ${formatNumber(p90)}` },
              { value: mean, label: `Media: ${formatNumber(mean)}` },
            ]}
            legend={{ base: `${formatNumber(threshold)} o menos`, highlighted: `Más de ${formatNumber(threshold)}` }}
          />
        )}
      </ChartFigure>
    </>
  );
}

export function CompoundLossLab({ params, seed, shareUrl, onRun }: LabViewProps<'compound-loss'>) {
  const [draft, update] = useParamDraft(compoundLossSchema, params);
  const simulation = useSimulation('compound-loss', { ...params, seed });
  const { result } = simulation;

  const status = simulation.running
    ? `Simulando ${formatSampleCount(params.futures)}…`
    : simulation.error
      ? `No se pudo completar la simulación: ${simulation.error}`
      : `Listo: ${formatSampleCount(params.futures)} con la semilla ${seed}.`;

  return (
    <LabLayout
      question={labInfo['compound-loss'].question}
      intro={
        <p>
          Unos pocos eventos raros y costosos pueden hacer que la pérdida media sea muy distinta de la pérdida
          habitual. Ajusta cuántos eventos esperas por periodo y su severidad típica para ver cómo se forma esa cola.
        </p>
      }
      controls={
        <SimulationForm
          legend="Valores del experimento"
          seed={seed}
          onSimulate={({ keepSeed }) => onRun(draft, keepSeed ? seed : generateSeed())}
        >
          <RangeField
            name="frequency"
            label="Eventos esperados por periodo"
            unit="eventos"
            spec={specs.frequency}
            value={draft.frequency}
            onChange={(value) => update('frequency', value)}
          />
          <RangeField
            name="severity"
            label="Severidad típica (mediana) de cada evento"
            unit="unidades"
            spec={specs.severity}
            value={draft.severity}
            onChange={(value) => update('severity', value)}
          />
          <RangeField
            name="dispersion"
            label="Dispersión de la severidad (σ del logaritmo)"
            spec={specs.dispersion}
            value={draft.dispersion}
            onChange={(value) => update('dispersion', value)}
          />
          <RangeField
            name="threshold"
            label="Umbral de pérdida total a superar"
            unit="unidades"
            spec={specs.threshold}
            value={draft.threshold}
            onChange={(value) => update('threshold', value)}
          />
          <RangeField
            name="futures"
            label="Periodos simulados"
            hint="Más periodos dan una estimación más precisa."
            spec={specs.futures}
            value={draft.futures}
            onChange={(value) => update('futures', value)}
          />
        </SimulationForm>
      }
      status={status}
      busy={simulation.running}
      results={result ? <Results result={result} /> : null}
      howToRead={
        <ul>
          <li>
            El histograma reúne todos los periodos simulados según su pérdida total. La parte rayada de cada barra
            son los periodos cuya pérdida es mayor que el umbral elegido, igual que en la probabilidad de superarlo.
          </li>
          <li>Las líneas verticales marcan la mediana, el percentil 90 y la media: cuanto más lejos esté la media de la mediana, más marcada es la asimetría.</li>
          <li>
            «Exacto» se calcula con la fórmula del modelo y no depende de la semilla. «Estimado con N simulaciones» es
            lo observado en los periodos simulados.
          </li>
        </ul>
      }
      assumptions={
        <ul>
          <li>El número de eventos por periodo sigue una distribución de Poisson con la media elegida.</li>
          <li>La severidad de cada evento es lognormal, con mediana igual a la severidad típica elegida y σ igual a la dispersión.</li>
          <li>Los eventos son independientes entre sí y del número de eventos del periodo.</li>
          <li>Cada futuro simulado representa un único periodo.</li>
        </ul>
      }
      shareUrl={shareUrl}
    />
  );
}
