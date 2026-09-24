import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { clippedSeries, LinePlot, lineYDomain } from '../../components/charts/LinePlot.tsx';
import { logScale } from '../../components/charts/scale.ts';
import { ruinChart } from './chart.ts';
import { simulateRuin } from './model.ts';

// LinePlot's default height (300) minus its top (28) and bottom (48) margins.
const PLOT_RANGE: [number, number] = [252, 28];

describe('ruin chart domain', () => {
  // One sample path explodes to ~9·10¹⁸ while P90 ends near 2·10¹⁵.
  const result = simulateRuin({
    capital: 1000,
    p: 0.6,
    gain: 1,
    loss: 1,
    fraction: 0.2,
    rounds: 1000,
    futures: 2000,
    seed: 'abc',
  });
  const { series, references } = ruinChart(result);
  const domain = lineYDomain(series, references, 'log');
  const y = logScale(domain, PLOT_RANGE);
  const [p10, p50, p90] = result.bands.map((band) => band.values);
  const inDomain = (v: number) => v >= domain[0] && v <= domain[1];

  it('keeps the initial capital and the ruin level at distinct visible positions', () => {
    expect(inDomain(1000)).toBe(true);
    expect(inDomain(result.ruinLevel)).toBe(true);
    expect(result.ruinLevel).toBe(50);
    expect(y(result.ruinLevel) - y(1000)).toBeGreaterThan(10);
  });

  it('does not let an unrelated extreme sample path flatten the percentile bands', () => {
    const maxSample = Math.max(...result.samplePaths.map((path) => Math.max(...path)));
    expect(maxSample).toBeGreaterThan(domain[1]);
    for (const band of [p10!, p50!, p90!]) expect(band.every(inDomain)).toBe(true);
    // Final P10 < P50 < P90 stay visibly apart, and the median moves away from its start.
    const last = p50!.length - 1;
    expect(y(p10![last]!) - y(p50![last]!)).toBeGreaterThan(5);
    expect(y(p50![last]!) - y(p90![last]!)).toBeGreaterThan(5);
    expect(y(p50![0]!) - y(p50![last]!)).toBeGreaterThan(20);
  });

  it('discloses the sample paths that are clipped by the domain', () => {
    const clipped = clippedSeries(series, domain, 'log');
    expect(clipped).toHaveLength(1);
    expect(clipped[0]).toMatchObject({ label: 'Futuros de muestra', total: 20 });
    expect(clipped[0]!.clipped).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(LinePlot, {
        labelling: { 'aria-labelledby': 't', 'aria-describedby': 'd' },
        series,
        references,
        xLabel: 'Ronda',
        yLabel: 'Capital',
        formatX: String,
        formatY: String,
        yScale: 'log',
      }),
    );
    const noteId = /class="chart__note" id="([^"]+)"/.exec(html)?.[1];
    expect(noteId).toBeTruthy();
    expect(html).toContain(`aria-describedby="d ${noteId}"`);
    expect(html).toContain(`${clipped[0]!.clipped} de 20 líneas de «Futuros de muestra» salen del rango vertical`);
    expect(html).toMatch(/class="chart__lines" clip-path="url\(#/);
  });
});
