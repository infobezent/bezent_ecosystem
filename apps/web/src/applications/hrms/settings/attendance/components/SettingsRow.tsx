import type { ReactNode } from 'react';
import { Grid, Inline } from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';

export interface SettingsRowProps {
  label: ReactNode;
  icon?: string;
  info?: string;
  tooltip?: string;
  children?: ReactNode;
  control?: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'start';
}

/**
 * Standard two-column SettingsRow for clean, minimal configuration layouts.
 * Left: Icon + Label + Info Tooltip
 * Right: Interactive Form Control
 * Responsive: Automatically stacks on narrow screens via Design System Grid.
 */
export function SettingsRow({
  label,
  icon,
  info,
  tooltip,
  children,
  control,
  description,
  align = 'center',
}: SettingsRowProps) {
  const tooltipText = tooltip || info;
  const content = control ?? children;

  return (
    <Grid columns={2} gap="md">
      <div>
        <Inline gap="xs" align={align}>
          {icon && <BezentIcon name={icon} size={16} />}
          <span className="bezent-label">{label}</span>
          {tooltipText && (
            <span
              title={tooltipText}
              tabIndex={0}
              aria-label={typeof tooltipText === 'string' ? tooltipText : undefined}
              className="bezent-text-secondary"
            >
              <BezentIcon name="help" size={14} />
            </span>
          )}
        </Inline>
        {description && (
          <div className="bezent-text-hint">{description}</div>
        )}
      </div>
      <div>{content}</div>
    </Grid>
  );
}

export default SettingsRow;
