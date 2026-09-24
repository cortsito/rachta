import { useEffect, useState } from 'react';
import type { LabId } from './labs.ts';
import { startSimulation, type KernelInput, type KernelResult } from './simulation.ts';

export interface SimulationState<R> {
  /** True while the current input has no result yet. */
  running: boolean;
  /** Result for the current input, or the previous one while running (see `stale`). */
  result: R | null;
  /** The shown result belongs to an earlier input. */
  stale: boolean;
  error: string | null;
}

interface Settled<R> {
  /** Input key of the last finished run (successful or not). */
  key: string;
  /** Input key that produced `result`. */
  resultKey: string;
  result: R | null;
  error: string | null;
}

/**
 * Runs `lab`'s kernel whenever `input` changes (compared by value).
 * Inputs are small plain objects, so JSON is a sufficient identity.
 */
export function useSimulation<L extends LabId>(lab: L, input: KernelInput<L>): SimulationState<KernelResult<L>> {
  const key = `${lab}:${JSON.stringify(input)}`;
  const [settled, setSettled] = useState<Settled<KernelResult<L>>>({
    key: '',
    resultKey: '',
    result: null,
    error: null,
  });

  useEffect(() => {
    const job = startSimulation(lab, input);
    job.promise.then(
      (result) => setSettled({ key, resultKey: key, result, error: null }),
      (error: unknown) =>
        setSettled((previous) => ({
          ...previous,
          key,
          error: error instanceof Error ? error.message : String(error),
        })),
    );
    return job.cancel;
    // `key` captures every field of `input`, so `input` is intentionally not a dependency.
  }, [key]);

  const running = settled.key !== key;
  return {
    running,
    result: settled.result,
    stale: settled.result !== null && settled.resultKey !== key,
    error: running ? null : settled.error,
  };
}
