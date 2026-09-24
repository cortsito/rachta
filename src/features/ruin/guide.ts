/**
 * Método and Usos content for the hypothetical ruin lab. Formulas and steps
 * describe model.ts (ruinExact, simulateRuin) and params.ts (maxSafeRounds).
 */
import type { LabGuide } from '../../app/labs.ts';
import { formatInteger, formatPercent } from '../../lib/format.ts';
import { MAX_CHECKPOINT_INTERVALS, RUIN_FRACTION, SAMPLE_PATH_COUNT } from './model.ts';

const ruinLevel = formatPercent(RUIN_FRACTION);

export const ruinGuide: LabGuide = {
  method: {
    question:
      'Si tienes una pequeña ventaja por ronda y expones cada vez una parte de tu capital, ¿basta esa ventaja para ' +
      'sobrevivir a una mala secuencia? La intuición se fija en la ventaja media y olvida que las pérdidas se multiplican.',
    model:
      'Un capital hipotético C se juega ronda a ronda. Cada ronda se expone una fracción f del capital actual: con ' +
      'probabilidad p la parte expuesta gana una fracción g; si no, pierde una fracción l. Un futuro se arruina la ' +
      `primera vez que el capital cae por debajo del ${ruinLevel} del inicial.`,
    variables: [
      { term: 'C', meaning: 'Capital, en unidades hipotéticas.' },
      { term: 'p', meaning: 'Probabilidad de una ronda favorable.' },
      { term: 'g, l', meaning: 'Ganancia y pérdida relativas de la parte expuesta.' },
      { term: 'f', meaning: 'Fracción del capital actual expuesta cada ronda.' },
      { term: 'n, N', meaning: 'Rondas por futuro y futuros simulados.' },
    ],
    formulas: [
      'Ronda favorable (probabilidad p): C → C·(1 + f·g)',
      'Ronda desfavorable (probabilidad 1 − p): C → C·(1 − f·l)',
      'Ventaja por ronda = p·(1 + f·g) + (1 − p)·(1 − f·l) − 1 = f·(p·g − (1 − p)·l)',
      'Crecimiento típico por ronda = exp(p·ln(1 + f·g) + (1 − p)·ln(1 − f·l)) − 1',
      'Caída máxima de un futuro = mayor valor de (pico − capital) / pico a lo largo del camino',
    ],
    procedure: [
      'La semilla inicializa el generador pseudoaleatorio.',
      'En cada uno de los N futuros, cada ronda es favorable si un número uniforme en [0, 1) es menor que p, y el capital ' +
        'se multiplica por el factor correspondiente.',
      `Un futuro que cae por debajo del ${ruinLevel} del capital inicial queda arruinado: deja de jugar y conserva ese valor.`,
      `Se registran la ruina, la caída máxima y el capital en hasta ${formatInteger(MAX_CHECKPOINT_INTERVALS + 1)} puntos de ` +
        'control. En cada punto se calculan los percentiles 10, 50 y 90 del capital de todos los futuros.',
      `Los primeros ${formatInteger(SAMPLE_PATH_COUNT)} futuros se dibujan completos como futuros de muestra.`,
      'Con valores extremos, las rondas se limitan para que ningún camino supere 10³⁰⁰ unidades y todos los cálculos ' +
        'sigan siendo finitos. El formulario muestra ese máximo.',
    ],
    exact: [
      'La ventaja por ronda (la media aritmética del factor, menos 1).',
      'El crecimiento típico por ronda (la media geométrica del factor, menos 1). No tiene en cuenta la ruina, y es ' +
        '−100 % cuando una sola pérdida puede agotar el capital.',
    ],
    estimated: [
      'La probabilidad de ruina, con su intervalo de confianza del 95 %.',
      'La caída máxima típica y el capital final típico (medianas).',
      'Los percentiles 10, 50 y 90 del capital en cada punto de control: son bandas punto a punto, no trayectorias.',
    ],
    sample: [`Los ${formatInteger(SAMPLE_PATH_COUNT)} futuros de muestra del gráfico.`],
    assumptions: [
      'Cada ronda expone una fracción fija del capital actual (no del capital inicial).',
      'Las rondas son independientes entre sí, con la misma probabilidad de éxito.',
      `La ruina es absorbente: cuando el capital cae por debajo del ${ruinLevel} del capital inicial, ese futuro deja de ` +
        'jugar y mantiene ese valor.',
      'Es un modelo educativo con unidades hipotéticas: no representa dinero real ni una recomendación.',
    ],
    limits: [
      'Cada ronda solo tiene dos resultados posibles y las reglas no cambian: no modela precios, comisiones, impuestos ni decisiones que se adaptan.',
      `El nivel de ruina (${ruinLevel} del capital inicial) es una convención del laboratorio, no un umbral real.`,
      'No es una recomendación financiera, de inversión ni de apuestas, ni una regla para elegir cuánto arriesgar.',
    ],
  },
  use: {
    title: 'Ver el riesgo que depende del camino',
    situation:
      'Un juego con resultado medio favorable se repite muchas veces y en cada ronda se arriesga una parte de lo acumulado.',
    insight:
      'Te ayuda a ver que una ventaja media positiva no garantiza el crecimiento típico: si se expone demasiado, las ' +
      'pérdidas pesan más al multiplicarse y las caídas grandes son habituales.',
    limit:
      'Usa unidades hipotéticas y un juego simplificado. No dice cuánto invertir ni apostar, ni describe ningún producto ' +
      'financiero real.',
  },
};
