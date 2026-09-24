/**
 * Método and Usos content for the Bayes lab. Formulas and steps describe
 * model.ts (bayesExact, expectedCounts, simulatePopulation); keep them in sync.
 */
import type { LabGuide } from '../../app/labs.ts';

export const bayesGuide: LabGuide = {
  method: {
    question:
      'Si una prueba da positivo, ¿qué probabilidad hay de que la condición esté presente? La intuición suele ' +
      'confundirla con la sensibilidad de la prueba y olvidar lo frecuente que es la condición.',
    model:
      'Cada persona tiene la condición con probabilidad p. Si la tiene, la prueba da positivo con probabilidad s; si no ' +
      'la tiene, da negativo con probabilidad e. Eso reparte a la población en cuatro grupos: verdaderos y falsos ' +
      'positivos, y verdaderos y falsos negativos.',
    variables: [
      { term: 'p', meaning: 'Prevalencia: proporción de la población con la condición.' },
      { term: 's', meaning: 'Sensibilidad: probabilidad de dar positivo si se tiene la condición.' },
      { term: 'e', meaning: 'Especificidad: probabilidad de dar negativo si no se tiene.' },
      { term: 'N', meaning: 'Personas de la población simulada.' },
    ],
    formulas: [
      'P(positivo) = p·s + (1 − p)·(1 − e)',
      'VPP = P(condición | positivo) = p·s / (p·s + (1 − p)·(1 − e))',
      'VPN = P(sin condición | negativo) = (1 − p)·e / ((1 − p)·e + p·(1 − s))',
      'Frecuencias esperadas: N·p·s, N·(1 − p)·(1 − e), N·p·(1 − s) y N·(1 − p)·e, redondeadas a personas enteras',
    ],
    procedure: [
      'La semilla inicializa el generador pseudoaleatorio.',
      'Para cada una de las N personas se sortea primero si tiene la condición y después el resultado de la prueba según ' +
        'la sensibilidad o la especificidad.',
      'Se cuentan las cuatro casillas de la tabla 2×2. El VPP simulado es la proporción de verdaderos positivos entre ' +
        'todos los positivos simulados.',
    ],
    exact: [
      'El VPP y el VPN, con la regla de Bayes. No están definidos cuando nadie puede dar positivo (o negativo).',
      'La proporción de la población que da positivo.',
      'La columna «Esperado» de la tabla: las frecuencias esperadas, redondeadas por el método del mayor resto para ' +
        'que sumen exactamente N. La cuadrícula de 1000 personas usa el mismo reparto y es ilustrativa.',
    ],
    estimated: [
      'La columna «Simulado» de la tabla, de una sola población de N personas.',
      'El VPP simulado, con su intervalo de confianza del 95 % sobre los positivos simulados. No está definido si nadie da positivo.',
    ],
    assumptions: [
      'La condición y el resultado de cada persona se sortean de forma independiente del resto.',
      'La sensibilidad y la especificidad son fijas: no varían entre personas ni con la prevalencia.',
      'La población simulada es ilustrativa; los valores exactos no dependen de su tamaño.',
      'Es una herramienta educativa: no ofrece un diagnóstico ni sustituye una decisión médica.',
    ],
    limits: [
      'La prevalencia que importa depende de a quién se hace la prueba y por qué; un valor poblacional no describe a una persona concreta.',
      'La sensibilidad y la especificidad reales tienen incertidumbre y cambian entre poblaciones; aquí son valores fijos.',
      'Solo hay resultados positivos o negativos: no contempla pruebas repetidas ni resultados dudosos.',
    ],
  },
  use: {
    title: 'Leer un positivo con la tasa base',
    situation:
      'Una prueba de cribado, un filtro de correo no deseado o una alerta de fraude marca un caso como positivo y hay ' +
      'que decidir cuánto pesa ese resultado.',
    insight:
      'Te ayuda a ver que, cuando la condición es rara, incluso una prueba buena puede dar más falsos positivos que ' +
      'verdaderos.',
    limit:
      'Es un ejercicio de razonamiento con valores que tú eliges. No interpreta un resultado médico real ni sustituye a ' +
      'un profesional.',
  },
};
