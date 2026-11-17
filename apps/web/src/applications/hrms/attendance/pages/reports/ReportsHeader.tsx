import React from 'react';
import { PageHeader } from '../../../../../design-system/components';

export interface ReportsHeaderProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export function ReportsHeader({
  eyebrow = 'Attendance › Reports',
  title = 'Reports',
  subtitle = 'Generate attendance reports and export them for payroll, audit and review.',
}: ReportsHeaderProps) {
  return <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />;
}
