/**
 * Simulation boundary between the UI thread and the pure kernels.
 *
 * Kernels run in a module Web Worker so large runs never block input. Only
 * one run is active: starting a new run (or cancelling) terminates a worker
 * that is still busy, and a fresh worker is spawned on demand. If workers are
 * unavailable, the kernel runs on the main thread after a macrotask.
 */
import { simulateBayes } from '../features/bayes/model.ts';
import { simulateCompoundLoss } from '../features/compound-loss/model.ts';
import { simulateRuin } from '../features/ruin/model.ts';
import { simulateStreaks } from '../features/streaks/model.ts';
import type { LabId } from './labs.ts';

export const kernels = {
  streaks: simulateStreaks,
  bayes: simulateBayes,
  ruin: simulateRuin,
  'compound-loss': simulateCompoundLoss,
} as const satisfies Record<LabId, (input: never) => unknown>;

export type KernelInput<L extends LabId> = Parameters<(typeof kernels)[L]>[0];
export type KernelResult<L extends LabId> = ReturnType<(typeof kernels)[L]>;

export interface SimulationRequest {
  id: number;
  lab: LabId;
  input: unknown;
}

export type SimulationResponse = { id: number; ok: true; result: unknown } | { id: number; ok: false; message: string };

export function runKernel(lab: LabId, input: unknown): unknown {
  return (kernels[lab] as (input: unknown) => unknown)(input);
}

export function respond(request: SimulationRequest): SimulationResponse {
  try {
    return { id: request.id, ok: true, result: runKernel(request.lab, request.input) };
  } catch (error) {
    return { id: request.id, ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

interface ActiveJob {
  request: SimulationRequest;
  settle: (response: SimulationResponse) => void;
}

let worker: Worker | null = null;
let workersUnavailable = typeof Worker === 'undefined';
let active: ActiveJob | null = null;
let nextId = 1;

function runOnMainThread(job: ActiveJob): void {
  setTimeout(() => job.settle(respond(job.request)), 0);
}

function discardWorker(): void {
  worker?.terminate();
  worker = null;
  active = null;
}

function spawnWorker(): Worker | null {
  if (workersUnavailable) return null;
  try {
    const created = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
    created.addEventListener('message', (event: MessageEvent<SimulationResponse>) => {
      if (!active || event.data.id !== active.request.id) return;
      const job = active;
      active = null;
      job.settle(event.data);
    });
    created.addEventListener('error', (event) => {
      // The worker could not load or crashed: finish this job on the main thread.
      event.preventDefault();
      const job = active;
      workersUnavailable = true;
      discardWorker();
      if (job) runOnMainThread(job);
    });
    return created;
  } catch {
    workersUnavailable = true;
    return null;
  }
}

export interface SimulationJob<R> {
  promise: Promise<R>;
  cancel(): void;
}

export function startSimulation<L extends LabId>(lab: L, input: KernelInput<L>): SimulationJob<KernelResult<L>> {
  if (active) discardWorker();
  const request: SimulationRequest = { id: nextId++, lab, input };
  let cancelled = false;

  const promise = new Promise<KernelResult<L>>((resolve, reject) => {
    const job: ActiveJob = {
      request,
      settle(response) {
        if (cancelled) return;
        if (response.ok) resolve(response.result as KernelResult<L>);
        else reject(new Error(response.message));
      },
    };
    worker ??= spawnWorker();
    if (!worker) {
      runOnMainThread(job);
      return;
    }
    active = job;
    worker.postMessage(request);
  });

  return {
    promise,
    cancel() {
      cancelled = true;
      if (active?.request.id === request.id) discardWorker();
    },
  };
}
