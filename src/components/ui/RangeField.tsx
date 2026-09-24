import { useId, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
import { normalizeValue, stepDecimals, type NumberSpec } from '../../lib/params.ts';
import { formatNumber } from '../../lib/format.ts';

export interface RangeFieldProps {
  /** Parameter key; used as the input name. */
  name: string;
  label: string;
  spec: NumberSpec;
  /** Current value in model units (probabilities as fractions). */
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  /** Unit text after the number, e.g. "intentos". Percent specs get "%" automatically. */
  unit?: string;
  /** Tighter upper bound than the spec's (for cross-field rules). */
  max?: number;
}

function displayScale(spec: NumberSpec): number {
  return spec.display === 'percent' ? 100 : 1;
}

function displayDecimals(spec: NumberSpec): number {
  return Math.max(0, stepDecimals(spec.step) - (spec.display === 'percent' ? 2 : 0));
}

function toDisplay(spec: NumberSpec, value: number): number {
  return Number((value * displayScale(spec)).toFixed(displayDecimals(spec)));
}

function validationMessage(input: HTMLInputElement, min: number, max: number, step: number): string {
  const { validity } = input;
  if (validity.valid) return '';
  if (validity.badInput || validity.valueMissing) return 'Introduce un número.';
  if (validity.rangeUnderflow || validity.rangeOverflow) {
    return `Introduce un valor entre ${formatNumber(min, 6)} y ${formatNumber(max, 6)}.`;
  }
  if (validity.stepMismatch) return `Usa incrementos de ${formatNumber(step, 6)}.`;
  return 'Valor no válido.';
}

/** What the number box shows, its error, and the value it last reflected. */
export interface FieldText {
  text: string;
  error: string;
  syncedValue: number;
}

/**
 * State after the value may have changed from outside the number box (slider,
 * cross-field constraint, navigation). A new value always clears the error and
 * replaces the text, unless the text already reads as that value (the user is
 * mid-typing, e.g. "0.50"). Empty text never counts as a value.
 */
export function syncFieldText(state: FieldText, value: number, shownValue: number): FieldText {
  if (value === state.syncedValue) return state;
  const keepText = state.text.trim() !== '' && Number(state.text) === shownValue;
  return { text: keepText ? state.text : String(shownValue), error: '', syncedValue: value };
}

/**
 * A labelled numeric input with a synchronized slider.
 *
 * The number input is the accessible control (label, keyboard, validation).
 * The slider is a pointer convenience and is hidden from assistive technology
 * and the tab order to avoid announcing the same value twice.
 * Invalid text is kept visible with an error and a custom validity message,
 * so native form validation blocks submission; `onChange` only ever receives
 * valid, normalized values. The custom validity always mirrors the `error`
 * state, so clearing the error also unblocks native validation.
 */
export function RangeField({ name, label, spec, value, onChange, hint, unit, max }: RangeFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const scale = displayScale(spec);
  const upper = Math.min(spec.max, max ?? spec.max);
  const displayMin = toDisplay(spec, spec.min);
  const displayMax = toDisplay(spec, upper);
  const displayStep = Number((spec.step * scale).toFixed(displayDecimals(spec)));
  const shownValue = toDisplay(spec, value);

  const numberRef = useRef<HTMLInputElement>(null);
  const [field, setField] = useState<FieldText>({ text: String(shownValue), error: '', syncedValue: value });
  const synced = syncFieldText(field, value, shownValue);
  if (synced !== field) setField(synced);
  const { text, error } = synced;

  useLayoutEffect(() => {
    numberRef.current?.setCustomValidity(error);
  }, [error]);

  function handleNumber(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    input.setCustomValidity('');
    const message = validationMessage(input, displayMin, displayMax, displayStep);
    input.setCustomValidity(message);
    setField((current) => ({ ...current, text: input.value, error: message }));
    if (!message) onChange(normalizeValue({ ...spec, max: upper }, Number(input.value) / scale));
  }

  function handleSlider(event: ChangeEvent<HTMLInputElement>) {
    const next = normalizeValue({ ...spec, max: upper }, Number(event.currentTarget.value) / scale);
    // Reset here too: the slider may land on the value already held, which is no external change.
    setField((current) => ({ ...current, text: String(toDisplay(spec, next)), error: '' }));
    onChange(next);
  }

  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
  const unitText = spec.display === 'percent' ? '%' : unit;

  return (
    <div className="field field--range" data-invalid={error ? '' : undefined}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          className="field__range"
          type="range"
          min={displayMin}
          max={displayMax}
          step={displayStep}
          value={Math.min(displayMax, shownValue)}
          onChange={handleSlider}
          tabIndex={-1}
          aria-hidden="true"
        />
        <span className="field__number-group">
          <input
            ref={numberRef}
            className="field__number"
            id={id}
            name={name}
            type="number"
            inputMode="decimal"
            min={displayMin}
            max={displayMax}
            step={displayStep}
            value={text}
            required
            onChange={handleNumber}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
          />
          {unitText && <span className="field__unit">{unitText}</span>}
        </span>
      </div>
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
