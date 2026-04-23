/**
 * Background generation registry.
 *
 * Holds in-flight builder generation promises in a module-level Map so that
 * navigating away from the builder screen (and back) does NOT cancel the
 * generation or reset the UI to step 0.
 *
 * Lifecycle:
 *  - startGeneration(key, runner) registers and returns a promise. If a
 *    generation for that key is already running, the existing promise is
 *    returned instead (single-flight).
 *  - getGeneration(key) returns the active promise, if any. Builders call
 *    this on mount; if present, they show the "Generating" step and await it.
 *  - The promise auto-clears from the registry when it settles.
 *
 * Keys are scoped per (authorId, nodeId) so concurrent builders don't clash.
 */

export type GenerationResult<T = unknown> = T;

const inFlight = new Map<string, Promise<unknown>>();

function makeKey(authorId: string, nodeId: string): string {
  return `${authorId}::${nodeId}`;
}

export function getGeneration<T = unknown>(
  authorId: string,
  nodeId: string,
): Promise<T> | null {
  return (inFlight.get(makeKey(authorId, nodeId)) as Promise<T>) ?? null;
}

export function isGenerating(authorId: string, nodeId: string): boolean {
  return inFlight.has(makeKey(authorId, nodeId));
}

export function startGeneration<T = unknown>(
  authorId: string,
  nodeId: string,
  runner: () => Promise<T>,
): Promise<T> {
  const key = makeKey(authorId, nodeId);
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = (async () => {
    try {
      return await runner();
    } finally {
      // Clear regardless of success/failure so the next attempt can start fresh.
      if (inFlight.get(key) === p) inFlight.delete(key);
    }
  })();
  inFlight.set(key, p as Promise<unknown>);
  return p;
}
