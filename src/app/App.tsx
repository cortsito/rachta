import { useEffect, useMemo, useRef } from 'react';
import { BayesLab } from '../features/bayes/BayesLab.tsx';
import { CompoundLossLab } from '../features/compound-loss/CompoundLossLab.tsx';
import { RuinLab } from '../features/ruin/RuinLab.tsx';
import { StreaksLab } from '../features/streaks/StreaksLab.tsx';
import { generateSeed } from '../lib/random.ts';
import { LAB_IDS, labInfo, labNumber, type LabId } from './labs.ts';
import { Landing } from './Landing.tsx';
import { absoluteUrl, currentFragment, followLink, navigate, useQueryString } from './location.ts';
import { methodSectionId, MethodPage } from './MethodPage.tsx';
import { resolveQuery, serializeQuery, type LabState, type LabStateOf, type PageId, type QueryState } from './query.ts';
import { UsesPage } from './UsesPage.tsx';

const SITE_NAME = 'Rachta';

/** Primary navigation. `page: null` is the landing view, which also holds the lab catalogue. */
const NAV_ITEMS: readonly { label: string; page: PageId | null }[] = [
  { label: 'Explorar', page: null },
  { label: 'Método', page: 'method' },
  { label: 'Usos', page: 'uses' },
];

const PAGE_TITLES: Record<PageId, string> = { method: 'Método', uses: 'Usos' };

function pageSearch(page: PageId | null): string {
  return serializeQuery({ lab: null, page });
}

export function viewTitle(state: QueryState): string {
  if (state.lab !== null) return `${labInfo[state.lab].title} — ${SITE_NAME}`;
  if (state.page !== null) return `${PAGE_TITLES[state.page]} — ${SITE_NAME}`;
  return `${SITE_NAME} — laboratorio de aleatoriedad`;
}

/**
 * `aria-current` for a navigation item: "page" on its own view, and "true"
 * on Explorar while a lab (part of that section) is open.
 */
export function navCurrent(state: QueryState, page: PageId | null): 'page' | 'true' | undefined {
  if (state.lab !== null) return page === null ? 'true' : undefined;
  return state.page === page ? 'page' : undefined;
}

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

/** Where to go after a lab: its method entry and the next lab. */
function LabPager({ lab }: { lab: LabId }) {
  const next = LAB_IDS[(LAB_IDS.indexOf(lab) + 1) % LAB_IDS.length]!;
  const methodSearch = pageSearch('method');
  const methodId = methodSectionId(lab);
  return (
    <nav className="lab-pager" aria-label="Seguir explorando">
      <a
        className="lab-pager__link"
        href={`${methodSearch}#${methodId}`}
        onClick={(event) => followLink(event, methodSearch, methodId)}
      >
        <span className="lab-pager__kicker">Método</span>
        <span className="lab-pager__title">Cómo se calcula este laboratorio</span>
      </a>
      <a className="lab-pager__link" href={`?lab=${next}`} onClick={(event) => followLink(event, `?lab=${next}`)}>
        <span className="lab-pager__kicker">Siguiente laboratorio · {labNumber(next)}</span>
        <span className="lab-pager__title">{labInfo[next].question}</span>
      </a>
    </nav>
  );
}

function View({ state }: { state: QueryState }) {
  if (state.lab !== null) {
    return (
      <>
        <LabView key={state.lab} state={state} />
        <LabPager lab={state.lab} />
      </>
    );
  }
  switch (state.page) {
    case 'method':
      return <MethodPage />;
    case 'uses':
      return <UsesPage />;
    case null:
      return <Landing />;
  }
}

export function App() {
  const search = useQueryString();
  // The location store keeps the URL canonical, so the seed fallback is never used here.
  const state = useMemo(() => resolveQuery(search, generateSeed), [search]);
  const view = state.lab ?? state.page ?? 'landing';
  const previousView = useRef<string | null>(null);

  useEffect(() => {
    document.title = viewTitle(state);
    const firstRender = previousView.current === null;
    if (previousView.current !== view) {
      const fragment = currentFragment();
      const target = fragment ? document.getElementById(fragment) : null;
      // A shared deep link scrolls to its section; in-app navigation moves focus to
      // the requested section or to the new view's heading (not on new runs).
      if (firstRender) target?.scrollIntoView();
      else (target ?? document.getElementById('view-title'))?.focus();
    }
    previousView.current = view;
    // `view` identifies the view; the title depends on nothing else in `state`.
  }, [view]);

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className="site-header">
        <a className="site-header__name" href="./" onClick={(event) => followLink(event, '')}>
          {SITE_NAME}
        </a>
        <nav className="site-nav" aria-label="Principal">
          <ul className="site-nav__list">
            {NAV_ITEMS.map(({ label, page }) => (
              <li key={label}>
                <a
                  className="site-nav__link"
                  href={pageSearch(page) || './'}
                  aria-current={navCurrent(state, page)}
                  onClick={(event) => followLink(event, pageSearch(page))}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="site-main" id="contenido" tabIndex={-1}>
        <View state={state} />
      </main>
      <footer className="site-footer">
        <p className="site-footer__disclaimer">
          Herramienta educativa sobre probabilidad. No ofrece recomendaciones financieras, médicas ni de apuestas.
        </p>
        <p className="site-footer__meta">
          Hecho por Luis Cortés · Esta aplicación no usa cookies ni analítica de terceros. Las simulaciones se calculan
          en tu navegador, sin cuentas.
        </p>
        <p className="site-footer__links">
          <a href="https://github.com/cortsito" rel="noreferrer">
            GitHub
          </a>
          <span aria-hidden="true">·</span>
          <a href="https://corshex.com" rel="noreferrer">
            corshex.com
          </a>
          <span aria-hidden="true">·</span>
          <a href="https://www.linkedin.com/in/corshex" rel="noreferrer">
            LinkedIn
          </a>
        </p>
        <p>
          <a href="https://ko-fi.com/corshex" rel="noreferrer">
            Invítame un café
          </a>{' '}
          (sitio externo)
        </p>
      </footer>
    </>
  );
}
