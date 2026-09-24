import type { ChartLabelling } from './ChartFigure.tsx';
import type { ChartMarker } from './Histogram.tsx';
import { Legend, type LegendItem } from './Legend.tsx';
import { linearScale, logScale, logTicks, niceTicks, type Scale } from './scale.ts';
import { useChartWidth } from './useChartWidth.ts';

export type LineVariant = 'muted' | 'primary' | 'secondary' | 'tertiary';

export interface LineSeries {
  id: string;
  /** Legend text; series sharing a label share one legend entry. */
  label: string;
  values: ArrayLike<number>;
  /** x for each value; defaults to the index. */
  x?: ArrayLike<number>;
  /** muted = many thin background lines; the others differ by width and dash pattern. */
  variant: LineVariant;
}

export interface LinePlotProps {
  labelling: ChartLabelling;
  series: readonly LineSeries[];
  xLabel: string;
  yLabel: string;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  /** 'log' suits multiplicative quantities such as capital. Non-positive values are pinned to the axis floor. */
  yScale?: 'linear' | 'log';
  /** Horizontal reference lines (e.g. starting capital, ruin level). */
  references?: readonly ChartMarker[];
  height?: number;
}

const MARGIN = { top: 28, right: 16, bottom: 48, left: 64 };
/** Lowest decade shown on a log axis, relative to the maximum. */
const LOG_FLOOR_RATIO = 1e-6;

function xAt(series: LineSeries, i: number): number {
  return series.x ? series.x[i]! : i;
}

function extent(series: readonly LineSeries[], references: readonly ChartMarker[]) {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  let yMinPositive = Infinity;
  for (const s of series) {
    for (let i = 0; i < s.values.length; i++) {
      const xv = xAt(s, i);
      const yv = s.values[i]!;
      if (xv < xMin) xMin = xv;
      if (xv > xMax) xMax = xv;
      if (yv < yMin) yMin = yv;
      if (yv > yMax) yMax = yv;
      if (yv > 0 && yv < yMinPositive) yMinPositive = yv;
    }
  }
  for (const reference of references) {
    yMin = Math.min(yMin, reference.value);
    yMax = Math.max(yMax, reference.value);
    if (reference.value > 0) yMinPositive = Math.min(yMinPositive, reference.value);
  }
  return { xMin, xMax, yMin, yMax, yMinPositive };
}

function pathData(series: LineSeries, x: Scale, y: Scale): string {
  let d = '';
  for (let i = 0; i < series.values.length; i++) {
    d += `${i === 0 ? 'M' : 'L'}${x(xAt(series, i)).toFixed(1)} ${y(series.values[i]!).toFixed(1)}`;
  }
  return d;
}

export function LinePlot({
  labelling,
  series,
  xLabel,
  yLabel,
  formatX,
  formatY,
  yScale = 'linear',
  references = [],
  height = 300,
}: LinePlotProps) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const plotRight = width - MARGIN.right;
  const plotBottom = height - MARGIN.bottom;
  const bounds = extent(series, references);
  const xDomain: [number, number] = Number.isFinite(bounds.xMin) ? [bounds.xMin, bounds.xMax] : [0, 1];
  const x = linearScale(xDomain, [MARGIN.left, plotRight]);

  let y: Scale;
  let yTicks: number[];
  if (yScale === 'log') {
    const top = bounds.yMax > 0 ? bounds.yMax : 1;
    const floor = Math.max(Math.min(bounds.yMinPositive, top / 10), top * LOG_FLOOR_RATIO);
    y = logScale([floor, top], [plotBottom, MARGIN.top]);
    yTicks = logTicks(floor, top);
  } else {
    const low = Number.isFinite(bounds.yMin) ? Math.min(0, bounds.yMin) : 0;
    const high = Number.isFinite(bounds.yMax) && bounds.yMax > low ? bounds.yMax : low + 1;
    y = linearScale([low, high], [plotBottom, MARGIN.top]);
    yTicks = niceTicks(low, high, 5);
  }
  const xTicks = niceTicks(xDomain[0], xDomain[1], Math.max(2, Math.floor((plotRight - MARGIN.left) / 64)));

  const legendItems: LegendItem[] = [];
  for (const s of series) {
    if (!legendItems.some((item) => item.label === s.label)) legendItems.push({ label: s.label, swatch: `line-${s.variant}` });
  }
  // Muted lines first so emphasised series are drawn on top.
  const ordered = [...series].sort((a, b) => Number(b.variant === 'muted') - Number(a.variant === 'muted'));

  return (
    <div className="chart__canvas" ref={ref}>
      <svg
        className="chart__svg"
        role="img"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        focusable="false"
        {...labelling}
      >
        <g className="chart__grid" aria-hidden="true">
          {yTicks.map((tick) => (
            <line key={tick} x1={MARGIN.left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
          ))}
        </g>
        <g className="chart__references" aria-hidden="true">
          {references.map((reference) => (
            <g key={reference.label} className="chart__marker">
              <line x1={MARGIN.left} x2={plotRight} y1={y(reference.value)} y2={y(reference.value)} />
              <text x={plotRight} y={y(reference.value) - 4} textAnchor="end">
                {reference.label}
              </text>
            </g>
          ))}
        </g>
        <g className="chart__lines">
          {ordered.map((s) => (
            <path key={s.id} className="chart__line" data-variant={s.variant} d={pathData(s, x, y)} />
          ))}
        </g>
        <g className="chart__axis chart__axis--x" aria-hidden="true">
          <line x1={MARGIN.left} x2={plotRight} y1={plotBottom} y2={plotBottom} />
          {xTicks.map((tick) => (
            <g key={tick} transform={`translate(${x(tick)},${plotBottom})`}>
              <line y2={5} />
              <text y={18} textAnchor="middle">
                {formatX(tick)}
              </text>
            </g>
          ))}
          <text className="chart__axis-label" x={(MARGIN.left + plotRight) / 2} y={height - 6} textAnchor="middle">
            {xLabel}
          </text>
        </g>
        <g className="chart__axis chart__axis--y" aria-hidden="true">
          <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={plotBottom} />
          {yTicks.map((tick) => (
            <g key={tick} transform={`translate(${MARGIN.left},${y(tick)})`}>
              <line x2={-5} />
              <text x={-8} dy="0.32em" textAnchor="end">
                {formatY(tick)}
              </text>
            </g>
          ))}
          <text className="chart__axis-label" x={8} y={14}>
            {yScale === 'log' ? `${yLabel} (escala logarítmica)` : yLabel}
          </text>
        </g>
      </svg>
      {legendItems.length > 0 && <Legend items={legendItems} />}
    </div>
  );
}
