import { Fragment, useId } from 'react';
import type { ChartLabelling } from './ChartFigure.tsx';
import { Legend, PatternDefs } from './Legend.tsx';
import { linearScale, niceStep, niceTicks, niceUpperBound } from './scale.ts';
import { useChartWidth } from './useChartWidth.ts';
import { formatInteger } from '../../lib/format.ts';

export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
  /** Drawn with a hatch pattern (not only a different colour). */
  highlighted?: boolean;
  /**
   * How many of `count` belong to the highlighted category; that part is
   * hatched from the baseline up. Overrides `highlighted`. Use it when a bin
   * can hold both categories, so the hatching stays exact.
   */
  highlightedCount?: number;
}

/** Reference line at a value, labelled on the chart. */
export interface ChartMarker {
  value: number;
  label: string;
  /** 'risk' marks a loss or ruin level. The label must still say what the line is. */
  tone?: 'risk';
}

export interface HistogramProps {
  labelling: ChartLabelling;
  bins: readonly HistogramBin[];
  xLabel: string;
  yLabel: string;
  formatX: (value: number) => string;
  formatY?: (value: number) => string;
  /** Integer data with unit-width bins: ticks sit at bar centres and show x0. */
  discrete?: boolean;
  markers?: readonly ChartMarker[];
  /** Legend entries for normal and highlighted bars. */
  legend?: { base: string; highlighted?: string };
  height?: number;
}

const MARGIN = { top: 52, right: 16, bottom: 48, left: 60 };

export function Histogram({
  labelling,
  bins,
  xLabel,
  yLabel,
  formatX,
  formatY = formatInteger,
  discrete = false,
  markers = [],
  legend,
  height = 260,
}: HistogramProps) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const patternId = useId();
  const plotRight = width - MARGIN.right;
  const plotBottom = height - MARGIN.bottom;

  const first = bins[0];
  const last = bins[bins.length - 1];
  const xMin = first?.x0 ?? 0;
  const xMax = last?.x1 ?? 1;
  const maxCount = bins.reduce((max, bin) => Math.max(max, bin.count), 0);
  const yMax = niceUpperBound(maxCount, 4);
  const x = linearScale([xMin, xMax], [MARGIN.left, plotRight]);
  const y = linearScale([0, yMax], [plotBottom, MARGIN.top]);
  const maxTicks = Math.max(2, Math.floor((plotRight - MARGIN.left) / 56));

  const xTicks = discrete
    ? (() => {
        const step = Math.max(1, niceStep(xMax - xMin, maxTicks));
        const ticks: { position: number; label: string }[] = [];
        for (let v = Math.ceil(xMin / step) * step; v < xMax; v += step) {
          ticks.push({ position: x(v + 0.5), label: formatX(v) });
        }
        return ticks;
      })()
    : niceTicks(xMin, xMax, maxTicks).map((v) => ({ position: x(v), label: formatX(v) }));
  const yTicks = niceTicks(0, yMax, 4);

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
        <PatternDefs id={patternId} />
        <g className="chart__grid" aria-hidden="true">
          {yTicks.map((tick) => (
            <line key={tick} x1={MARGIN.left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
          ))}
        </g>
        <g className="chart__bars">
          {bins.map((bin, i) => {
            const left = x(bin.x0);
            const full = Math.max(0, x(bin.x1) - left);
            const gap = full > 4 ? 1 : 0;
            const hatched = Math.min(bin.count, bin.highlightedCount ?? (bin.highlighted ? bin.count : 0));
            const whole = hatched > 0 && hatched === bin.count;
            const bar = { x: left + gap / 2, width: Math.max(1, full - gap) };
            return (
              <Fragment key={i}>
                <rect
                  className="chart__bar"
                  data-highlighted={whole ? '' : undefined}
                  fill={whole ? `url(#${patternId})` : undefined}
                  {...bar}
                  y={y(bin.count)}
                  height={Math.max(0, plotBottom - y(bin.count))}
                />
                {hatched > 0 && !whole && (
                  <rect
                    className="chart__bar"
                    data-highlighted=""
                    fill={`url(#${patternId})`}
                    {...bar}
                    y={y(hatched)}
                    height={Math.max(0, plotBottom - y(hatched))}
                  />
                )}
              </Fragment>
            );
          })}
        </g>
        <g className="chart__axis chart__axis--x" aria-hidden="true">
          <line className="chart__domain" x1={MARGIN.left} x2={plotRight} y1={plotBottom} y2={plotBottom} />
          {xTicks.map((tick) => (
            <g key={tick.position} transform={`translate(${tick.position},${plotBottom})`}>
              <line className="chart__tick" y2={5} />
              <text y={18} textAnchor="middle">
                {tick.label}
              </text>
            </g>
          ))}
          <text className="chart__axis-label" x={(MARGIN.left + plotRight) / 2} y={height - 6} textAnchor="middle">
            {xLabel}
          </text>
        </g>
        <g className="chart__axis chart__axis--y" aria-hidden="true">
          <line className="chart__domain" x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={plotBottom} />
          {yTicks.map((tick) => (
            <g key={tick} transform={`translate(${MARGIN.left},${y(tick)})`}>
              <line className="chart__tick" x2={-5} />
              <text x={-8} dy="0.32em" textAnchor="end">
                {formatY(tick)}
              </text>
            </g>
          ))}
          <text className="chart__axis-label" x={8} y={14}>
            {yLabel}
          </text>
        </g>
        <g className="chart__markers" aria-hidden="true">
          {markers.map((marker, i) => {
            const position = Math.min(plotRight, Math.max(MARGIN.left, x(marker.value)));
            const anchor = position > plotRight - 60 ? 'end' : position < MARGIN.left + 60 ? 'start' : 'middle';
            const labelY = MARGIN.top - 8 - (i % 2) * 14;
            return (
              <g key={marker.label} className="chart__marker" data-tone={marker.tone}>
                <line x1={position} x2={position} y1={labelY + 4} y2={plotBottom} />
                <text x={position} y={labelY} textAnchor={anchor}>
                  {marker.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      {legend && (
        <Legend
          patternId={patternId}
          items={[
            { label: legend.base, swatch: 'bar' },
            ...(legend.highlighted ? [{ label: legend.highlighted, swatch: 'bar-highlighted' as const }] : []),
          ]}
        />
      )}
    </div>
  );
}
