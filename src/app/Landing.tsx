import { ChartFigure } from '../components/charts/ChartFigure.tsx';
import { Histogram, type HistogramBin } from '../components/charts/Histogram.tsx';
import { ProvenanceTag } from '../components/ui/MetricList.tsx';
import { exactLosingStreakProbability } from '../features/streaks/model.ts';
import { streaksSchema } from '../features/streaks/params.ts';
import { EXACT_LABEL, formatInteger, formatOneIn, formatPercent } from '../lib/format.ts';
import { LAB_IDS, labInfo, labNumber } from './labs.ts';
import { followLink } from './location.ts';

/**
 * The hero graphic answers the first lab's default question exactly: no
 * simulation and no seed, so it is identical for every visitor.
 */
const { specs } = streaksSchema;
const HERO = { p: specs.p.default, attempts: specs.attempts.default, streak: specs.streak.default } as const;
const HERO_SHOWN = 12;
const COMMON_STREAK = 5;

const heroReach = (streak: number) => exactLosingStreakProbability(HERO.p, HERO.attempts, streak);
const heroBins: HistogramBin[] = Array.from({ length: HERO_SHOWN }, (_, i) => ({
  x0: i + 1,
  x1: i + 2,
  count: heroReach(i + 1),
  highlighted: i + 1 === HERO.streak,
}));
const questionReach = heroReach(HERO.streak);
const commonReach = heroReach(COMMON_STREAK);
const questionOneIn = formatOneIn(questionReach);

const heroSummary =
  `Con un ${formatPercent(HERO.p)} de acierto, en ${formatInteger(HERO.attempts)} intentos perder ` +
  `${formatInteger(COMMON_STREAK)} o más seguidas ocurre con una probabilidad del ${formatPercent(commonReach)}; ` +
  `perder ${formatInteger(HERO.streak)} o más, del ${formatPercent(questionReach)}` +
  (questionOneIn ? ` (${questionOneIn}).` : '.');

export function Landing() {
  return (
    <article className="landing" aria-labelledby="view-title">
      <header className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Laboratorio de aleatoriedad, rachas y riesgo</p>
          <h1 className="hero__title" id="view-title" tabIndex={-1}>
            Las malas rachas son más normales de lo que parecen.
          </h1>
          <p className="hero__lede">
            Cambia una hipótesis, simula miles de futuros reproducibles y compara tu intuición con la probabilidad
            exacta y con la estimación de la simulación.
          </p>
          <p className="hero__actions">
            <a
              className="button button--primary"
              href="?lab=streaks"
              onClick={(event) => followLink(event, '?lab=streaks')}
            >
              Abrir el primer laboratorio
            </a>
            <a className="hero__secondary" href="?page=method" onClick={(event) => followLink(event, '?page=method')}>
              Cómo se calcula
            </a>
          </p>
        </div>
        <div className="hero__figure">
          <ChartFigure
            title={`${EXACT_LABEL}: probabilidad de perder k o más seguidas`}
            description={heroSummary}
            table={{
              caption: `Probabilidad exacta de una racha de k o más fallos en ${formatInteger(HERO.attempts)} intentos`,
              columns: ['k', 'Probabilidad'],
              rows: heroBins.map((bin) => [formatInteger(bin.x0), formatPercent(bin.count)]),
            }}
          >
            {(labelling) => (
              <Histogram
                labelling={labelling}
                bins={heroBins}
                discrete
                height={240}
                xLabel="k: fallos seguidos"
                yLabel="Probabilidad"
                formatX={formatInteger}
                formatY={(value) => formatPercent(value)}
                markers={[
                  {
                    value: HERO.streak + 0.5,
                    label: `${formatInteger(HERO.streak)} o más: ${formatPercent(questionReach)}`,
                  },
                ]}
                legend={{ base: 'Otras rachas', highlighted: `La pregunta: ${formatInteger(HERO.streak)} o más` }}
              />
            )}
          </ChartFigure>
        </div>
      </header>

      <section className="landing__section" aria-labelledby="catalogue-title">
        <h2 className="section-title" id="catalogue-title">
          Elige una pregunta
        </h2>
        <ol className="lab-index">
          {LAB_IDS.map((lab) => (
            <li className="lab-index__item" key={lab}>
              <span className="lab-index__number" aria-hidden="true">
                {labNumber(lab)}
              </span>
              <p className="lab-index__name">{labInfo[lab].title}</p>
              <h3 className="lab-index__question">
                <a className="lab-index__link" href={`?lab=${lab}`} onClick={(event) => followLink(event, `?lab=${lab}`)}>
                  {labInfo[lab].question}
                </a>
              </h3>
              <p className="lab-index__summary">{labInfo[lab].summary}</p>
              <span className="lab-index__arrow" aria-hidden="true">
                →
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing__section" aria-labelledby="primer-title">
        <h2 className="section-title" id="primer-title">
          Tres respuestas que no conviene mezclar
        </h2>
        <dl className="glossary">
          <div className="glossary__item">
            <dt className="glossary__term">Tu intuición</dt>
            <dd>Lo que esperas antes de mirar los datos. Cada laboratorio la pone a prueba.</dd>
          </div>
          <div className="glossary__item">
            <dt className="glossary__term">
              <ProvenanceTag kind="exact">{EXACT_LABEL}</ProvenanceTag>
            </dt>
            <dd>Sale de una fórmula aplicada a tus supuestos. No depende de la semilla ni del número de simulaciones.</dd>
          </div>
          <div className="glossary__item">
            <dt className="glossary__term">
              <ProvenanceTag kind="estimated">Estimado con N simulaciones</ProvenanceTag>
            </dt>
            <dd>
              Lo observado en N futuros simulados. Siempre indica cuántos, y las proporciones llevan su intervalo de
              confianza del 95 %.
            </dd>
          </div>
        </dl>
        <p>
          <a href="?page=method" onClick={(event) => followLink(event, '?page=method')}>
            Ver cómo se calcula cada laboratorio
          </a>
        </p>
      </section>
    </article>
  );
}
