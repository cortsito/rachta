import type { ReactNode } from 'react';

/** Native <details>: keyboard and screen-reader support come from the browser. */
export function Disclosure({ summary, children, open }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="disclosure" open={open}>
      <summary className="disclosure__summary">{summary}</summary>
      <div className="disclosure__body">{children}</div>
    </details>
  );
}
