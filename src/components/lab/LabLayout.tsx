import type { ReactNode } from 'react';
import { Disclosure } from '../ui/Disclosure.tsx';
import { ShareLink } from './ShareLink.tsx';

export interface LabLayoutProps {
  /** Short line above the question, e.g. "Laboratorio 01 · Rachas de derrotas". */
  eyebrow: string;
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
  /** The answer first, then visualizations, supporting metrics and interpretation. */
  results: ReactNode;
  howToRead: ReactNode;
  assumptions: ReactNode;
  shareUrl: string;
}

/**
 * Shared structure of every lab (see the product brief's lab contract).
 * The heading id `view-title` receives focus after view navigation.
 * Source order is the reading and tab order at every width: framing →
 * controls → results → notes → share. Wide screens place the controls in a
 * rail beside the other three (layout.css).
 */
export function LabLayout({
  eyebrow,
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
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="lab__title" id="view-title" tabIndex={-1}>
          {question}
        </h1>
        <div className="lab__intro">{intro}</div>
      </header>

      <section className="lab__controls" aria-labelledby="lab-controls-title">
        <h2 className="lab__heading" id="lab-controls-title">
          Hipótesis
        </h2>
        {controls}
      </section>

      <section className="lab__results" aria-labelledby="lab-results-title" aria-busy={busy}>
        <div className="lab__results-header">
          <h2 className="lab__heading" id="lab-results-title">
            Resultados
          </h2>
          <p className="lab__status" role="status">
            {status}
          </p>
        </div>
        {results}
      </section>

      <section className="lab__notes" aria-labelledby="lab-notes-title">
        <h2 className="lab__heading" id="lab-notes-title">
          Para entenderlo mejor
        </h2>
        <Disclosure summary="Cómo leer esto">{howToRead}</Disclosure>
        <Disclosure summary="Supuestos">{assumptions}</Disclosure>
      </section>

      <section className="lab__share" aria-labelledby="lab-share-title">
        <h2 className="lab__heading" id="lab-share-title">
          Compartir este escenario
        </h2>
        <ShareLink url={shareUrl} />
      </section>
    </article>
  );
}
