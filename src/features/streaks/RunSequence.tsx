import { useId } from 'react';
import type { ChartLabelling } from '../../components/charts/ChartFigure.tsx';
import { PatternDefs } from '../../components/charts/Legend.tsx';
import { useChartWidth } from '../../components/charts/useChartWidth.ts';
import type { LosingStreak } from './model.ts';

/** Row length is a multiple of this, so positions are easy to count. */
const ROW_GROUP = 10;

function cellSize(count: number): number {
  return count > 200 ? 8 : 14;
}

/**
 * One future as a grid of attempts: filled = success, outlined = failure,
 * hatched = failures in the longest losing streak.
 */
export function RunSequence({
  outcomes,
  longest,
  labelling,
}: {
  outcomes: Uint8Array;
  longest: LosingStreak;
  labelling: ChartLabelling;
}) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const patternId = useId();
  const size = cellSize(outcomes.length);
  const pitch = size + 2;
  const columns = Math.max(ROW_GROUP, Math.floor(width / pitch / ROW_GROUP) * ROW_GROUP);
  const rows = Math.ceil(outcomes.length / columns);
  const inStreak = (i: number) => longest.length > 0 && i >= longest.start && i < longest.start + longest.length;

  return (
    <div className="chart__canvas" ref={ref}>
      <svg
        className="chart__svg run-sequence"
        role="img"
        width={columns * pitch}
        height={rows * pitch}
        viewBox={`0 0 ${columns * pitch} ${rows * pitch}`}
        focusable="false"
        {...labelling}
      >
        <PatternDefs id={patternId} />
        {Array.from(outcomes, (outcome, i) => (
          <rect
            key={i}
            className="run-sequence__cell"
            data-outcome={outcome ? 'success' : 'failure'}
            data-streak={inStreak(i) ? '' : undefined}
            fill={inStreak(i) ? `url(#${patternId})` : undefined}
            x={(i % columns) * pitch + 1}
            y={Math.floor(i / columns) * pitch + 1}
            width={size}
            height={size}
          />
        ))}
      </svg>
      <ul className="chart__legend">
        <li className="chart__legend-item">
          <svg className="chart__swatch" width="14" height="14" aria-hidden="true" focusable="false">
            <rect className="run-sequence__cell" data-outcome="success" x="1" y="1" width="12" height="12" />
          </svg>
          Acierto
        </li>
        <li className="chart__legend-item">
          <svg className="chart__swatch" width="14" height="14" aria-hidden="true" focusable="false">
            <rect className="run-sequence__cell" data-outcome="failure" x="1" y="1" width="12" height="12" />
          </svg>
          Fallo
        </li>
        {longest.length > 0 && (
          <li className="chart__legend-item">
            <svg className="chart__swatch" width="14" height="14" aria-hidden="true" focusable="false">
              <rect
                className="run-sequence__cell"
                data-outcome="failure"
                data-streak=""
                fill={`url(#${patternId})`}
                x="1"
                y="1"
                width="12"
                height="12"
              />
            </svg>
            Peor racha de fallos
          </li>
        )}
      </ul>
    </div>
  );
}

/** Text fallback: attempts in groups of ten, A = acierto, F = fallo. */
export function sequenceRows(outcomes: Uint8Array): [string, string][] {
  const rows: [string, string][] = [];
  for (let start = 0; start < outcomes.length; start += ROW_GROUP) {
    const chunk = Array.from(outcomes.subarray(start, start + ROW_GROUP), (o) => (o ? 'A' : 'F'));
    rows.push([`${start + 1}–${start + chunk.length}`, chunk.join(' ')]);
  }
  return rows;
}
