import type { ReactNode } from 'react';
import { ProvenanceTag } from '../components/ui/MetricList.tsx';
import { EXACT_LABEL } from '../lib/format.ts';
import { labGuides } from './guides.ts';
import { LAB_IDS, labInfo, labNumber, type LabId } from './labs.ts';
import { followLink } from './location.ts';

/** Id of a lab's section heading on this page; also the URL fragment that links to it. */
export function methodSectionId(lab: LabId): string {
  return `metodo-${lab}`;
}

function TextList({ items }: { items: readonly string[] }) {
  return (
    <ul className="method__list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** One of the six fixed parts of a lab's method entry. */
function MethodPart({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="method__part">
      <h3 className="method__part-title">{title}</h3>
      {children}
    </div>
  );
}

function MethodSection({ lab }: { lab: LabId }) {
  const { method } = labGuides[lab];
  const id = methodSectionId(lab);
  return (
    <section className="method" aria-labelledby={id}>
      <header className="method__header">
        <p className="eyebrow">Laboratorio {labNumber(lab)}</p>
        <h2 className="method__title" id={id} tabIndex={-1}>
          {labInfo[lab].title}
        </h2>
        <p className="method__lab-question">{labInfo[lab].question}</p>
        <p>
          <a href={`?lab=${lab}`} onClick={(event) => followLink(event, `?lab=${lab}`)}>
            Abrir «{labInfo[lab].title}»
          </a>
        </p>
      </header>

      <div className="method__body">
        <MethodPart title="Pregunta">
          <p>{method.question}</p>
        </MethodPart>

        <MethodPart title="Modelo">
          <p>{method.model}</p>
          <dl className="method__terms">
            {method.variables.map(({ term, meaning }) => (
              <div className="method__term" key={term}>
                <dt className="method__symbol">{term}</dt>
                <dd>{meaning}</dd>
              </div>
            ))}
          </dl>
        </MethodPart>

        <MethodPart title="Fórmula o procedimiento">
          <div className="formula">
            {method.formulas.map((line) => (
              <p className="formula__line" key={line}>
                {line}
              </p>
            ))}
          </div>
          <ol className="method__list">
            {method.procedure.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </MethodPart>

        <MethodPart title="Qué se calcula exactamente">
          <dl className="method__provenance">
            <div className="method__provenance-group">
              <dt>
                <ProvenanceTag kind="exact">{EXACT_LABEL}</ProvenanceTag>
              </dt>
              <dd>
                <TextList items={method.exact} />
              </dd>
            </div>
            <div className="method__provenance-group">
              <dt>
                <ProvenanceTag kind="estimated">Estimado con N simulaciones</ProvenanceTag>
              </dt>
              <dd>
                <TextList items={method.estimated} />
              </dd>
            </div>
            {method.sample && (
              <div className="method__provenance-group">
                <dt>
                  <ProvenanceTag kind="sample">Un solo futuro</ProvenanceTag>
                </dt>
                <dd>
                  <TextList items={method.sample} />
                </dd>
              </div>
            )}
          </dl>
        </MethodPart>

        <MethodPart title="Supuestos">
          <TextList items={method.assumptions} />
        </MethodPart>

        <MethodPart title="Límites">
          <TextList items={method.limits} />
        </MethodPart>
      </div>
    </section>
  );
}

export function MethodPage() {
  return (
    <article className="page" aria-labelledby="view-title">
      <header className="page__header">
        <p className="eyebrow">Método</p>
        <h1 id="view-title" tabIndex={-1}>
          Cómo se calcula cada resultado
        </h1>
        <p className="page__lede">
          Cada laboratorio sigue el mismo esquema: la pregunta, el modelo, la fórmula o el procedimiento, qué se calcula
          con exactitud y qué se estima, los supuestos y los límites.
        </p>
      </header>

      <nav aria-label="Laboratorios en esta página">
        <ol className="toc">
          {LAB_IDS.map((lab) => (
            <li key={lab}>
              <a className="toc__link" href={`#${methodSectionId(lab)}`}>
                <span className="toc__number">{labNumber(lab)}</span> {labInfo[lab].title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section className="page__section" aria-labelledby="principles-title">
        <h2 className="section-title" id="principles-title">
          Principios comunes
        </h2>
        <dl className="glossary">
          <div className="glossary__item">
            <dt className="glossary__term">
              <ProvenanceTag kind="exact">{EXACT_LABEL}</ProvenanceTag>
            </dt>
            <dd>
              Resultado de una fórmula aplicada a los valores elegidos. No depende de la semilla ni del número de
              simulaciones.
            </dd>
          </div>
          <div className="glossary__item">
            <dt className="glossary__term">
              <ProvenanceTag kind="estimated">Estimado con N simulaciones</ProvenanceTag>
            </dt>
            <dd>
              Lo observado en N futuros simulados. Las proporciones llevan un intervalo de confianza de Wilson del 95 %.
              Las medianas y los percentiles interpolan entre los valores ordenados (cuantil de tipo 7, el habitual en R
              y NumPy).
            </dd>
          </div>
          <div className="glossary__item">
            <dt className="glossary__term">
              <ProvenanceTag kind="sample">Un solo futuro</ProvenanceTag>
            </dt>
            <dd>Un camino concreto, útil para ver qué aspecto tiene el azar. No es una estimación.</dd>
          </div>
          <div className="glossary__item">
            <dt className="glossary__term">Semilla y enlace</dt>
            <dd>
              Las simulaciones usan un generador pseudoaleatorio con semilla (hash cyrb128 y generador sfc32). El enlace
              guarda el laboratorio, los valores y la semilla, así que abrirlo reproduce los mismos futuros. Todo se
              calcula en tu navegador.
            </dd>
          </div>
        </dl>
      </section>


      {LAB_IDS.map((lab) => (
        <MethodSection key={lab} lab={lab} />
      ))}
    </article>
  );
}
