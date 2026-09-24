import { labGuides } from './guides.ts';
import { LAB_IDS, labInfo, labNumber } from './labs.ts';
import { followLink } from './location.ts';

export function UsesPage() {
  return (
    <article className="page" aria-labelledby="view-title">
      <header className="page__header">
        <p className="eyebrow">Usos</p>
        <h1 id="view-title" tabIndex={-1}>
          Cuándo ayuda cada laboratorio
        </h1>
        <p className="page__lede">
          Rachas sirve para razonar sobre situaciones en las que el azar engaña a la intuición. Estos son cuatro patrones
          habituales, cada uno con lo que ayuda a ver y con su límite.
        </p>
        <p className="note" role="note">
          Son ejemplos educativos. No son consejo financiero, médico, de apuestas ni de ningún otro tipo profesional, y
          no sustituyen el análisis de los datos reales de tu caso.
        </p>
      </header>

      <ol className="use-list">
        {LAB_IDS.map((lab) => {
          const { use } = labGuides[lab];
          const titleId = `uso-${lab}`;
          return (
            <li className="use" key={lab}>
              <div className="use__header">
                <p className="eyebrow">
                  {labNumber(lab)} · {labInfo[lab].title}
                </p>
                <h2 className="use__title" id={titleId}>
                  {use.title}
                </h2>
                <p>
                  <a href={`?lab=${lab}`} onClick={(event) => followLink(event, `?lab=${lab}`)}>
                    Probar «{labInfo[lab].title}»
                  </a>
                </p>
              </div>
              <dl className="use__facts">
                <div className="use__fact">
                  <dt className="use__label">Situación</dt>
                  <dd>{use.situation}</dd>
                </div>
                <div className="use__fact">
                  <dt className="use__label">Qué te ayuda a ver</dt>
                  <dd>{use.insight}</dd>
                </div>
                <div className="use__fact" data-kind="limit">
                  <dt className="use__label">Límite</dt>
                  <dd>{use.limit}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
