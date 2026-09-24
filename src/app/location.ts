/**
 * The only module that touches `window.location` / `history`.
 * The address bar is the single store of application state: components read
 * it through `useQueryString` and change it through `navigate`.
 */
import { useSyncExternalStore, type MouseEvent } from 'react';
import { canonicalizeQuery } from './query.ts';
import { generateSeed } from '../lib/random.ts';

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function writeUrl(search: string, mode: 'push' | 'replace'): void {
  // An empty search must still clear the query, so fall back to the pathname.
  const url = search || window.location.pathname;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

/** Rewrites the current URL into canonical form without adding a history entry. */
export function canonicalizeLocation(): void {
  const current = window.location.search;
  const canonical = canonicalizeQuery(current, generateSeed);
  if (canonical !== current) writeUrl(canonical, 'replace');
}

function onPopState(): void {
  canonicalizeLocation();
  emit();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('popstate', onPopState);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('popstate', onPopState);
  };
}

function getSnapshot(): string {
  return window.location.search;
}

/** Current canonical query string ("" or "?lab=…"). */
export function useQueryString(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => '');
}

/**
 * Navigates to `search` after canonicalizing it. Use 'push' for moving
 * between views and 'replace' for new runs inside a view, so Back leaves the
 * lab instead of stepping through every simulation.
 */
export function navigate(search: string, mode: 'push' | 'replace'): void {
  const canonical = canonicalizeQuery(search, generateSeed);
  if (canonical === window.location.search) return;
  writeUrl(canonical, mode);
  emit();
}

/** Absolute URL for a canonical query string, for sharing. */
export function absoluteUrl(search: string): string {
  return new URL(search || window.location.pathname, window.location.href).href;
}

/**
 * Client-side navigation for same-document links. Modified clicks (new tab,
 * etc.) fall through to the browser; the URL is canonicalized on load.
 */
export function followLink(event: MouseEvent<HTMLAnchorElement>, search: string): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  navigate(search, 'push');
}
