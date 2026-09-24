import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MetricList } from '../ui/MetricList.tsx';
import { ChartFigure } from './ChartFigure.tsx';
import { Histogram } from './Histogram.tsx';
import { LinePlot, lineYDomain } from './LinePlot.tsx';
import { linearScale, logScale, logTicks, niceTicks, niceUpperBound } from './scale.ts';

describe('scales and ticks', () => {
  it('maps domains to ranges', () => {
    const x = linearScale([0, 10], [100, 200]);
    expect(x(0)).toBe(100);
    expect(x(5)).toBe(150);
    expect(linearScale([3, 3], [0, 10])(3)).toBe(5);
    const y = logScale([1, 1000], [300, 0]);
    expect(y(10)).toBeCloseTo(200, 10);
    expect(y(0)).toBe(300); // pinned to the floor
    expect(y(0.1)).toBeCloseTo(400, 10); // positive values are not clamped (they are clipped by the plot)
  });

  it('produces round ticks without float noise', () => {
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(niceTicks(0.1, 0.35, 5)).toEqual([0.1, 0.15, 0.2, 0.25, 0.3, 0.35]);
    expect(niceUpperBound(873, 4)).toBe(1000);
    expect(niceUpperBound(0)).toBe(1);
    expect(logTicks(0.5, 20000)).toEqual([1, 10, 100, 1000, 10000]);
    expect(logTicks(3, 40)).toEqual([5, 10, 20]);
    // Wide domains keep a legible number of ticks.
    expect(logTicks(1, 1e17)).toEqual([1, 1e3, 1e6, 1e9, 1e12, 1e15]);
    expect(logTicks(50, 1e300).length).toBeLessThanOrEqual(8);
  });
});

describe('accessible chart markup', () => {
  it('labels the SVG with the visible figure caption and offers a data table', () => {
    const html = renderToStaticMarkup(
      <ChartFigure
        title="Distribución"
        description="Tres barras."
        table={{ caption: 'Datos', columns: ['Valor', 'Futuros'], rows: [['0', '3']] }}
      >
        {(labelling) => (
          <Histogram
            labelling={labelling}
            discrete
            bins={[
              { x0: 0, x1: 1, count: 3 },
              { x0: 1, x1: 2, count: 5 },
              { x0: 2, x1: 3, count: 1, highlighted: true },
            ]}
            xLabel="Racha"
            yLabel="Futuros"
            formatX={String}
            markers={[{ value: 1.5, label: 'Mediana: 1' }]}
            legend={{ base: 'Menos de 2', highlighted: '2 o más' }}
          />
        )}
      </ChartFigure>,
    );
    const titleId = /class="chart__title" id="([^"]+)"/.exec(html)?.[1];
    const descriptionId = /class="chart__description" id="([^"]+)"/.exec(html)?.[1];
    expect(titleId).toBeTruthy();
    expect(html).toContain(`role="img"`);
    expect(html).toContain(`aria-labelledby="${titleId}"`);
    expect(html).toContain(`aria-describedby="${descriptionId}"`);
    expect(html.match(/class="chart__bar"/g)).toHaveLength(3 + 2); // bars + two legend swatches
    expect(html).toMatch(/data-highlighted="" fill="url\(#/);
    expect(html).toContain('Mediana: 1');
    expect(html).toContain('<caption>Datos</caption>');
    expect(html).toContain('<th scope="row">0</th>');
  });

  it('hatches only the highlighted part of a mixed bin, from the baseline', () => {
    const html = renderToStaticMarkup(
      <Histogram
        labelling={{ 'aria-labelledby': 't', 'aria-describedby': 'd' }}
        bins={[
          { x0: 0, x1: 5, count: 4, highlightedCount: 0 },
          { x0: 5, x1: 10, count: 4, highlightedCount: 1 },
          { x0: 10, x1: 15, count: 4, highlightedCount: 4 },
        ]}
        xLabel="Pérdida"
        yLabel="Periodos"
        formatX={String}
      />,
    );
    const rects = [...html.matchAll(/<rect class="chart__bar"([^>]*)>/g)].map((m) => m[1]!);
    expect(rects).toHaveLength(4); // plain, plain + partial hatch, fully hatched
    const hatched = rects.filter((r) => r.includes('data-highlighted'));
    expect(hatched).toHaveLength(2);
    const height = (r: string) => Number(/height="([^"]+)"/.exec(r)?.[1]);
    // The partial hatch is a quarter of its bar; the whole-bin hatch is the full bar.
    expect(height(hatched[0]!) * 4).toBeCloseTo(height(rects[1]!), 6);
    expect(height(hatched[1]!)).toBeCloseTo(height(rects[1]!), 6);
  });

  it('draws line series with a legend entry per label', () => {
    const html = renderToStaticMarkup(
      <LinePlot
        labelling={{ 'aria-labelledby': 't', 'aria-describedby': 'd' }}
        series={[
          { id: 'a', label: 'Futuro de muestra', values: [100, 50, 25], variant: 'muted' },
          { id: 'b', label: 'Futuro de muestra', values: [100, 150, 0], variant: 'muted' },
          { id: 'm', label: 'Mediana', values: [100, 90, 80], variant: 'primary' },
        ]}
        xLabel="Ronda"
        yLabel="Capital"
        formatX={String}
        formatY={String}
        yScale="log"
        references={[{ value: 5, label: 'Ruina' }]}
      />,
    );
    expect(html.match(/<path /g)).toHaveLength(3);
    expect(html.match(/class="chart__legend-item"/g)).toHaveLength(2);
    expect(html).toContain('Capital (escala logarítmica)');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('chart__note');
  });

  it('skips non-finite values instead of writing them into path data or the domain', () => {
    const html = renderToStaticMarkup(
      <LinePlot
        labelling={{ 'aria-labelledby': 't', 'aria-describedby': 'd' }}
        series={[
          { id: 'a', label: 'A', values: [100, Infinity, 50, Number.NaN, 25], variant: 'primary' },
          { id: 'b', label: 'B', values: [Number.NaN, 10], x: [0, 4], variant: 'muted' },
        ]}
        xLabel="Ronda"
        yLabel="Capital"
        formatX={String}
        formatY={String}
        yScale="log"
      />,
    );
    expect(html).not.toMatch(/NaN|Infinity/);
    const d = /data-variant="primary" d="([^"]+)"/.exec(html)?.[1];
    expect(d?.match(/M/g)).toHaveLength(3); // the line breaks at each gap
    expect(lineYDomain([{ id: 'a', label: 'A', values: [Infinity, 5, 500], variant: 'primary' }], [], 'log')).toEqual([5, 500]);
  });
});

describe('MetricList', () => {
  it('always renders the provenance of each number', () => {
    const html = renderToStaticMarkup(
      <MetricList
        metrics={[
          { id: 'a', label: 'Exacta', value: '8,4 %', provenance: { kind: 'exact' } },
          { id: 'b', label: 'Estimada', value: '8,5 %', provenance: { kind: 'estimated', samples: 10000 } },
          { id: 'c', label: 'Muestra', value: '6', provenance: { kind: 'sample', description: 'Un solo futuro' } },
        ]}
      />,
    );
    expect(html).toContain('>Exacto<');
    expect(html.replace(/ /g, ' ')).toContain('Estimado con 10.000 simulaciones');
    expect(html).toContain('Un solo futuro');
    expect(html).toContain('data-kind="estimated"');
  });
});
