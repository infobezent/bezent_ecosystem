import type {
  TableHTMLAttributes,
  HTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
  ReactNode,
} from 'react';
import './Table.css';

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  hoverable?: boolean;
  striped?: boolean;
  compact?: boolean;
  children: ReactNode;
}

export function Table({
  hoverable = true,
  striped = false,
  compact = false,
  className,
  children,
  ...rest
}: TableProps) {
  return (
    <div className="bezent-table-container">
      <table
        className={`bezent-table ${hoverable ? 'is-hoverable' : ''} ${striped ? 'is-striped' : ''} ${compact ? 'is-compact' : ''} ${className || ''}`.trim()}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bezent-table__head ${className || ''}`.trim()} {...rest}>
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`bezent-table__body ${className || ''}`.trim()} {...rest}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`bezent-table__row ${className || ''}`.trim()} {...rest}>
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  className,
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`bezent-table__th ${className || ''}`.trim()} {...rest}>
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`bezent-table__td ${className || ''}`.trim()} {...rest}>
      {children}
    </td>
  );
}

export default Table;
