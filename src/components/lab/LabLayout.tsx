import type { ReactNode } from 'react';
import { Disclosure } from '../ui/Disclosure.tsx';
import { ShareLink } from './ShareLink.tsx';

export interface LabLayoutProps {
  /** The lab's human question; rendered as the page heading. */
  question: string;
  /** One or two short paragraphs framing the question. */
  intro: ReactNode;
  /** The lab's <SimulationForm>. */
  controls: ReactNode;
  /** Short live status ("Simulando…", "Listo: …"); announced politely. */
  status: string;
  /** True while results are being recomputed; marks the results region busy. */
  busy: boolean;
  /** Visualizations, metrics and interpretation. */
  results: ReactNode;
  howToRead: ReactNode;
  assumptions: ReactNode;
  shareUrl: string;
}

/**
 * Shared structure of every lab (see the product brief's lab contract).
 * The heading id `view-title` receives focus after view navigation.
 */
export function LabLayout({
  question,
  intro,
  controls,
  status,
  busy,
  results,
  howToRead,
  assumptions,
  shareUrl,
}: LabLayoutProps) {
  return (
    <article className="lab" aria-labelledby="view-title">
      <header className="lab__header">
        <h1 id="view-title" tabIndex={-1}>
          {question}
        </h1>
        <div className="lab__intro">{intro}</div>
      </header>

      <div className="lab__body">
        <section className="lab__controls" aria-labelledby="lab-controls-title">
          <h2 id="lab-controls-title">Hipótesis</h2>
          {controls}
        </section>

        <section className="lab__results" aria-labelledby="lab-results-title" aria-busy={busy}>
          <h2 id="lab-results-title">Resultados</h2>
          <p className="lab__status" role="status">
            {status}
          </p>
          {results}
        </section>
      </div>

      <section className="lab__notes" aria-labelledby="lab-notes-title">
        <h2 id="lab-notes-title">Para entenderlo mejor</h2>
        <Disclosure summary="Cómo leer esto">{howToRead}</Disclosure>
        <Disclosure summary="Supuestos">{assumptions}</Disclosure>
      </section>

      <section className="lab__share" aria-labelledby="lab-share-title">
        <h2 id="lab-share-title">Compartir este escenario</h2>
        <ShareLink url={shareUrl} />
      </section>
    </article>
  );
}
