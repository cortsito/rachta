import { useEffect, useRef, useState } from 'react';

/** Width used before the first measurement (and when rendering without a DOM). */
export const DEFAULT_CHART_WIDTH = 640;

/**
 * Measures a container so charts draw in CSS pixels: text keeps its size on
 * narrow screens instead of shrinking with a scaled viewBox.
 */
export function useChartWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(DEFAULT_CHART_WIDTH);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const measured = Math.floor(element.getBoundingClientRect().width);
      if (measured > 0) setWidth(measured);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
