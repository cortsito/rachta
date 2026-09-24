/**
 * Método and Usos content for the Streaks lab. Formulas and steps describe
 * model.ts (exactLosingStreakProbability, simulateStreaks); keep them in sync.
 */
import type { LabGuide } from '../../app/labs.ts';

export const streaksGuide: LabGuide = {
  method: {
    question:
      'Si aciertas cada intento con probabilidad p, ¿con qué frecuencia aparece, dentro de n intentos, una racha de al ' +
      'menos k fallos seguidos? La intuición suele subestimarla cuando p supera el 50 %.',
    model:
      'Cada futuro es una serie de n intentos independientes: acierto con probabilidad p y fallo con probabilidad ' +
      'q = 1 − p. Lo que se mide en cada futuro es su peor racha: el mayor número de fallos consecutivos.',
    variables: [
      { term: 'p', meaning: 'Probabilidad de acertar cada intento.' },
      { term: 'n', meaning: 'Intentos por futuro.' },
      { term: 'k', meaning: 'Racha de fallos que te preocupa (nunca mayor que n).' },
      { term: 'N', meaning: 'Futuros simulados.' },
    ],
    formulas: [
      'Estado j = fallos seguidos en curso (0 … k − 1), más un estado «alcanzada»',
      'Acierto, con probabilidad p: j → 0',
      'Fallo, con probabilidad q = 1 − p: j → j + 1; desde j = k − 1 pasa a «alcanzada», que es absorbente',
      'P(peor racha ≥ k) = probabilidad de estar en «alcanzada» tras n intentos',
    ],
    procedure: [
      'La semilla inicializa el generador pseudoaleatorio.',
      'En cada uno de los N futuros se sortean n intentos: es acierto si un número uniforme en [0, 1) es menor que p.',
      'Se anota la peor racha de fallos de cada futuro y se cuentan los futuros en los que es de k o más.',
      'El primer futuro sorteado es el que se muestra intento a intento.',
    ],
    exact: [
      'La probabilidad de que la peor racha sea de k o más fallos, con la cadena de Markov de arriba (coste proporcional a n·k).',
    ],
    estimated: [
      'La proporción de futuros con una racha de k o más fallos, con su intervalo de confianza del 95 %.',
      'La mediana de la peor racha y su distribución (el histograma).',
    ],
    sample: ['La peor racha del futuro mostrado: es un solo futuro, no una estimación.'],
    assumptions: [
      'Los intentos son independientes y todos tienen la misma probabilidad de acierto.',
      'Una racha de fallos es una serie de fallos consecutivos dentro del mismo futuro; cada futuro empieza de cero.',
      'La probabilidad exacta se obtiene con una cadena de Markov sobre la longitud de la racha actual de fallos.',
      'Es un modelo educativo: no representa dinero, apuestas ni decisiones reales.',
    ],
    limits: [
      'Supone que p es conocida y constante. No sirve para decidir si una racha real fue mala suerte o señal de que algo cambió.',
      'Si los intentos no son independientes (cansancio, condiciones que cambian), la frecuencia real de las rachas puede ser muy distinta.',
      'No predice cuándo llegará la próxima racha: describe con qué frecuencia aparece entre muchos futuros posibles.',
    ],
  },
  use: {
    title: 'Separar una racha de la evidencia',
    situation:
      'Una serie de resultados adversos (partidas perdidas, tiros fallados, días sin ventas) se lee a menudo como señal ' +
      'de que algo va mal.',
    insight:
      'Te ayuda a ver cuántos fallos seguidos son esperables por puro azar con una tasa de acierto dada, antes de buscar ' +
      'una causa.',
    limit:
      'Solo compara con un modelo de intentos independientes y probabilidad fija. No demuestra que no haya un cambio ' +
      'real: una racha frecuente por azar también puede tener una causa.',
  },
};
