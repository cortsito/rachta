import { LAB_IDS, labInfo } from './labs.ts';
import { followLink } from './location.ts';

export function Landing() {
  return (
    <article className="landing" aria-labelledby="view-title">
      <h1 id="view-title" tabIndex={-1}>
        Rachas: un laboratorio de aleatoriedad, rachas y riesgo
      </h1>
      <p>
        Cambia una hipótesis, simula miles de futuros reproducibles y compara tu intuición con la probabilidad exacta y
        con la estimación de la simulación.
      </p>
      <h2>Elige una pregunta</h2>
      <ul className="lab-list">
        {LAB_IDS.map((lab) => (
          <li className="lab-list__item" key={lab}>
            <a className="lab-list__link" href={`?lab=${lab}`} onClick={(event) => followLink(event, `?lab=${lab}`)}>
              {labInfo[lab].title}
            </a>
            <p className="lab-list__question">{labInfo[lab].question}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
