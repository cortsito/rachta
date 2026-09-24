import { ChartFigure } from '../../components/charts/ChartFigure.tsx';
import { Histogram, type HistogramBin } from '../../components/charts/Histogram.tsx';
import { LabLayout } from '../../components/lab/LabLayout.tsx';
import { SimulationForm } from '../../components/lab/SimulationForm.tsx';
import { useParamDraft } from '../../components/lab/useParamDraft.ts';
import { MetricList, type Metric } from '../../components/ui/MetricList.tsx';
import { RangeField } from '../../components/ui/RangeField.tsx';
import { labEyebrow, labInfo, type LabViewProps } from '../../app/labs.ts';
import { useSimulation } from '../../app/useSimulation.ts';
import { formatInteger, formatInterval, formatNumber, formatPercent, formatSampleCount } from '../../lib/format.ts';
import { generateSeed } from '../../lib/random.ts';
import { streaksGuide } from './guide.ts';
import { interpretStreaks } from './interpretation.ts';
import type { StreaksResult } from './model.ts';
import { streaksSchema } from './params.ts';
import { RunSequence, sequenceRows } from './RunSequence.tsx';
import './streaks.css';

const { specs } = streaksSchema;

/** The lab's single answer, then the figures that support it. */
function buildMetrics(result: StreaksResult): { answer: Metric; supporting: Metric[] } {
  const { streak, attempts, futures, seed } = result.input;
  const { reached } = result;
  const answer: Metric = {
    id: 'reach-estimated',
    label: `Probabilidad de perder ${formatInteger(streak)} o más seguidas en ${formatInteger(attempts)} intentos`,
    value: formatPercent(reached.value),
    provenance: { kind: 'estimated', samples: futures },
    detail: `${formatInteger(reached.successes)} de ${formatInteger(futures)} futuros · IC 95 %: ${formatInterval(reached.interval95)}`,
  };
  const supporting: Metric[] = [
    {
      id: 'reach-exact',
      label: 'La misma probabilidad, calculada con fórmula',
      value: formatPercent(result.exactReachProbability),
      provenance: { kind: 'exact' },
      detail: 'No depende de la semilla ni del número de futuros.',
    },
    {
      id: 'median-longest',
      label: 'Mediana de la peor racha de fallos por futuro',
      value: formatNumber(result.medianLongest),
      provenance: { kind: 'estimated', samples: futures },
    },
    {
      id: 'sample-longest',
      label: 'Peor racha de fallos en el futuro mostrado',
      value: formatInteger(result.sampleRunLongest.length),
      provenance: { kind: 'sample', description: `Un solo futuro (semilla ${seed})` },
    },
  ];
  return { answer, supporting };
}

function distributionBins(result: StreaksResult): HistogramBin[] {
  const upper = Math.max(result.maxObservedLongest, result.input.streak);
  return Array.from({ length: upper + 1 }, (_, v) => ({
    x0: v,
    x1: v + 1,
    count: result.longestCounts[v] ?? 0,
    highlighted: v >= result.input.streak,
  }));
}

function Results({ result }: { result: StreaksResult }) {
  const { streak, attempts, futures } = result.input;
  const { answer, supporting } = buildMetrics(result);
  const bins = distributionBins(result);
  const mode = bins.reduce((best, bin) => (bin.count > best.count ? bin : best), bins[0]!).x0;
  const run = result.sampleRunLongest;
  const failures = attempts - result.sampleRunSuccesses;

  const runDescription =
    `Futuro de muestra con ${formatInteger(attempts)} intentos: ${formatInteger(result.sampleRunSuccesses)} aciertos y ` +
    `${formatInteger(failures)} fallos. ` +
    (run.length > 0
      ? `La peor racha fue de ${formatInteger(run.length)} fallos seguidos, del intento ${formatInteger(run.start + 1)} al ${formatInteger(run.start + run.length)}.`
      : 'No hubo ningún fallo.');

  const distributionDescription =
    `En ${formatInteger(futures)} futuros, la peor racha de fallos más frecuente fue de ${formatInteger(mode)} y la mediana, ` +
    `${formatNumber(result.medianLongest)}. ${formatInteger(result.reached.successes)} futuros ` +
    `(${formatPercent(result.reached.value)}) llegaron a ${formatInteger(streak)} o más: son las barras rayadas.`;

  return (
    <>
      <MetricList metrics={[answer]} label="Respuesta" primary />
      <ChartFigure
        title="Distribución de la peor racha de fallos"
        description={distributionDescription}
        table={{
          caption: 'Futuros según su peor racha de fallos',
          columns: ['Peor racha', 'Futuros', 'Proporción'],
          rows: bins
            .filter((bin) => bin.count > 0)
            .map((bin) => [formatInteger(bin.x0), formatInteger(bin.count), formatPercent(bin.count / futures)]),
        }}
      >
        {(labelling) => (
          <Histogram
            labelling={labelling}
            bins={bins}
            discrete
            xLabel="Peor racha de fallos seguidos en un futuro"
            yLabel="Futuros"
            formatX={formatInteger}
            markers={[{ value: result.medianLongest + 0.5, label: `Mediana: ${formatNumber(result.medianLongest)}` }]}
            legend={{ base: `Menos de ${formatInteger(streak)}`, highlighted: `${formatInteger(streak)} o más` }}
          />
        )}
      </ChartFigure>
      <MetricList metrics={supporting} label="Métricas de rachas" />
      <div className="lab__interpretation">
        {interpretStreaks(result).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <ChartFigure
        title="Un futuro de muestra, intento a intento"
        description={runDescription}
        tableSummary="Ver la secuencia como texto"
        table={{
          caption: 'Resultado de cada intento (A = acierto, F = fallo)',
          columns: ['Intentos', 'Resultados'],
          rows: sequenceRows(result.sampleRun),
        }}
      >
        {(labelling) => <RunSequence outcomes={result.sampleRun} longest={run} labelling={labelling} />}
      </ChartFigure>
    </>
  );
}

export function StreaksLab({ params, seed, shareUrl, onRun }: LabViewProps<'streaks'>) {
  const [draft, update] = useParamDraft(streaksSchema, params);
  const simulation = useSimulation('streaks', { ...params, seed });
  const { result } = simulation;

  const status = simulation.running
    ? `Simulando ${formatSampleCount(params.futures)}…`
    : simulation.error
      ? `No se pudo completar la simulación: ${simulation.error}`
      : `Listo: ${formatSampleCount(params.futures)} con la semilla ${seed}.`;

  return (
    <LabLayout
      eyebrow={labEyebrow('streaks')}
      question={labInfo.streaks.question}
      intro={
        <p>
          Acertar más de la mitad de las veces no protege de las rachas. Elige la probabilidad de acierto, cuántos
          intentos tiene cada futuro y qué racha de fallos te preocupa; después simula miles de futuros.
        </p>
      }
      controls={
        <SimulationForm
          legend="Valores del experimento"
          seed={seed}
          onSimulate={({ keepSeed }) => onRun(draft, keepSeed ? seed : generateSeed())}
        >
          <RangeField
            name="p"
            label="Probabilidad de acertar cada intento"
            spec={specs.p}
            value={draft.p}
            onChange={(value) => update('p', value)}
          />
          <RangeField
            name="attempts"
            label="Intentos por futuro"
            spec={specs.attempts}
            value={draft.attempts}
            onChange={(value) => update('attempts', value)}
          />
          <RangeField
            name="streak"
            label="Racha de fallos que te preocupa"
            hint="No puede superar los intentos por futuro."
            spec={specs.streak}
            max={draft.attempts}
            value={draft.streak}
            onChange={(value) => update('streak', value)}
          />
          <RangeField
            name="futures"
            label="Futuros simulados"
            hint="Más futuros dan una estimación más precisa."
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
            El histograma reúne todos los futuros: cada barra cuenta cuántos tuvieron esa peor racha de fallos. Las
            barras rayadas alcanzan la racha que elegiste.
          </li>
          <li>
            La cuadrícula muestra un único futuro: cada cuadro es un intento (lleno = acierto, vacío = fallo, rayado = su
            peor racha de fallos).
          </li>
          <li>
            «Exacto» se calcula con una fórmula y no depende de la semilla. «Estimado con N simulaciones» es lo que se
            observó en los futuros simulados; el intervalo de confianza del 95 % indica su margen de error.
          </li>
        </ul>
      }
      assumptions={
        <ul>
          {streaksGuide.method.assumptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      }
      shareUrl={shareUrl}
    />
  );
}
