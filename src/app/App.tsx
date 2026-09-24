import { useEffect, useMemo, useRef } from 'react';
import { BayesLab } from '../features/bayes/BayesLab.tsx';
import { CompoundLossLab } from '../features/compound-loss/CompoundLossLab.tsx';
import { RuinLab } from '../features/ruin/RuinLab.tsx';
import { StreaksLab } from '../features/streaks/StreaksLab.tsx';
import { generateSeed } from '../lib/random.ts';
import { LAB_IDS, labInfo, type LabId } from './labs.ts';
import { Landing } from './Landing.tsx';
import { absoluteUrl, followLink, navigate, useQueryString } from './location.ts';
import { resolveQuery, serializeQuery, type LabState, type LabStateOf } from './query.ts';

const SITE_NAME = 'Rachas';

function runLab<L extends LabId>(lab: L) {
  return (params: LabStateOf<L>['params'], seed: string) =>
    navigate(serializeQuery({ lab, params, seed } as LabState), 'replace');
}

function LabView({ state }: { state: LabState }) {
  const shareUrl = absoluteUrl(serializeQuery(state));
  switch (state.lab) {
    case 'streaks':
      return <StreaksLab params={state.params} seed={state.seed} shareUrl={shareUrl} onRun={runLab('streaks')} />;
    case 'bayes':
      return <BayesLab params={state.params} seed={state.seed} shareUrl={shareUrl} onRun={runLab('bayes')} />;
    case 'ruin':
      return <RuinLab params={state.params} seed={state.seed} shareUrl={shareUrl} onRun={runLab('ruin')} />;
    case 'compound-loss':
      return (
        <CompoundLossLab params={state.params} seed={state.seed} shareUrl={shareUrl} onRun={runLab('compound-loss')} />
      );
  }
}

export function App() {
  const search = useQueryString();
  // The location store keeps the URL canonical, so the seed fallback is never used here.
  const state = useMemo(() => resolveQuery(search, generateSeed), [search]);
  const previousLab = useRef(state.lab);

  useEffect(() => {
    document.title = state.lab ? `${labInfo[state.lab].title} — ${SITE_NAME}` : `${SITE_NAME} — laboratorio de aleatoriedad`;
    // Move focus to the new view's heading after in-app navigation (not on first load or new runs).
    if (previousLab.current !== state.lab) document.getElementById('view-title')?.focus();
    previousLab.current = state.lab;
  }, [state.lab]);

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className="site-header">
        <a className="site-header__name" href="./" onClick={(event) => followLink(event, '')}>
          {SITE_NAME}
        </a>
        <nav className="site-nav" aria-label="Laboratorios">
          <ul className="site-nav__list">
            {LAB_IDS.map((lab) => (
              <li key={lab}>
                <a
                  className="site-nav__link"
                  href={`?lab=${lab}`}
                  aria-current={state.lab === lab ? 'page' : undefined}
                  onClick={(event) => followLink(event, `?lab=${lab}`)}
                >
                  {labInfo[lab].title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="site-main" id="contenido" tabIndex={-1}>
        {state.lab === null ? <Landing /> : <LabView key={state.lab} state={state} />}
      </main>
      <footer className="site-footer">
        <p>
          Herramienta educativa sobre probabilidad. No ofrece recomendaciones financieras, médicas ni de apuestas. Todo se
          calcula en tu navegador: sin cuentas, sin servidor y sin seguimiento.
        </p>
      </footer>
    </>
  );
}
