/**
 * Método and Usos content for the compound-loss lab. Formulas and steps
 * describe model.ts (compoundLossExact, simulateCompoundLoss) and histogram.ts.
 */
import type { LabGuide } from '../../app/labs.ts';

export const compoundLossGuide: LabGuide = {
  method: {
    question:
      'Cuando las pérdidas llegan como eventos raros y de tamaño muy variable, ¿por qué la pérdida media describe mal ' +
      'un periodo típico?',
    model:
      'En cada periodo ocurre un número aleatorio de eventos K. Cada evento causa una pérdida X, positiva y muy ' +
      'variable. La pérdida del periodo, S, es la suma de las pérdidas de sus eventos, y vale 0 si no hay ninguno.',
    variables: [
      { term: 'λ', meaning: 'Eventos esperados por periodo (media de K).' },
      { term: 'm', meaning: 'Severidad típica: la pérdida mediana de un evento.' },
      { term: 'σ', meaning: 'Dispersión: desviación típica de ln X.' },
      { term: 'u', meaning: 'Umbral de pérdida total que se quiere superar.' },
      { term: 'N', meaning: 'Periodos simulados.' },
    ],
    formulas: [
      'K ~ Poisson(λ)',
      'X ~ Lognormal(μ = ln m, σ), independiente para cada evento y de K',
      'S = suma de las K pérdidas del periodo (S = 0 si K = 0)',
      'Pérdida media por evento: E[X] = m·exp(σ²/2), mayor que la mediana m',
      'Pérdida media por periodo: E[S] = λ·m·exp(σ²/2)',
      'Periodo sin eventos: P(S = 0) = exp(−λ)',
    ],
    procedure: [
      'La semilla inicializa el generador pseudoaleatorio.',
      'En cada uno de los N periodos se sortea K (método de Knuth si λ < 10 y PTRS de Hörmann si λ ≥ 10) y después ' +
        'K pérdidas lognormales (con Box–Muller).',
      'Se suman las pérdidas de cada periodo y se ordenan los N totales.',
      'Media, mediana y percentil 90 salen de esos totales. Superar el umbral significa una pérdida estrictamente mayor que u.',
      'El histograma llega hasta el mayor valor entre el percentil 99 y el umbral; los periodos por encima se cuentan aparte.',
    ],
    exact: ['La pérdida media por periodo, E[S].', 'La probabilidad de un periodo sin eventos, P(S = 0).'],
    estimated: [
      'La proporción de periodos que pierden menos que la media exacta.',
      'La pérdida media simulada, la mediana y el percentil 90.',
      'La probabilidad de superar el umbral, con su intervalo de confianza del 95 %.',
    ],
    assumptions: [
      'El número de eventos por periodo sigue una distribución de Poisson con la media elegida.',
      'La severidad de cada evento es lognormal, con mediana igual a la severidad típica elegida y σ igual a la dispersión.',
      'Los eventos son independientes entre sí y del número de eventos del periodo.',
      'Cada futuro simulado representa un único periodo.',
    ],
    limits: [
      'La frecuencia, la severidad y la dispersión reales casi nunca se conocen con precisión, y pequeños cambios en σ alteran mucho la cola.',
      'Las pérdidas reales pueden tener colas aún más pesadas que una lognormal: los percentiles altos dependen mucho del modelo.',
      'No es una tarificación de seguros ni una recomendación sobre cuánto reservar o asegurar.',
    ],
  },
  use: {
    title: 'Entender pérdidas raras que se acumulan',
    situation:
      'Incidencias, averías o reclamaciones llegan de forma irregular, algunas cuestan mucho más que la típica y el ' +
      'presupuesto se hace con la media.',
    insight:
      'Te ayuda a ver que la mayoría de los periodos pierde menos que la media, mientras unos pocos periodos malos la ' +
      'elevan: por eso conviene mirar percentiles y no solo el promedio.',
    limit:
      'Es un modelo de Poisson y lognormal con parámetros elegidos a mano. No estima riesgos reales ni sustituye un ' +
      'análisis actuarial o profesional.',
  },
};
