import {
  Badge,
  Button,
  Grid,
  PageHeader,
  Section,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeRecord } from '../api/employeesApi';
import {
  EMPLOYMENT_STATUS_LABELS,
  employmentStatusVariant,
  employmentTypeLabel,
  formatDate,
} from '../model/employeeModel';
import { DetailItem } from './DetailItem';

export interface EmployeeProfileViewProps {
  employee: EmployeeRecord;
  onBack: () => void;
  onOpenEmployee: (employeeId: string) => void;
}

/** Canonical, read-only Employee Profile. Shows only fields of the canonical Employee model. */
export function EmployeeProfileView({
  employee,
  onBack,
  onOpenEmployee,
}: EmployeeProfileViewProps) {
  const subtitle = [employee.employeeNumber, employee.designationName].filter(Boolean).join(' · ');

  return (
    <Stack gap="lg">
      <PageHeader
        breadcrumbs={
          <Button
            variant="text"
            size="sm"
            leftIcon={<BezentIcon name="arrowLeft" size={14} />}
            onClick={onBack}
          >
            Employees
          </Button>
        }
        title={employee.fullName}
        subtitle={subtitle}
        badge={
          <Badge variant={employmentStatusVariant(employee.employmentStatus)} size="sm">
            {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
          </Badge>
        }
      />

      <Section title="Overview">
        <Grid columns={3} gap="md">
          <DetailItem label="Employee ID">{employee.employeeNumber}</DetailItem>
          <DetailItem label="Department">{employee.departmentName ?? 'Not set'}</DetailItem>
          <DetailItem label="Designation">{employee.designationName ?? 'Not set'}</DetailItem>
          <DetailItem label="Location">{employee.locationName ?? 'Not set'}</DetailItem>
          <DetailItem label="Reporting Manager">
            {employee.reportingManagerId && employee.reportingManagerName ? (
              <Button
                variant="text"
                size="sm"
                onClick={() => onOpenEmployee(employee.reportingManagerId!)}
              >
                {employee.reportingManagerName}
              </Button>
            ) : (
              'Not assigned'
            )}
          </DetailItem>
          <DetailItem label="Employment Type">
            {employmentTypeLabel(employee.employmentType)}
          </DetailItem>
          <DetailItem label="Joining Date">{formatDate(employee.joiningDate)}</DetailItem>
          <DetailItem label="Probation End Date">
            {employee.probationEndDate ? formatDate(employee.probationEndDate) : 'Not set'}
          </DetailItem>
          {employee.confirmationDate && (
            <DetailItem label="Confirmation Date">
              {formatDate(employee.confirmationDate)}
            </DetailItem>
          )}
          {employee.lastWorkingDate && (
            <DetailItem label="Last Working Date">
              {formatDate(employee.lastWorkingDate)}
            </DetailItem>
          )}
        </Grid>
      </Section>

      <Section title="Contact">
        <Grid columns={3} gap="md">
          <DetailItem label="Email">{employee.email}</DetailItem>
          {employee.phone && <DetailItem label="Phone">{employee.phone}</DetailItem>}
        </Grid>
      </Section>
    </Stack>
  );
}
