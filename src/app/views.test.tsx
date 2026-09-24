import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App, navCurrent, viewTitle } from './App.tsx';
import { labGuides } from './guides.ts';
import { LAB_IDS, labInfo } from './labs.ts';
import { MethodPage, methodSectionId } from './MethodPage.tsx';
import { resolveQuery } from './query.ts';
import { UsesPage } from './UsesPage.tsx';

const state = (search: string) => resolveQuery(search, () => 'seed01');

describe('navigation state', () => {
  it('marks the current view, and Explorar while a lab is open', () => {
    expect(navCurrent(state(''), null)).toBe('page');
    expect(navCurrent(state(''), 'method')).toBeUndefined();
    expect(navCurrent(state('?page=method'), 'method')).toBe('page');
    expect(navCurrent(state('?page=method'), null)).toBeUndefined();
    expect(navCurrent(state('?page=uses'), 'uses')).toBe('page');
    expect(navCurrent(state('?lab=bayes'), null)).toBe('true');
    expect(navCurrent(state('?lab=bayes'), 'method')).toBeUndefined();
  });

  it('gives every view its own document title', () => {
    expect(viewTitle(state(''))).toBe('Rachta — laboratorio de aleatoriedad');
    expect(viewTitle(state('?page=method'))).toBe('Método — Rachta');
    expect(viewTitle(state('?page=uses'))).toBe('Usos — Rachta');
    expect(viewTitle(state('?lab=ruin'))).toBe(`${labInfo.ruin.title} — Rachta`);
  });
});

describe('app shell', () => {
  it('renders the landing view with the primary navigation and a factual footer', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('id="view-title"');
    expect(html).toMatch(/href="\.\/" aria-current="page">Explorar</);
    expect(html).toContain('href="?page=method"');
    expect(html).toContain('href="?page=uses"');
    for (const lab of LAB_IDS) expect(html).toContain(`href="?lab=${lab}"`);
    expect(html).toContain('Hecho por Luis Cortés');
    expect(html).toContain('no usa cookies ni analítica de terceros');
    expect(html).toContain('No ofrece recomendaciones financieras, médicas ni de apuestas.');
    expect(html).toContain('href="https://ko-fi.com/corshex"');
    expect(html).toContain('Invítame un café');
  });
});

describe('Método', () => {
  const html = renderToStaticMarkup(<MethodPage />);

  it('documents every lab with the same six parts and a linkable heading', () => {
    for (const lab of LAB_IDS) {
      expect(html).toContain(`id="${methodSectionId(lab)}" tabindex="-1"`);
      expect(html).toContain(`href="#${methodSectionId(lab)}"`);
    }
    for (const part of ['Pregunta', 'Modelo', 'Fórmula o procedimiento', 'Qué se calcula exactamente', 'Supuestos', 'Límites']) {
      expect(html.split(`class="method__part-title">${part}<`)).toHaveLength(LAB_IDS.length + 1);
    }
  });

  it('keeps exact and estimated results apart for every lab', () => {
    for (const lab of LAB_IDS) {
      const { method } = labGuides[lab];
      expect(method.exact.length).toBeGreaterThan(0);
      expect(method.estimated.length).toBeGreaterThan(0);
      expect(method.limits.length).toBeGreaterThan(0);
    }
    expect(html.match(/data-provenance="exact"/g)?.length).toBeGreaterThanOrEqual(LAB_IDS.length);
    expect(html.match(/data-provenance="estimated"/g)?.length).toBeGreaterThanOrEqual(LAB_IDS.length);
  });
});

describe('Usos', () => {
  it('links each pattern back to its lab and states its limit', () => {
    const html = renderToStaticMarkup(<UsesPage />);
    for (const lab of LAB_IDS) {
      expect(html).toContain(`href="?lab=${lab}"`);
      expect(html).toContain(labGuides[lab].use.limit);
    }
    expect(html).toContain('role="note"');
  });
});
