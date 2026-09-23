import { createContext, useContext } from 'react';

export type FormLayout = 'vertical' | 'horizontal';
export type FormLabelWidth = 'sm' | 'md' | 'lg';

export interface FormGridContextValue {
  layout?: FormLayout;
  labelWidth?: FormLabelWidth;
}

export const FormGridContext = createContext<FormGridContextValue>({});

/**
 * Access the enclosing FormGrid's layout orientation and label width configuration.
 */
export function useFormGridContext(): FormGridContextValue {
  return useContext(FormGridContext);
}
