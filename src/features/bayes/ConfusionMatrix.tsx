import { formatInteger } from '../../lib/format.ts';
import type { Confusion } from './model.ts';

export interface ConfusionMatrixProps {
  expected: Confusion;
  simulated: Confusion;
  population: number;
}

/**
 * Real 2×2 table: rows are the condition, columns are the test result. Each
 * cell shows both the exact natural-frequency count and the simulated count,
 * so the two never merge into a single number.
 */
export function ConfusionMatrix({ expected, simulated, population }: ConfusionMatrixProps) {
  return (
    <div className="confusion-matrix">
      <table>
        <caption>{`Cómo se reparten ${formatInteger(population)} personas simuladas según la condición y el resultado de la prueba`}</caption>
        <thead>
          <tr>
            <th rowSpan={2}></th>
            <th scope="colgroup" colSpan={2}>
              Positivo
            </th>
            <th scope="colgroup" colSpan={2}>
              Negativo
            </th>
          </tr>
          <tr>
            <th scope="col">Esperado</th>
            <th scope="col">Simulado</th>
            <th scope="col">Esperado</th>
            <th scope="col">Simulado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Tiene la condición</th>
            <td>{formatInteger(expected.truePositive)}</td>
            <td>{formatInteger(simulated.truePositive)}</td>
            <td>{formatInteger(expected.falseNegative)}</td>
            <td>{formatInteger(simulated.falseNegative)}</td>
          </tr>
          <tr>
            <th scope="row">No la tiene</th>
            <td>{formatInteger(expected.falsePositive)}</td>
            <td>{formatInteger(simulated.falsePositive)}</td>
            <td>{formatInteger(expected.trueNegative)}</td>
            <td>{formatInteger(simulated.trueNegative)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
