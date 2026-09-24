import { useId, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copies the scenario URL. When the Clipboard API is unavailable or denied,
 * the URL is shown in a read-only field for manual copying.
 */
export function ShareLink({ url }: { url: string }) {
  const id = useId();
  const [state, setState] = useState<{ url: string; copy: CopyState }>({ url, copy: 'idle' });
  // A new scenario resets the message.
  const copy = state.url === url ? state.copy : 'idle';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setState({ url, copy: 'copied' });
    } catch {
      setState({ url, copy: 'failed' });
    }
  }

  return (
    <div className="share">
      <p className="share__hint">
        El enlace guarda el laboratorio, los valores y la semilla: quien lo abra verá exactamente estos resultados.
      </p>
      <button className="button" type="button" onClick={handleCopy}>
        Copiar enlace
      </button>
      <p className="share__status" role="status">
        {copy === 'copied' && 'Enlace copiado.'}
        {copy === 'failed' && 'No se pudo copiar automáticamente. Selecciona y copia el enlace:'}
      </p>
      {copy === 'failed' && (
        <div className="field">
          <label className="field__label" htmlFor={id}>
            Enlace del escenario
          </label>
          <input
            className="field__text"
            id={id}
            type="url"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
