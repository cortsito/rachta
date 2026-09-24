import { ChartFigure } from '../../components/charts/ChartFigure.tsx';
import { LabLayout } from '../../components/lab/LabLayout.tsx';
import { SimulationForm } from '../../components/lab/SimulationForm.tsx';
import { useParamDraft } from '../../components/lab/useParamDraft.ts';
import { MetricList, type Metric } from '../../components/ui/MetricList.tsx';
import { RangeField } from '../../components/ui/RangeField.tsx';
import { labEyebrow, labInfo, type LabViewProps } from '../../app/labs.ts';
import { useSimulation } from '../../app/useSimulation.ts';
import { formatInteger, formatInterval, formatPercent } from '../../lib/format.ts';
import { generateSeed } from '../../lib/random.ts';
import { ConfusionMatrix } from './ConfusionMatrix.tsx';
import { bayesGuide } from './guide.ts';
import { interpretBayes } from './interpretation.ts';
import { expectedCounts, type BayesResult } from './model.ts';
import { bayesSchema } from './params.ts';
import { PeopleGrid } from './PeopleGrid.tsx';
import './bayes.css';

const { specs } = bayesSchema;
const PEOPLE_GRID_SIZE = 1000;

/** The lab's single answer, then the figures that support it. */
function buildMetrics(result: BayesResult): { answer: Metric; supporting: Metric[] } {
  const { population } = result.input;
  const { exact, simulatedPpv } = result;
  const answer: Metric = {
    id: 'ppv-exact',
    label: 'Probabilidad de tener la condición si el resultado es positivo (VPP)',
    value: exact.ppv === null ? 'No definido' : formatPercent(exact.ppv),
    provenance: { kind: 'exact' },
    detail: exact.ppv === null ? 'Con estos valores, nadie da positivo.' : 'No depende de la semilla.',
  };
  const supporting: Metric[] = [
    {
      id: 'ppv-estimated',
      label: 'La misma probabilidad, en la población simulada',
      value: simulatedPpv === null ? 'No definido' : formatPercent(simulatedPpv.value),
      provenance: { kind: 'estimated', samples: population },
      detail:
        simulatedPpv === null
          ? 'Nadie dio positivo en la población simulada.'
          : `${formatInteger(simulatedPpv.successes)} de ${formatInteger(simulatedPpv.trials)} positivos simulados · IC 95 %: ${formatInterval(simulatedPpv.interval95)}`,
    },
    {
      id: 'positive-rate',
      label: 'Proporción de la población que da positivo',
      value: formatPercent(exact.positiveRate),
      provenance: { kind: 'exact' },
    },
  ];
  if (exact.npv !== null) {
    supporting.push({
      id: 'npv-exact',
      label: 'Probabilidad de no tener la condición si el resultado es negativo (VPN)',
      value: formatPercent(exact.npv),
      provenance: { kind: 'exact' },
    });
  }
  return { answer, supporting };
}

function Results({ result }: { result: BayesResult }) {
  const { population } = result.input;
  const { answer, supporting } = buildMetrics(result);
  const gridCounts = expectedCounts(result.input, PEOPLE_GRID_SIZE);
  const gridDescription =
    `De ${formatInteger(PEOPLE_GRID_SIZE)} personas ilustrativas, ${formatInteger(gridCounts.truePositive)} son ` +
    `verdaderos positivos, ${formatInteger(gridCounts.falsePositive)} falsos positivos, ${formatInteger(gridCounts.falseNegative)} ` +
    `falsos negativos y ${formatInteger(gridCounts.trueNegative)} verdaderos negativos.`;

  return (
    <>
      <MetricList metrics={[answer]} label="Respuesta" primary />
      <ConfusionMatrix expected={result.expected} simulated={result.simulated} population={population} />
      <MetricList metrics={supporting} label="Métricas de la prueba" />
      <div className="lab__interpretation">
        {interpretBayes(result).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <ChartFigure title="Cuadrícula de personas" description={gridDescription}>
        {(labelling) => <PeopleGrid counts={gridCounts} labelling={labelling} />}
      </ChartFigure>
    </>
  );
}

export function BayesLab({ params, seed, shareUrl, onRun }: LabViewProps<'bayes'>) {
  const [draft, update] = useParamDraft(bayesSchema, params);
  const simulation = useSimulation('bayes', { ...params, seed });
  const { result } = simulation;

  const status = simulation.running
    ? `Simulando una población de ${formatInteger(params.population)}…`
    : simulation.error
      ? `No se pudo completar la simulación: ${simulation.error}`
      : `Listo: población simulada de ${formatInteger(params.population)} con la semilla ${seed}.`;

  return (
    <LabLayout
      eyebrow={labEyebrow('bayes')}
      question={labInfo.bayes.question}
      intro={
        <p>
          Una prueba fiable puede dar la mayoría de sus positivos a personas sanas si la condición es poco frecuente.
          Ajusta la prevalencia, la sensibilidad y la especificidad para ver cómo cambia la probabilidad real de tener
          la condición cuando el resultado es positivo.
        </p>
      }
      controls={
        <SimulationForm
          legend="Valores de la prueba"
          seed={seed}
          onSimulate={({ keepSeed }) => onRun(draft, keepSeed ? seed : generateSeed())}
        >
          <RangeField
            name="prevalence"
            label="Prevalencia de la condición en la población"
            spec={specs.prevalence}
            value={draft.prevalence}
            onChange={(value) => update('prevalence', value)}
          />
          <RangeField
            name="sensitivity"
            label="Sensibilidad (positivos correctos entre quienes tienen la condición)"
            spec={specs.sensitivity}
            value={draft.sensitivity}
            onChange={(value) => update('sensitivity', value)}
          />
          <RangeField
            name="specificity"
            label="Especificidad (negativos correctos entre quienes no la tienen)"
            spec={specs.specificity}
            value={draft.specificity}
            onChange={(value) => update('specificity', value)}
          />
          <RangeField
            name="population"
            label="Población simulada"
            unit="personas"
            spec={specs.population}
            value={draft.population}
            onChange={(value) => update('population', value)}
          />
        </SimulationForm>
      }
      status={status}
      busy={simulation.running}
      results={result ? <Results result={result} /> : null}
      howToRead={
        <ul>
          <li>
            La tabla 2×2 reparte a la población simulada según si tiene la condición (filas) y el resultado de la
            prueba (columnas). «Esperado» viene de la fórmula exacta; «Simulado», de la población simulada con la
            semilla actual.
          </li>
          <li>
            La cuadrícula de personas muestra la misma idea con 1000 personas ilustrativas: un cuadro relleno es un
            verdadero positivo, un cuadro hueco un falso negativo, un círculo relleno un falso positivo y un círculo
            hueco un verdadero negativo.
          </li>
          <li>
            «Exacto» se calcula con la regla de Bayes y no depende de la semilla. «Estimado con N simulaciones» es lo
            observado en la población simulada.
          </li>
        </ul>
      }
      assumptions={
        <ul>
          {bayesGuide.method.assumptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      }
      shareUrl={shareUrl}
    />
  );
}
