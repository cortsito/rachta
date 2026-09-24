import { respond, type SimulationRequest, type SimulationResponse } from './simulation.ts';

// The app tsconfig uses DOM types; describe the worker scope we rely on.
const scope = globalThis as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<SimulationRequest>) => void): void;
  postMessage(message: SimulationResponse): void;
};

scope.addEventListener('message', (event) => {
  scope.postMessage(respond(event.data));
});
