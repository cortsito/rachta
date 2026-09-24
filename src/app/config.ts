/**
 * Build-time configuration. Everything here is optional and absent by default.
 *
 * VITE_SUPPORT_URL: an https:// address for an optional "Invítame un café"
 * link in the footer. When it is missing or invalid, no link is rendered.
 */

/** Accepts only an absolute https:// URL; anything else means "not configured". */
export function parseSupportUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export const SUPPORT_URL = parseSupportUrl(import.meta.env.VITE_SUPPORT_URL);
