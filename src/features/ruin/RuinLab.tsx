import { ChartFigure } from '../../components/charts/ChartFigure.tsx';
import { LinePlot } from '../../components/charts/LinePlot.tsx';
import { LabLayout } from '../../components/lab/LabLayout.tsx';
import { SimulationForm } from '../../components/lab/SimulationForm.tsx';
import { useParamDraft } from '../../components/lab/useParamDraft.ts';
import { MetricList, type Metric } from '../../components/ui/MetricList.tsx';
import { RangeField } from '../../components/ui/RangeField.tsx';
import { labInfo, type LabViewProps } from '../../app/labs.ts';
import { useSimulation } from '../../app/useSimulation.ts';
import { formatInteger, formatInterval, formatNumber, formatPercent, formatSampleCount } from '../../lib/format.ts';
import { generateSeed } from '../../lib/random.ts';
import { ruinChart } from './chart.ts';
import { interpretRuin } from './interpretation.ts';
import { RUIN_FRACTION, type RuinResult } from './model.ts';
import { MAX_REACHABLE_CAPITAL, roundsLimit, ruinSchema } from './params.ts';

const { specs } = ruinSchema;

function buildMetrics(result: RuinResult): Metric[] {
  const { futures } = result.input;
  const { ruined, medianMaxDrawdown, medianFinalCapital, exact } = result;
  const typicalGrowth = exact.expectedLogGrowth === -Infinity ? '−100 %' : formatPercent(Math.exp(exact.expectedLogGrowth) - 1);
  return [
    {
      id: 'ruin-probability',
      label: `Probabilidad de ruina (capital bajo el ${formatPercent(RUIN_FRACTION)} inicial)`,
      value: formatPercent(ruined.value),
      provenance: { kind: 'estimated', samples: futures },
      detail: `${formatInteger(ruined.successes)} de ${formatInteger(ruined.trials)} futuros · IC 95 %: ${formatInterval(ruined.interval95)}`,
    },
    {
      id: 'median-drawdown',
      label: 'Caída máxima típica (mediana)',
      value: formatPercent(medianMaxDrawdown),
      provenance: { kind: 'estimated', samples: futures },
    },
    {
      id: 'median-final-capital',
      label: 'Capital final típico (mediana)',
      value: formatNumber(medianFinalCapital),
      provenance: { kind: 'estimated', samples: futures },
    },
    {
      id: 'per-round-edge',
      label: 'Ventaja por ronda (media aritmética)',
      value: formatPercent(exact.expectedMultiplier - 1),
      provenance: { kind: 'exact' },
      detail: 'Puede ser positiva aunque el crecimiento típico no lo sea.',
    },
    {
      id: 'typical-growth',
      label: 'Crecimiento típico por ronda (mediana, escala logarítmica)',
      value: typicalGrowth,
      provenance: { kind: 'exact' },
    },
  ];
}

function Results({ result }: { result: RuinResult }) {
  const { capital, futures } = result.input;
  const { checkpoints, bands, samplePaths } = result;
  const [p10, p50, p90] = bands;
  const { series, references } = ruinChart(result);

  const description =
    `${formatInteger(samplePaths.length)} futuros de muestra (líneas finas) junto a los percentiles 10, 50 y 90 del ` +
    `capital en ${formatInteger(checkpoints.length)} puntos de control, sobre ${formatInteger(futures)} futuros. El ` +
    `capital final típico (mediana) es ${formatNumber(result.medianFinalCapital)}, frente a un capital inicial de ` +
    `${formatNumber(capital)}. El eje vertical se ajusta a los percentiles y a las líneas de referencia; los futuros ` +
    `de muestra que se salen de ese rango aparecen recortados.`;

  return (
    <>
      <MetricList metrics={buildMetrics(result)} label="Métricas de riesgo de ruina" />
      <div className="lab__interpretation">
        {interpretRuin(result).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <ChartFigure
        title="Capital simulado a lo largo de las rondas"
        description={description}
        table={{
          caption: 'Percentiles del capital en cada punto de control',
          columns: ['Ronda', 'P10', 'P50', 'P90'],
          rows: Array.from(checkpoints, (round, i) => [
            formatInteger(round),
            formatNumber(p10!.values[i]!),
            formatNumber(p50!.values[i]!),
            formatNumber(p90!.values[i]!),
          ]),
        }}
      >
        {(labelling) => (
          <LinePlot
            labelling={labelling}
            yScale="log"
            xLabel="Ronda"
            yLabel="Capital"
            formatX={formatInteger}
            formatY={formatNumber}
            references={references}
            series={series}
          />
        )}
      </ChartFigure>
    </>
  );
}

export function RuinLab({ params, seed, shareUrl, onRun }: LabViewProps<'ruin'>) {
  const [draft, update] = useParamDraft(ruinSchema, params);
  const simulation = useSimulation('ruin', { ...params, seed });
  const { result } = simulation;
  const maxRounds = roundsLimit(draft);

  const status = simulation.running
    ? `Simulando ${formatSampleCount(params.futures)}…`
    : simulation.error
      ? `No se pudo completar la simulación: ${simulation.error}`
      : `Listo: ${formatSampleCount(params.futures)} con la semilla ${seed}.`;

  return (
    <LabLayout
      question={labInfo.ruin.question}
      intro={
        <>
          <p>
            Expón una fracción de tu capital cada ronda y observa si una pequeña ventaja basta para sobrevivir a una
            mala secuencia, o si exponer demasiado te arruina incluso con la ventaja de tu lado.
          </p>
          <p role="note">
            Herramienta educativa con unidades hipotéticas: no es una recomendación financiera, de apuestas ni de
            ningún tipo de decisión real.
          </p>
        </>
      }
      controls={
        <SimulationForm
          legend="Valores del experimento"
          seed={seed}
          onSimulate={({ keepSeed }) => onRun(draft, keepSeed ? seed : generateSeed())}
        >
          <RangeField
            name="capital"
            label="Capital inicial"
            unit="unidades"
            spec={specs.capital}
            value={draft.capital}
            onChange={(value) => update('capital', value)}
          />
          <RangeField
            name="p"
            label="Probabilidad de una ronda favorable"
            spec={specs.p}
            value={draft.p}
            onChange={(value) => update('p', value)}
          />
          <RangeField
            name="gain"
            label="Ganancia relativa de lo expuesto en una ronda favorable"
            spec={specs.gain}
            value={draft.gain}
            onChange={(value) => update('gain', value)}
          />
          <RangeField
            name="loss"
            label="Pérdida relativa de lo expuesto en una ronda desfavorable"
            spec={specs.loss}
            value={draft.loss}
            onChange={(value) => update('loss', value)}
          />
          <RangeField
            name="fraction"
            label="Fracción del capital actual expuesta cada ronda"
            spec={specs.fraction}
            value={draft.fraction}
            onChange={(value) => update('fraction', value)}
          />
          <RangeField
            name="rounds"
            label="Rondas por futuro"
            {...(maxRounds < specs.rounds.max
              ? {
                  hint:
                    `Con estos valores, el máximo es ${formatInteger(maxRounds)}: con más rondas, el capital podría ` +
                    `superar ${formatNumber(MAX_REACHABLE_CAPITAL)} y el cálculo dejaría de dar resultados válidos.`,
                }
              : {})}
            spec={specs.rounds}
            max={maxRounds}
            value={draft.rounds}
            onChange={(value) => update('rounds', value)}
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
            Cada línea fina es un futuro de muestra. Las líneas discontinuas marcan los percentiles 10 y 90 del
            capital en cada punto de control, y la línea gruesa la mediana (percentil 50): son bandas puntuales, no
            trayectorias individuales.
          </li>
          <li>La escala vertical es logarítmica, apropiada para una cantidad que se multiplica ronda a ronda.</li>
          <li>
            «Exacto» se calcula con una fórmula y no depende de la semilla. «Estimado con N simulaciones» es lo
            observado en los futuros simulados.
          </li>
        </ul>
      }
      assumptions={
        <ul>
          <li>Cada ronda expone una fracción fija del capital actual (no del capital inicial).</li>
          <li>Las rondas son independientes entre sí, con la misma probabilidad de éxito.</li>
          <li>
            La ruina es absorbente: cuando el capital cae por debajo del {formatPercent(RUIN_FRACTION)} del capital
            inicial, ese futuro deja de jugar y mantiene ese valor.
          </li>
          <li>Es un modelo educativo con unidades hipotéticas: no representa dinero real ni una recomendación.</li>
        </ul>
      }
      shareUrl={shareUrl}
    />
  );
}
