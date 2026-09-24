import { useId, useState, type FormEvent, type ReactNode } from 'react';

export interface SimulationFormProps {
  /** Legend of the parameter fieldset. */
  legend: string;
  /** The lab's <RangeField>s. */
  children: ReactNode;
  /** Seed of the results currently shown. */
  seed: string;
  /** Called with valid, normalized draft values already held by the lab. */
  onSimulate: (options: { keepSeed: boolean }) => void;
}

/**
 * Parameter form with the `Simular` action. Native constraint validation
 * blocks submission while any field is invalid and focuses it.
 * By default each run draws a new seed; "keep seed" re-runs the same futures
 * with different parameters (common random numbers).
 */
export function SimulationForm({ legend, children, seed, onSimulate }: SimulationFormProps) {
  const keepSeedId = useId();
  const [keepSeed, setKeepSeed] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    onSimulate({ keepSeed });
  }

  return (
    <form className="sim-form" onSubmit={handleSubmit}>
      <fieldset className="sim-form__fieldset">
        <legend className="sim-form__legend">{legend}</legend>
        {children}
      </fieldset>
      <div className="field field--checkbox">
        <input
          className="field__checkbox"
          id={keepSeedId}
          type="checkbox"
          checked={keepSeed}
          onChange={(event) => setKeepSeed(event.currentTarget.checked)}
          aria-describedby={`${keepSeedId}-hint`}
        />
        <label className="field__label" htmlFor={keepSeedId}>
          Repetir la semilla actual (<code>{seed}</code>)
        </label>
        <p className="field__hint" id={`${keepSeedId}-hint`}>
          Sin marcar, cada simulación usa una semilla nueva. Con la misma semilla y los mismos valores, el resultado es
          idéntico.
        </p>
      </div>
      <button className="button button--primary" type="submit">
        Simular
      </button>
    </form>
  );
}
