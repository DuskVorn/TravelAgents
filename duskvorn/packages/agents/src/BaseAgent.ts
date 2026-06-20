import { AgentOutput, TravelResult } from "@duskvorn/core";

const LIVE_CALL_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

/**
 * Runs an agent's live provider call if a provider key is configured, racing it
 * against a timeout. On missing key, error, or timeout, falls back to the
 * agent's deterministic mock generator so the API always returns usable
 * results — never a hard failure just because a third-party key is absent.
 */
export async function runWithFallback<T extends TravelResult>(
  agentName: string,
  hasLiveProvider: boolean,
  liveCall: () => Promise<T[]>,
  mockCall: () => T[]
): Promise<AgentOutput<T>> {
  const start = Date.now();

  if (!hasLiveProvider) {
    return {
      agent: agentName,
      tookMs: Date.now() - start,
      results: mockCall(),
      warning: `${agentName}: no provider key configured — using deterministic mock data`,
    };
  }

  try {
    const results = await withTimeout(liveCall(), LIVE_CALL_TIMEOUT_MS);
    return { agent: agentName, tookMs: Date.now() - start, results };
  } catch (err) {
    return {
      agent: agentName,
      tookMs: Date.now() - start,
      results: mockCall(),
      warning: `${agentName}: live provider failed (${(err as Error).message}) — fell back to mock data`,
    };
  }
}
