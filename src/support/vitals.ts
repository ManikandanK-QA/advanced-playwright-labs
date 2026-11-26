/**
 * Browser-side performance collection.
 *
 * The two exported functions are injected with `page.addInitScript` and
 * `page.evaluate`, which means Playwright serialises their source and runs it in
 * the page. They therefore must stay self-contained: no imports, no closures
 * over module state, no helper calls.
 */

export interface ResourceSummary {
  name: string;
  initiatorType: string;
  durationMs: number;
  transferSize: number;
}

export interface Vitals {
  lcpMs: number | null;
  lcpElement: string | null;
  cls: number;
  longTasks: number;
  ttfbMs: number;
  domContentLoadedMs: number;
  loadMs: number;
  resources: ResourceSummary[];
}

interface VitalsStore {
  lcpMs: number | null;
  lcpElement: string | null;
  cls: number;
  longTasks: number;
}

type VitalsWindow = Window & { __vitals?: VitalsStore };

/**
 * Installs the observers before any page script runs.
 */
export function installVitalsObserver(): void {
  const scope = window as VitalsWindow;
  const store: VitalsStore = { lcpMs: null, lcpElement: null, cls: 0, longTasks: 0 };
  scope.__vitals = store;

  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    if (entries.length === 0) return;
    const last = entries[entries.length - 1] as PerformanceEntry & {
      element?: Element | null;
    };
    store.lcpMs = last.startTime;
    store.lcpElement = last.element ? last.element.tagName.toLowerCase() : null;
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  new PerformanceObserver((list) => {
    const entries = list.getEntries() as Array<
      PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      }
    >;
    for (const entry of entries) {
      if (!entry.hadRecentInput) store.cls += entry.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });

  new PerformanceObserver((list) => {
    store.longTasks += list.getEntries().length;
  }).observe({ type: 'longtask', buffered: true });
}

/**
 * Reads the collected values once the page reports that it has settled.
 */
export function readVitals(): Vitals {
  const scope = window as VitalsWindow;
  const store: VitalsStore = scope.__vitals ?? {
    lcpMs: null,
    lcpElement: null,
    cls: 0,
    longTasks: 0,
  };

  const navigation = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;

  const resources: ResourceSummary[] = [];
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  for (const entry of entries) {
    resources.push({
      name: entry.name,
      initiatorType: entry.initiatorType,
      durationMs: entry.duration,
      transferSize: entry.transferSize,
    });
  }

  return {
    lcpMs: store.lcpMs,
    lcpElement: store.lcpElement,
    cls: store.cls,
    longTasks: store.longTasks,
    ttfbMs: navigation ? navigation.responseStart - navigation.requestStart : 0,
    domContentLoadedMs: navigation ? navigation.domContentLoadedEventEnd : 0,
    loadMs: navigation ? navigation.loadEventEnd : 0,
    resources,
  };
}
