import type { ChartLabelling } from '../../components/charts/ChartFigure.tsx';
import { useChartWidth } from '../../components/charts/useChartWidth.ts';
import { CONFUSION_CELLS, type Confusion } from './model.ts';

const CELL = 10;
const GAP = 2;
const PITCH = CELL + GAP;

/** Shapes (not colour) tell the four outcomes apart. */
const SHAPE: Record<(typeof CONFUSION_CELLS)[number], { tag: 'rect' | 'circle'; outline: boolean }> = {
  truePositive: { tag: 'rect', outline: false },
  falseNegative: { tag: 'rect', outline: true },
  falsePositive: { tag: 'circle', outline: false },
  trueNegative: { tag: 'circle', outline: true },
};

function personShape(kind: (typeof CONFUSION_CELLS)[number], x: number, y: number, key: number) {
  const shape = SHAPE[kind];
  const className = 'people-grid__person';
  if (shape.tag === 'circle') {
    return (
      <circle
        key={key}
        className={className}
        data-kind={kind}
        data-outline={shape.outline ? '' : undefined}
        cx={x + CELL / 2}
        cy={y + CELL / 2}
        r={CELL / 2 - 0.5}
      />
    );
  }
  return (
    <rect
      key={key}
      className={className}
      data-kind={kind}
      data-outline={shape.outline ? '' : undefined}
      x={x + 0.5}
      y={y + 0.5}
      width={CELL - 1}
      height={CELL - 1}
    />
  );
}

/**
 * A grid of up to 1000 people illustrating the 2×2 split (feature-local; a
 * complement to the confusion-matrix table, never a replacement for it).
 */
export function PeopleGrid({ counts, labelling }: { counts: Confusion; labelling: ChartLabelling }) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const columns = Math.max(10, Math.floor(width / PITCH));
  const people = CONFUSION_CELLS.flatMap((kind) => Array.from({ length: counts[kind] }, () => kind));
  const rows = Math.ceil(people.length / columns);

  return (
    <div className="chart__canvas" ref={ref}>
      <svg
        className="chart__svg people-grid"
        role="img"
        width={columns * PITCH}
        height={Math.max(rows, 1) * PITCH}
        viewBox={`0 0 ${columns * PITCH} ${Math.max(rows, 1) * PITCH}`}
        focusable="false"
        {...labelling}
      >
        {people.map((kind, i) => personShape(kind, (i % columns) * PITCH, Math.floor(i / columns) * PITCH, i))}
      </svg>
      <ul className="chart__legend">
        <li className="chart__legend-item">
          <svg className="chart__swatch" width="14" height="14" aria-hidden="true" focusable="false">
            <rect className="people-grid__person" data-kind="truePositive" x="1" y="1" width="12" height="12" />
          </svg>
          Verdadero positivo (cuadro relleno)
        </li>
        <li className="chart__legend-item">
          <svg className="chart__swatch" width="14" height="14" aria-hidden="true" focusable="false">
            <rect className="people-grid__person" data-kind="falseNegative" data-outline="" x="1" y="1" width="12" height="12" />
          </svg>
          Falso negativo (cuadro hueco)
        </li>
        <li className="chart__legend-item">
          <svg className="chart__swatch" width="14" height="14" aria-hidden="true" focusable="false">
            <circle className="people-grid__person" data-kind="falsePositive" cx="7" cy="7" r="6" />
          </svg>
          Falso positivo (círculo relleno)
        </li>
        <li className="chart__legend-item">
          <svg className="chart__swatch" width="14" height="14" aria-hidden="true" focusable="false">
            <circle className="people-grid__person" data-kind="trueNegative" data-outline="" cx="7" cy="7" r="6" />
          </svg>
          Verdadero negativo (círculo hueco)
        </li>
      </ul>
    </div>
  );
}
