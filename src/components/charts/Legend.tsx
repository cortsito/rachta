/**
 * Shared hatch pattern and HTML legend. Series are told apart by fill
 * pattern and line style, so charts stay readable without colour.
 */

export type SwatchKind = 'bar' | 'bar-highlighted' | 'line-muted' | 'line-primary' | 'line-secondary' | 'line-tertiary';

export interface LegendItem {
  label: string;
  swatch: SwatchKind;
}

/** Diagonal hatch used for highlighted bars. Render once inside each chart's <svg>. */
export function PatternDefs({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect className="chart__pattern-background" width="6" height="6" />
        <line className="chart__pattern-line" x1="0" y1="0" x2="0" y2="6" />
      </pattern>
    </defs>
  );
}

function Swatch({ kind, patternId }: { kind: SwatchKind; patternId?: string }) {
  if (kind.startsWith('line-')) {
    return (
      <svg className="chart__swatch" width="28" height="12" aria-hidden="true" focusable="false">
        <line className="chart__line" data-variant={kind.slice(5)} x1="1" x2="27" y1="6" y2="6" />
      </svg>
    );
  }
  const highlighted = kind === 'bar-highlighted';
  return (
    <svg className="chart__swatch" width="14" height="14" aria-hidden="true" focusable="false">
      <rect
        className="chart__bar"
        data-highlighted={highlighted ? '' : undefined}
        fill={highlighted && patternId ? `url(#${patternId})` : undefined}
        x="1"
        y="1"
        width="12"
        height="12"
      />
    </svg>
  );
}

export function Legend({ items, patternId }: { items: readonly LegendItem[]; patternId?: string }) {
  return (
    <ul className="chart__legend">
      {items.map((item) => (
        <li className="chart__legend-item" key={item.label}>
          <Swatch kind={item.swatch} {...(patternId ? { patternId } : {})} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
