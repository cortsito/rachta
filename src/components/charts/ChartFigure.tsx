import { useId, type ReactNode } from 'react';
import { Disclosure } from '../ui/Disclosure.tsx';

export interface DataTableProps {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
}

export function DataTable({ caption, columns, rows }: DataTableProps) {
  return (
    <div className="data-table">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Spread onto the chart's <svg role="img">. */
export interface ChartLabelling {
  'aria-labelledby': string;
  'aria-describedby': string;
}

export interface ChartFigureProps {
  title: string;
  /**
   * Text alternative that states what the chart shows *for these results*
   * (not a generic description). Visible to everyone.
   */
  description: string;
  /** Renders the chart (an SVG primitive) and any HTML legend. */
  children: (labelling: ChartLabelling) => ReactNode;
  /** Optional data fallback, collapsed by default. */
  table?: DataTableProps;
  /** Summary text of the data disclosure. */
  tableSummary?: string;
}

/**
 * Figure wrapper for every data graphic: visible title, a results-specific
 * text description, the graphic, and an optional data table.
 */
export function ChartFigure({
  title,
  description,
  children,
  table,
  tableSummary = 'Ver los datos en una tabla',
}: ChartFigureProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span className="chart__title" id={titleId}>
          {title}
        </span>
        <span className="chart__description" id={descriptionId}>
          {description}
        </span>
      </figcaption>
      {children({ 'aria-labelledby': titleId, 'aria-describedby': descriptionId })}
      {table && (
        <Disclosure summary={tableSummary}>
          <DataTable {...table} />
        </Disclosure>
      )}
    </figure>
  );
}
