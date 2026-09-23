import { useMemo, type HTMLAttributes, type ReactNode } from 'react';
import {
  FormGridContext,
  useFormGridContext,
  type FormLayout,
  type FormLabelWidth,
} from './FormGridContext';
import './FormGrid.css';

export interface FormGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  columns?: 1 | 2 | 3;
  gap?: 'sm' | 'md' | 'lg';
  /** Form layout orientation — 'vertical' (default) or 'horizontal' */
  layout?: FormLayout;
  /** Semantic label column width for child horizontal fields — 'sm' (140px), 'md' (180px), 'lg' (220px) */
  labelWidth?: FormLabelWidth;
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT FormGrid primitive.
 * Automatically aligns form inputs in 1, 2, or 3 columns with responsive stacking on tablet/mobile.
 * In 'horizontal' layout, provides synchronized cross-row label column alignment.
 */
export function FormGrid({
  columns = 2,
  gap = 'md',
  layout = 'vertical',
  labelWidth = 'md',
  className,
  children,
  ...rest
}: FormGridProps) {
  const isHorizontal = layout === 'horizontal';

  const classes = [
    'bezent-form-grid',
    `bezent-form-grid--cols-${columns}`,
    `bezent-form-grid--gap-${gap}`,
    isHorizontal ? 'bezent-form-grid--layout-horizontal' : '',
    isHorizontal ? `bezent-form-grid--label-width-${labelWidth}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contextValue = useMemo(() => ({ layout, labelWidth }), [layout, labelWidth]);

  return (
    <FormGridContext.Provider value={contextValue}>
      <div className={classes} {...rest}>
        {children}
      </div>
    </FormGridContext.Provider>
  );
}

export interface FieldGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  label?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  helperText?: ReactNode;
  error?: ReactNode;
  /** Explicit layout orientation override — defaults to enclosing FormGrid layout or 'vertical' */
  orientation?: FormLayout;
  /** Semantic label width override — defaults to enclosing FormGrid labelWidth or 'md' */
  labelWidth?: FormLabelWidth;
  /** Column span within a FormGrid (e.g. span={2} for full width in 2-column grid) */
  span?: 1 | 2 | 'full';
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT FieldGroup primitive.
 * Consistent layout for label, required indicator, input control, and helper/error feedback.
 */
export function FieldGroup({
  label,
  required,
  htmlFor,
  helperText,
  error,
  orientation,
  labelWidth,
  span,
  className,
  children,
  ...rest
}: FieldGroupProps) {
  const gridContext = useFormGridContext();
  const effectiveOrientation = orientation ?? gridContext.layout ?? 'vertical';
  const effectiveLabelWidth = labelWidth ?? gridContext.labelWidth ?? 'md';
  const isHorizontal = effectiveOrientation === 'horizontal';

  const classes = [
    'bezent-field-group',
    `bezent-field-group--${effectiveOrientation}`,
    isHorizontal ? `bezent-field-group--label-width-${effectiveLabelWidth}` : '',
    span
      ? span === 'full'
        ? 'bezent-field-group--span-full'
        : `bezent-field-group--span-${span}`
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {label && (
        <label htmlFor={htmlFor} className="bezent-field-group__label">
          {label}
          {required && (
            <span className="bezent-field-group__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <div className="bezent-field-group__error" role="alert">
          {error}
        </div>
      ) : helperText ? (
        <div className="bezent-field-group__helper">{helperText}</div>
      ) : null}
    </div>
  );
}

export * from './FormGridContext';
export default FormGrid;
