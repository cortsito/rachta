import { useId } from 'react';
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
  /**
   * Whether this series sets the y domain (default true). Use false for
   * context lines, such as sample paths, that must not squeeze the main
   * series: they are clipped at the plot edges and the clipping is disclosed.
   */
  fitDomain?: boolean;
}

export interface LinePlotProps {
  labelling: ChartLabelling;
  series: readonly LineSeries[];
  xLabel: string;
  yLabel: string;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  /**
   * 'log' suits multiplicative quantities such as capital. The domain covers
   * every finite value of the fitting series and every reference, spanning at
   * least one decade. Non-positive values have no logarithm and are pinned to
   * the axis floor.
   */
  yScale?: 'linear' | 'log';
  /** Horizontal reference lines (e.g. starting capital, ruin level). */
  references?: readonly ChartMarker[];
  height?: number;
}

const MARGIN = { top: 28, right: 16, bottom: 48, left: 64 };

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
    const fits = s.fitDomain !== false;
    for (let i = 0; i < s.values.length; i++) {
      const xv = xAt(s, i);
      const yv = s.values[i]!;
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
      if (xv < xMin) xMin = xv;
      if (xv > xMax) xMax = xv;
      if (!fits) continue;
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

/** y domain of the plot, from fitting series and references only. */
export function lineYDomain(
  series: readonly LineSeries[],
  references: readonly ChartMarker[],
  yScale: 'linear' | 'log',
): [number, number] {
  const bounds = extent(series, references);
  if (yScale === 'log') {
    const top = bounds.yMax > 0 ? bounds.yMax : 1;
    return [Math.min(bounds.yMinPositive, top / 10), top];
  }
  const low = Number.isFinite(bounds.yMin) ? Math.min(0, bounds.yMin) : 0;
  const high = Number.isFinite(bounds.yMax) && bounds.yMax > low ? bounds.yMax : low + 1;
  return [low, high];
}

export interface ClippedSeries {
  label: string;
  /** Series with this label that leave the y domain somewhere. */
  clipped: number;
  total: number;
}

/** Non-fitting series, grouped by label, that have finite values outside the y domain. */
export function clippedSeries(
  series: readonly LineSeries[],
  [low, high]: readonly [number, number],
  yScale: 'linear' | 'log',
): ClippedSeries[] {
  const groups: ClippedSeries[] = [];
  for (const s of series) {
    if (s.fitDomain !== false) continue;
    let group = groups.find((g) => g.label === s.label);
    if (!group) groups.push((group = { label: s.label, clipped: 0, total: 0 }));
    group.total++;
    for (let i = 0; i < s.values.length; i++) {
      const v = s.values[i]!;
      // On a log axis, non-positive values are pinned to the floor, not clipped.
      const below = yScale === 'log' ? v > 0 && v < low : v < low;
      if (Number.isFinite(v) && (below || v > high)) {
        group.clipped++;
        break;
      }
    }
  }
  return groups.filter((g) => g.clipped > 0);
}

/** SVG path data; non-finite points are skipped and break the line. */
function pathData(series: LineSeries, x: Scale, y: Scale): string {
  let d = '';
  let pen = 'M';
  for (let i = 0; i < series.values.length; i++) {
    const xv = xAt(series, i);
    const yv = series.values[i]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
      pen = 'M';
      continue;
    }
    d += `${pen}${x(xv).toFixed(1)} ${y(yv).toFixed(1)}`;
    pen = 'L';
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
  const id = useId();
  const clipId = `${id}-clip`;
  const noteId = `${id}-note`;
  const plotRight = width - MARGIN.right;
  const plotBottom = height - MARGIN.bottom;
  const bounds = extent(series, references);
  const xDomain: [number, number] = Number.isFinite(bounds.xMin) ? [bounds.xMin, bounds.xMax] : [0, 1];
  const x = linearScale(xDomain, [MARGIN.left, plotRight]);

  const yDomain = lineYDomain(series, references, yScale);
  const y = (yScale === 'log' ? logScale : linearScale)(yDomain, [plotBottom, MARGIN.top]);
  const yTicks = yScale === 'log' ? logTicks(...yDomain) : niceTicks(...yDomain, 5);
  const clipped = clippedSeries(series, yDomain, yScale);
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
        aria-describedby={clipped.length > 0 ? `${labelling['aria-describedby']} ${noteId}` : labelling['aria-describedby']}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={MARGIN.left} y={MARGIN.top} width={Math.max(0, plotRight - MARGIN.left)} height={plotBottom - MARGIN.top} />
          </clipPath>
        </defs>
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
        <g className="chart__lines" clipPath={`url(#${clipId})`}>
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
      {clipped.length > 0 && (
        <p className="chart__note" id={noteId}>
          {clipped
            .map(
              ({ label, clipped: count, total }) =>
                `${count} de ${total} líneas de «${label}» salen del rango vertical y se ven recortadas en el borde del gráfico.`,
            )
            .join(' ')}
        </p>
      )}
      {legendItems.length > 0 && <Legend items={legendItems} />}
    </div>
  );
}
